import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useBoardStore } from './store';
import { decodeBoard, checkDueDateNotifications, requestNotificationPermission } from './utils';
import Header from './components/Header';
import Board from './components/Board';
import Sidebar from './components/Sidebar';
import CardModal from './components/CardModal';
import ShareModal from './components/ShareModal';

export default function App() {
  const { selectedCardId, importBoard, board } = useBoardStore();
  const [showShare, setShowShare] = useState(false);

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
        if (selectedCardId) useBoardStore.getState().selectCard(null);
        else if (showShare) setShowShare(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowShare(true);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedCardId, showShare]);

  function handleManageTeam() {
    const store = useBoardStore.getState();
    if (!store.sidebarOpen) store.toggleSidebar();
    store.setActiveTab('team');
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)' }}>
      {/* Ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #818cf8, transparent)', transform: 'translate(-50%,-50%)' }} />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #c084fc, transparent)', transform: 'translate(50%,50%)' }} />
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

      <Toaster position="bottom-right" toastOptions={{
        style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid rgba(71,85,105,0.4)', borderRadius: '12px', fontSize: '13px' },
        success: { iconTheme: { primary: '#818cf8', secondary: '#0f172a' } },
        error:   { iconTheme: { primary: '#ef4444', secondary: '#0f172a' } },
      }} />
    </div>
  );
}
