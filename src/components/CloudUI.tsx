import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ChevronDown, Plus, LogOut, UserPlus, X, Copy, Trash2, Check, LayoutGrid,
} from 'lucide-react';
import { CLOUD } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useBoardStore } from '../store';
import {
  listBoards, createBoard, inviteMember, listInvites, revokeInvite,
  getWorkspaceMembers, type BoardSummary, type InviteRow,
} from '../lib/cloud';
import type { Member } from '../types';

// ── Board switcher ────────────────────────────────────────────────────────────
export function BoardSwitcher() {
  const { board, cloudWorkspaceId, cloudBoardId, selectCloudBoard } = useBoardStore();
  const [open, setOpen] = useState(false);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [creating, setCreating] = useState(false);

  async function refresh() {
    if (!cloudWorkspaceId) return;
    setBoards(await listBoards(cloudWorkspaceId));
  }

  useEffect(() => { refresh(); }, [cloudWorkspaceId, cloudBoardId]);

  async function handleCreate() {
    if (!cloudWorkspaceId) return;
    setCreating(true);
    try {
      const id = await createBoard(cloudWorkspaceId, 'Untitled Board');
      await refresh();
      selectCloudBoard(id);
      setOpen(false);
    } catch {
      toast.error('Could not create board (need editor access)');
    } finally {
      setCreating(false);
    }
  }

  if (!CLOUD) return null;

  return (
    <div className="relative flex-shrink-0">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
        style={{ background: 'var(--bg-input)', color: 'var(--text-2)' }}>
        <LayoutGrid size={13} />
        <span className="hidden sm:inline max-w-[120px] truncate">{board.title}</span>
        <ChevronDown size={13} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-60 rounded-xl shadow-2xl z-50 p-1.5 animate-slide-up"
            style={{ background: 'var(--bg-menu)', border: '1px solid var(--border-medium)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1.5" style={{ color: 'var(--text-4)' }}>Boards</p>
            <div className="max-h-64 overflow-y-auto">
              {boards.map(b => (
                <button key={b.id} onClick={() => { selectCloudBoard(b.id); setOpen(false); }}
                  className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-colors"
                  style={{ background: b.id === cloudBoardId ? 'var(--accent-bg)' : 'transparent', color: 'var(--text-1)' }}>
                  <span className="truncate">{b.title}</span>
                  {b.id === cloudBoardId && <Check size={14} style={{ color: 'var(--accent)' }} />}
                </button>
              ))}
            </div>
            <div className="h-px my-1.5" style={{ background: 'var(--border-subtle)' }} />
            <button onClick={handleCreate} disabled={creating}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors hover:opacity-80"
              style={{ color: 'var(--accent)' }}>
              <Plus size={14} /> New board
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── User menu (avatar + invite + sign out) ────────────────────────────────────
export function CloudMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  if (!CLOUD || !user) return null;

  const name = (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'User';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <>
      <div className="relative flex-shrink-0">
        <button onClick={() => setOpen(o => !o)}
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
          style={{ background: 'var(--accent)' }}>
          {initials}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute top-full right-0 mt-2 w-56 rounded-xl shadow-2xl z-50 p-1.5 animate-slide-up"
              style={{ background: 'var(--bg-menu)', border: '1px solid var(--border-medium)' }}>
              <div className="px-2 py-2">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{user.email}</p>
              </div>
              <div className="h-px my-1" style={{ background: 'var(--border-subtle)' }} />
              <button onClick={() => { setShowInvite(true); setOpen(false); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors hover:opacity-80"
                style={{ color: 'var(--text-1)' }}>
                <UserPlus size={14} /> Invite teammates
              </button>
              <button onClick={() => signOut()}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors hover:opacity-80"
                style={{ color: '#ef4444' }}>
                <LogOut size={14} /> Sign out
              </button>
            </div>
          </>
        )}
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </>
  );
}

// ── Invite modal ──────────────────────────────────────────────────────────────
function InviteModal({ onClose }: { onClose: () => void }) {
  const { cloudWorkspaceId } = useBoardStore();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!cloudWorkspaceId) return;
    setInvites(await listInvites(cloudWorkspaceId));
    setMembers(await getWorkspaceMembers(cloudWorkspaceId));
  }
  useEffect(() => { refresh(); }, [cloudWorkspaceId]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!cloudWorkspaceId || !email.trim()) return;
    setBusy(true);
    try {
      await inviteMember(cloudWorkspaceId, email.trim(), role);
      setEmail('');
      await refresh();
      toast.success('Invite created — they join automatically when they sign in with that email');
    } catch {
      toast.error('Could not invite (need owner/editor access)');
    } finally {
      setBusy(false);
    }
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${window.location.origin}/?invite=${token}`);
    toast.success('Invite link copied');
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6" onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-modal)', border: '1px solid var(--border-medium)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Invite teammates</h2>
          <button onClick={onClose} style={{ color: 'var(--text-3)' }}><X size={18} /></button>
        </div>

        <form onSubmit={handleInvite} className="flex gap-2 mb-4">
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="teammate@email.com"
            className="flex-1 h-10 px-3 rounded-lg text-sm outline-none"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-1)' }} />
          <select value={role} onChange={e => setRole(e.target.value)}
            className="h-10 px-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-1)' }}>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button type="submit" disabled={busy}
            className="h-10 px-4 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: 'var(--accent)' }}>Invite</button>
        </form>

        {members.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-4)' }}>Members</p>
            <div className="space-y-1.5">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ background: m.color }}>{m.initials}</span>
                  <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-1)' }}>{m.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ background: 'var(--bg-input)', color: 'var(--text-3)' }}>{m.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {invites.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-4)' }}>Pending invites</p>
            <div className="space-y-1.5">
              {invites.map(inv => (
                <div key={inv.id} className="flex items-center gap-2">
                  <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-2)' }}>{inv.email}</span>
                  <button onClick={() => copyLink(inv.token)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-3)' }} title="Copy invite link"><Copy size={13} /></button>
                  <button onClick={async () => { await revokeInvite(inv.id); refresh(); }} className="p-1.5 rounded-lg" style={{ color: '#ef4444' }} title="Revoke"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
