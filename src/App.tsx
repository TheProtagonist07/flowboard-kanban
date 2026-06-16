import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { useBoardStore } from './store';
import { decodeBoard, checkDueDateNotifications, requestNotificationPermission } from './utils';
import { CLOUD } from './lib/supabase';
import { useAuth } from './lib/auth';
import { bootstrap, loadBoard, subscribeBoard, acceptInviteToken } from './lib/cloud';
import Header from './components/Header';
import Board from './components/Board';
import Sidebar from './components/Sidebar';
import CardModal from './components/CardModal';
import ShareModal from './components/ShareModal';
import CommandPalette from './components/CommandPalette';
import Login from './components/Login';

// ── Entry point ───────────────────────────────────────────────────────────────
// LOCAL mode renders the board straight away. CLOUD mode first gates on auth and
// loads the active board from Supabase.
export default function App() {
  const theme = useBoardStore(s => s.theme);

  // Keep the persisted theme applied even on the login/splash screens.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  if (!CLOUD) return <BoardApp />;
  return <CloudGate />;
}

function Splash({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-3"
      style={{ background: 'linear-gradient(135deg, var(--gradient-a) 0%, var(--gradient-b) 50%, var(--gradient-a) 100%)' }}>
      <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
      <p className="text-sm" style={{ color: 'var(--text-3)' }}>{label ?? 'Loading…'}</p>
    </div>
  );
}

function CloudGate() {
  const { session, loading } = useAuth();
  const { cloudBoardId, cloudReady, selectCloudBoard, applyLoadedBoard, applyRemoteBoard } = useBoardStore();

  // After sign-in, accept any invite link, then bootstrap a workspace + board.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const inviteToken = params.get('invite');
      if (inviteToken) {
        await acceptInviteToken(inviteToken);
        window.history.replaceState({}, '', window.location.pathname);
      }
      const { boardId } = await bootstrap();
      if (!cancelled) selectCloudBoard(boardId);
    })().catch(err => console.error('[cloud] bootstrap failed', err));
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  // Whenever the active board changes, load it and subscribe to realtime updates.
  useEffect(() => {
    if (!session || !cloudBoardId) return;
    let unsub = () => {};
    let cancelled = false;
    loadBoard(cloudBoardId).then(loaded => {
      if (cancelled || !loaded) return;
      applyLoadedBoard(loaded.workspaceId, loaded.board);
      unsub = subscribeBoard(cloudBoardId, (b) => applyRemoteBoard(b));
    });
    return () => { cancelled = true; unsub(); };
  }, [session?.user?.id, cloudBoardId]);

  if (loading) return <Splash />;
  if (!session) return <Login />;
  if (!cloudReady) return <Splash label="Loading your boards…" />;
  return <BoardApp />;
}

// ── The board application itself ──────────────────────────────────────────────
function BoardApp() {
  const { selectedCardId, importBoard, board } = useBoardStore();
  const [showShare, setShowShare] = useState(false);
  const [showCmd, setShowCmd] = useState(false);

  // Local mode only: push board to the optional local API + support shared links.
  useEffect(() => {
    if (CLOUD) return;
    fetch('http://localhost:3001/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(board),
    }).catch(() => { /* API not running — silent */ });
  }, []);

  useEffect(() => {
    if (CLOUD) return;
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('board');
    if (encoded) {
      const decoded = decodeBoard(encoded);
      if (decoded) {
        importBoard(decoded);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  // Setup notifications
  useEffect(() => {
    requestNotificationPermission();
    checkDueDateNotifications(board.cards);
    const interval = setInterval(() => checkDueDateNotifications(board.cards), 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [board.cards]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showCmd) setShowCmd(false);
        else if (selectedCardId) useBoardStore.getState().selectCard(null);
        else if (showShare) setShowShare(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCmd(c => !c);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedCardId, showShare, showCmd]);

  function handleManageTeam() {
    const store = useBoardStore.getState();
    if (!store.sidebarOpen) store.toggleSidebar();
    store.setActiveTab('team');
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden"
      style={{ background: 'linear-gradient(135deg, var(--gradient-a) 0%, var(--gradient-b) 50%, var(--gradient-a) 100%)' }}>
      {/* Ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, var(--glow-a), transparent)', transform: 'translate(-50%,-50%)' }} />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, var(--glow-b), transparent)', transform: 'translate(50%,50%)' }} />
      </div>

      <Header onShare={() => setShowShare(true)} onManageTeam={handleManageTeam} />

      <div className="flex flex-1 overflow-hidden relative">
        <main className="flex-1 overflow-hidden">
          <Board />
        </main>
        <Sidebar />
      </div>

      {selectedCardId && <CardModal />}
      {showShare && <ShareModal onClose={() => setShowShare(false)} />}
      {showCmd && <CommandPalette onClose={() => setShowCmd(false)} />}

      <Toaster position="bottom-right" toastOptions={{
        style: { background: 'var(--bg-modal)', color: 'var(--text-1)', border: '1px solid var(--border-medium)', borderRadius: '12px', fontSize: '13px' },
        success: { iconTheme: { primary: 'var(--accent)', secondary: 'var(--bg-modal)' } },
        error:   { iconTheme: { primary: '#ef4444', secondary: 'var(--bg-modal)' } },
      }} />
    </div>
  );
}
