import { db, supabase } from './supabase';
import type { Board, Member, Label } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkspaceSummary {
  id: string;
  name: string;
  role: string;
}

export interface BoardSummary {
  id: string;
  workspace_id: string;
  title: string;
  description: string;
  updated_at: string;
}

export interface InviteRow {
  id: string;
  email: string;
  role: string;
  token: string;
  accepted: boolean;
  workspace_id: string;
}

// Board content actually stored in boards.data (members/currentUserId are derived).
type BoardData = Omit<Board, 'members' | 'currentUserId'>;

const DEFAULT_LABELS: Label[] = [
  { id: 'l1', name: 'Bug', color: '#ef4444' },
  { id: 'l2', name: 'Feature', color: '#3b82f6' },
  { id: 'l3', name: 'Design', color: '#8b5cf6' },
  { id: 'l4', name: 'Docs', color: '#10b981' },
  { id: 'l5', name: 'Research', color: '#f59e0b' },
  { id: 'l6', name: 'DevOps', color: '#06b6d4' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function initialsOf(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
}

const MEMBER_COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f97316', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

export function freshBoardData(title = 'My Board'): BoardData {
  return {
    id: '',
    title,
    description: 'A fresh board — add your columns and cards',
    columns: [
      { id: 'col1', title: 'Backlog', cardIds: [], wipLimit: null, color: '#64748b', order: 0 },
      { id: 'col2', title: 'In Progress', cardIds: [], wipLimit: 3, color: '#3b82f6', order: 1 },
      { id: 'col3', title: 'Review', cardIds: [], wipLimit: 2, color: '#f59e0b', order: 2 },
      { id: 'col4', title: 'Done', cardIds: [], wipLimit: null, color: '#22c55e', order: 3 },
    ],
    cards: {},
    labels: DEFAULT_LABELS,
    createdAt: Date.now(),
  };
}

// Strip the derived fields before persisting.
function toData(board: Board): BoardData {
  const { members: _m, currentUserId: _c, ...data } = board;
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile + workspace members
// ─────────────────────────────────────────────────────────────────────────────

export async function getWorkspaceMembers(workspaceId: string): Promise<Member[]> {
  const { data: rows } = await db()
    .from('workspace_members')
    .select('user_id, role, profiles ( display_name, email, avatar_color )')
    .eq('workspace_id', workspaceId);

  return (rows ?? []).map((r: any, i: number) => {
    const name = r.profiles?.display_name || r.profiles?.email?.split('@')[0] || 'User';
    return {
      id: r.user_id,
      name,
      initials: initialsOf(name),
      color: r.profiles?.avatar_color || MEMBER_COLORS[i % MEMBER_COLORS.length],
      role: r.role,
    } as Member;
  });
}

export async function updateProfile(displayName: string, color?: string) {
  const { data: auth } = await db().auth.getUser();
  if (!auth.user) return;
  await db().from('profiles').upsert({
    id: auth.user.id,
    email: auth.user.email,
    display_name: displayName,
    ...(color ? { avatar_color: color } : {}),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap: make sure the signed-in user has a workspace + at least one board
// ─────────────────────────────────────────────────────────────────────────────

export async function listWorkspaces(): Promise<WorkspaceSummary[]> {
  const { data: auth } = await db().auth.getUser();
  if (!auth.user) return [];
  const { data } = await db()
    .from('workspace_members')
    .select('role, workspaces ( id, name )')
    .eq('user_id', auth.user.id);
  return (data ?? []).map((r: any) => ({ id: r.workspaces.id, name: r.workspaces.name, role: r.role }));
}

export async function listBoards(workspaceId: string): Promise<BoardSummary[]> {
  const { data } = await db()
    .from('boards')
    .select('id, workspace_id, title, description, updated_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });
  return data ?? [];
}

export async function createWorkspace(name: string): Promise<string> {
  const { data: auth } = await db().auth.getUser();
  if (!auth.user) throw new Error('Not signed in');
  const { data, error } = await db()
    .from('workspaces')
    .insert({ name, owner_id: auth.user.id })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function createBoard(workspaceId: string, title = 'My Board', data?: BoardData): Promise<string> {
  const { data: auth } = await db().auth.getUser();
  const content = data ?? freshBoardData(title);
  const { data: row, error } = await db()
    .from('boards')
    .insert({
      workspace_id: workspaceId,
      title,
      description: content.description,
      data: content,
      updated_by: auth.user?.id,
    })
    .select('id')
    .single();
  if (error) throw error;
  return row.id;
}

export async function renameBoard(boardId: string, title: string) {
  await db().from('boards').update({ title }).eq('id', boardId);
}

export async function deleteBoard(boardId: string) {
  await db().from('boards').delete().eq('id', boardId);
}

// Ensures the user can land on *a* board the moment they sign in. Accepts any
// pending invite for their email first, then falls back to creating a personal
// workspace + starter board if they have none.
export async function bootstrap(): Promise<{ workspaceId: string; boardId: string }> {
  await acceptPendingInvites();

  let workspaces = await listWorkspaces();
  if (workspaces.length === 0) {
    const { data: auth } = await db().auth.getUser();
    const wsName = (auth.user?.user_metadata?.full_name || auth.user?.email?.split('@')[0] || 'My') + "'s Workspace";
    const wsId = await createWorkspace(wsName);
    workspaces = [{ id: wsId, name: wsName, role: 'owner' }];
  }

  const ws = workspaces[0];
  const boards = await listBoards(ws.id);
  if (boards.length === 0) {
    const boardId = await createBoard(ws.id, 'Product Roadmap');
    return { workspaceId: ws.id, boardId };
  }
  return { workspaceId: ws.id, boardId: boards[0].id };
}

// ─────────────────────────────────────────────────────────────────────────────
// Load / save a board document
// ─────────────────────────────────────────────────────────────────────────────

export async function loadBoard(boardId: string): Promise<{ board: Board; workspaceId: string } | null> {
  const { data: auth } = await db().auth.getUser();
  const { data: row, error } = await db()
    .from('boards')
    .select('id, workspace_id, data')
    .eq('id', boardId)
    .single();
  if (error || !row) return null;

  const members = await getWorkspaceMembers(row.workspace_id);
  const content = row.data as BoardData;
  const board: Board = {
    ...content,
    id: row.id,
    members,
    currentUserId: auth.user?.id ?? '',
  };
  return { board, workspaceId: row.workspace_id };
}

// Echo suppression: remember the JSON we last wrote per board so realtime events
// that are just our own write coming back can be ignored.
const lastSignature = new Map<string, string>();
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

export async function saveBoardNow(boardId: string, board: Board) {
  const data = toData(board);
  const sig = JSON.stringify(data);
  lastSignature.set(boardId, sig);
  const { data: auth } = await db().auth.getUser();
  await db().from('boards')
    .update({ data, title: board.title, description: board.description, updated_by: auth.user?.id })
    .eq('id', boardId);
}

export function saveBoardDebounced(boardId: string, board: Board, ms = 450) {
  const existing = debounceTimers.get(boardId);
  if (existing) clearTimeout(existing);
  debounceTimers.set(boardId, setTimeout(() => {
    debounceTimers.delete(boardId);
    saveBoardNow(boardId, board).catch(err => console.error('[cloud] save failed', err.message));
  }, ms));
}

// Subscribe to remote board changes. onRemote is called with the freshly loaded
// Board whenever another client writes (our own echoes are filtered out).
export function subscribeBoard(boardId: string, onRemote: (board: Board) => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`board:${boardId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'boards', filter: `id=eq.${boardId}` },
      async (payload) => {
        const incoming = JSON.stringify((payload.new as any).data);
        if (incoming === lastSignature.get(boardId)) return; // our own write echoed back
        lastSignature.set(boardId, incoming);
        const loaded = await loadBoard(boardId);
        if (loaded) onRemote(loaded.board);
      }
    )
    .subscribe();

  return () => { client.removeChannel(channel); };
}

// ─────────────────────────────────────────────────────────────────────────────
// Invites
// ─────────────────────────────────────────────────────────────────────────────

export async function inviteMember(workspaceId: string, email: string, role = 'editor'): Promise<InviteRow> {
  const { data: auth } = await db().auth.getUser();
  const { data, error } = await db()
    .from('invites')
    .insert({ workspace_id: workspaceId, email: email.toLowerCase(), role, invited_by: auth.user?.id })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function listInvites(workspaceId: string): Promise<InviteRow[]> {
  const { data } = await db()
    .from('invites')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('accepted', false);
  return data ?? [];
}

export async function revokeInvite(inviteId: string) {
  await db().from('invites').delete().eq('id', inviteId);
}

// Accept any unaccepted invites addressed to the current user's email.
export async function acceptPendingInvites(): Promise<void> {
  const { data: auth } = await db().auth.getUser();
  const email = auth.user?.email?.toLowerCase();
  if (!email) return;
  const { data: pending } = await db()
    .from('invites')
    .select('token')
    .eq('accepted', false)
    .ilike('email', email);
  for (const inv of pending ?? []) {
    try {
      await db().rpc('accept_invite', { invite_token: inv.token });
    } catch { /* ignore individual invite failures */ }
  }
}

export async function acceptInviteToken(token: string): Promise<string | null> {
  const { data, error } = await db().rpc('accept_invite', { invite_token: token });
  if (error) return null;
  return data as string;
}

export async function removeMember(workspaceId: string, userId: string) {
  await db().from('workspace_members').delete().eq('workspace_id', workspaceId).eq('user_id', userId);
}
