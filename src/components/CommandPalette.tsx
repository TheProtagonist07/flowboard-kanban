import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, ArrowRight, Zap, Calendar, Users, Columns, X } from 'lucide-react';
import { useBoardStore } from '../store';
import { PRIORITY_CONFIG } from '../utils';

interface Props { onClose: () => void; }

type ResultType = 'card' | 'action' | 'column';
interface Result {
  id: string;
  type: ResultType;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  action: () => void;
}

export default function CommandPalette({ onClose }: Props) {
  const { board, selectCard, addCard, setActiveTab, toggleSidebar, sidebarOpen } = useBoardStore();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = useMemo<Result[]>(() => {
    const q = query.toLowerCase().trim();
    const out: Result[] = [];

    // Quick actions
    if (!q || 'new card create task'.includes(q)) {
      board.columns.forEach(col => {
        out.push({
          id: `new-${col.id}`,
          type: 'action',
          label: `New card in "${col.title}"`,
          sublabel: 'Create',
          icon: <Plus size={13} className="text-indigo-400" />,
          action: () => {
            const title = query && !['new','card','create','task'].includes(query) ? query : 'New card';
            addCard(col.id, title);
            onClose();
          },
        });
      });
    }

    // Cards
    const cardResults = Object.values(board.cards)
      .filter(c => !c.isArchived && (q === '' || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)))
      .slice(0, 8);

    cardResults.forEach(card => {
      const cfg = PRIORITY_CONFIG[card.priority];
      const col = board.columns.find(c => c.id === card.columnId);
      const assignees = board.members.filter(m => card.assigneeIds.includes(m.id));
      out.push({
        id: card.id,
        type: 'card',
        label: card.title,
        sublabel: `${col?.title} · ${cfg.label}${assignees.length ? ' · ' + assignees.map(a => a.name.split(' ')[0]).join(', ') : ''}`,
        icon: <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />,
        action: () => { selectCard(card.id); onClose(); },
      });
    });

    // Columns nav
    if (!q || 'column jump goto'.includes(q) || board.columns.some(c => c.title.toLowerCase().includes(q))) {
      board.columns.filter(c => !q || c.title.toLowerCase().includes(q)).forEach(col => {
        out.push({
          id: `col-${col.id}`,
          type: 'column',
          label: `Jump to "${col.title}"`,
          sublabel: `${col.cardIds.filter(id => board.cards[id]).length} cards`,
          icon: <Columns size={13} className="text-slate-400" />,
          action: () => {
            document.getElementById(col.id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            onClose();
          },
        });
      });
    }

    // Sidebar shortcuts
    if (!q || 'timer pomodoro focus'.includes(q)) {
      out.push({
        id: 'open-timer', type: 'action', label: 'Open Pomodoro Timer', sublabel: 'Sidebar',
        icon: <Zap size={13} className="text-yellow-400" />,
        action: () => { if (!sidebarOpen) toggleSidebar(); setActiveTab('timer'); onClose(); },
      });
    }
    if (!q || 'calendar deadline due'.includes(q)) {
      out.push({
        id: 'open-calendar', type: 'action', label: 'Open Calendar', sublabel: 'Sidebar',
        icon: <Calendar size={13} className="text-blue-400" />,
        action: () => { if (!sidebarOpen) toggleSidebar(); setActiveTab('calendar'); onClose(); },
      });
    }
    if (!q || 'team members'.includes(q)) {
      out.push({
        id: 'open-team', type: 'action', label: 'Manage Team', sublabel: 'Sidebar',
        icon: <Users size={13} className="text-green-400" />,
        action: () => { if (!sidebarOpen) toggleSidebar(); setActiveTab('team'); onClose(); },
      });
    }

    return out;
  }, [query, board]);

  useEffect(() => { setSelected(0); }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter')     { e.preventDefault(); results[selected]?.action(); }
      if (e.key === 'Escape')    { onClose(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [results, selected, onClose]);

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.children[selected] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const groupLabel: Record<ResultType, string> = { card: 'Cards', action: 'Actions', column: 'Navigate' };
  const shown: Record<ResultType, boolean> = { card: false, action: false, column: false };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-24 px-4 animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl shadow-black/70 animate-slide-up"
        style={{ background: 'var(--bg-menu)', border: '1px solid var(--accent-border)' }}>
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <Search size={16} className="flex-shrink-0" style={{ color: 'var(--text-3)' }} />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search cards, jump to column, create card..."
            className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text-1)' }} />
          <div className="flex items-center gap-1.5">
            <kbd className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'var(--bg-input)', color: 'var(--text-3)' }}>esc</kbd>
            <button onClick={onClose} style={{ color: 'var(--text-4)' }}><X size={14} /></button>
          </div>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: '420px' }}>
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search size={24} className="mb-3" style={{ color: 'var(--text-4)' }} />
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>No results for "{query}"</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>Try searching for a card title or action</p>
            </div>
          ) : (
            results.map((r, i) => {
              const showGroup = !shown[r.type];
              if (showGroup) shown[r.type] = true;
              return (
                <div key={r.id}>
                  {showGroup && (
                    <div className="px-4 pt-3 pb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-4)' }}>{groupLabel[r.type]}</span>
                    </div>
                  )}
                  <button onClick={r.action} onMouseEnter={() => setSelected(i)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{ background: i === selected ? 'var(--accent-bg)' : 'transparent' }}>
                    <div className="flex-shrink-0 w-5 flex items-center justify-center">{r.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: 'var(--text-1)' }}>{r.label}</p>
                      {r.sublabel && <p className="text-[11px] truncate" style={{ color: 'var(--text-3)' }}>{r.sublabel}</p>}
                    </div>
                    {i === selected && <ArrowRight size={13} className="flex-shrink-0" style={{ color: 'var(--text-3)' }} />}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-input)' }}>
          <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-4)' }}><kbd className="px-1 py-0.5 rounded font-mono" style={{ background: 'var(--bg-tag)', color: 'var(--text-3)' }}>↑↓</kbd> navigate</span>
          <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-4)' }}><kbd className="px-1 py-0.5 rounded font-mono" style={{ background: 'var(--bg-tag)', color: 'var(--text-3)' }}>↵</kbd> select</span>
          <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-4)' }}><kbd className="px-1 py-0.5 rounded font-mono" style={{ background: 'var(--bg-tag)', color: 'var(--text-3)' }}>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
