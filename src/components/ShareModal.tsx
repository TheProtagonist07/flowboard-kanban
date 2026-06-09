import { useState } from 'react';
import { X, Copy, Check, Download, Upload, Link, Info } from 'lucide-react';
import { useBoardStore } from '../store';
import { getBoardShareUrl, decodeBoard } from '../utils';
import toast from 'react-hot-toast';

interface Props { onClose: () => void; }

export default function ShareModal({ onClose }: Props) {
  const { board, importBoard } = useBoardStore();
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [activeTab, setActiveTab] = useState<'share' | 'import' | 'export'>('share');

  const shareUrl = getBoardShareUrl(board);

  function handleCopyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleExportJSON() {
    const data = JSON.stringify(board, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${board.title.replace(/\s+/g, '-').toLowerCase()}-board.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Board exported!');
  }

  function handleImport() {
    // Try JSON first
    try {
      const parsed = JSON.parse(importText);
      if (parsed.id && parsed.columns && parsed.cards) {
        importBoard(parsed);
        toast.success('Board imported successfully!');
        onClose();
        return;
      }
    } catch {}

    // Try encoded URL
    const urlMatch = importText.match(/[?&]board=([^&\s]+)/);
    const encoded = urlMatch ? urlMatch[1] : importText.trim();
    const decoded = decodeBoard(encoded);
    if (decoded) {
      importBoard(decoded);
      toast.success('Board imported successfully!');
      onClose();
    } else {
      toast.error('Invalid import data. Paste a share link or JSON.');
    }
  }

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        importBoard(parsed);
        toast.success('Board imported from file!');
        onClose();
      } catch {
        toast.error('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden animate-slide-up shadow-2xl"
        style={{ background: '#0f172a', border: '1px solid rgba(71,85,105,0.5)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-base font-semibold text-white">Share Board</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-700/60 text-slate-500 hover:text-white transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          {(['share', 'import', 'export'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-xs font-medium capitalize transition-all border-b-2 ${activeTab === tab ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'share' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <Info size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-300/80 leading-relaxed">
                  The share link encodes your entire board state. Anyone with the link can import and view your board. Changes made by others won't sync back automatically.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Shareable link</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-slate-800/60 border border-slate-700/40 rounded-xl px-3 py-2.5 text-xs text-slate-400 overflow-hidden" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    <Link size={11} className="inline mr-1.5 text-slate-500" />
                    {shareUrl.length > 50 ? shareUrl.substring(0, 50) + '...' : shareUrl}
                  </div>
                  <button onClick={handleCopyLink}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${copied ? 'bg-green-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Board ID</label>
                <div className="flex gap-2 items-center bg-slate-800/60 border border-slate-700/40 rounded-xl px-3 py-2.5">
                  <span className="font-mono text-sm text-indigo-300 flex-1">{board.id}</span>
                  <button onClick={() => { navigator.clipboard.writeText(board.id); toast.success('ID copied!'); }}
                    className="text-slate-500 hover:text-slate-300">
                    <Copy size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Paste share link or JSON</label>
                <textarea value={importText} onChange={e => setImportText(e.target.value)}
                  placeholder="Paste a share link (http://localhost:5173?board=...) or board JSON here..."
                  className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl px-3 py-2.5 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-500 resize-none transition-colors"
                  rows={5} />
              </div>
              <button onClick={handleImport} disabled={!importText.trim()}
                className="w-full py-2.5 bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors">
                <Upload size={14} className="inline mr-2" />
                Import Board
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
                <div className="relative flex justify-center"><span className="px-3 bg-[#0f172a] text-xs text-slate-600">or</span></div>
              </div>

              <label className="flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-700 rounded-xl text-sm text-slate-400 hover:border-indigo-500 hover:text-indigo-400 cursor-pointer transition-all">
                <Download size={14} />
                Import from JSON file
                <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
              </label>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400 leading-relaxed">Export your board as a JSON file to backup or share with teammates.</p>
              <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/30">
                <p className="text-xs text-slate-500 mb-1">Board: <span className="text-slate-300">{board.title}</span></p>
                <p className="text-xs text-slate-500 mb-1">Columns: <span className="text-slate-300">{board.columns.length}</span></p>
                <p className="text-xs text-slate-500 mb-1">Cards: <span className="text-slate-300">{Object.keys(board.cards).length}</span></p>
                <p className="text-xs text-slate-500">Members: <span className="text-slate-300">{board.members.length}</span></p>
              </div>
              <button onClick={handleExportJSON}
                className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-violet-900/20">
                <Download size={14} className="inline mr-2" />
                Export as JSON
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
