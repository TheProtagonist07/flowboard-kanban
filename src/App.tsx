import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useBoardStore } from './store';
import { decodeBoard, checkDueDateNotifications, requestNotificationPermission } from './utils';
import Header from './components/Header';
import Board from './components/Board';
import Sidebar from './components/Sidebar';
import CardModal from './components/CardModal';
import ShareModal from './components/ShareModal';
import CommandPalette from './components/CommandPalette';

export default function App() {
  const { selectedCardId, importBoard, board, theme } = useBoardStore();
  const [showShare, setShowShare] = useState(false);
  const [showCmd, setShowCmd] = useState(false);

  // Apply persisted theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Push current board state to the API on mount so the Discord bot is in sync
  useEffect(() => {
    fetch('http://localhost:3001/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(board),
    }).catch(() => { /* API not running — silent */ });
  }, []);

  // Import board from URL on first load
  useEffect(() => {
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
