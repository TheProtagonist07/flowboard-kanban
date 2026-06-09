import { useState } from 'react';
import { Search, Share2, Users, Bell, PanelRight, Zap, Filter, X } from 'lucide-react';
import { useBoardStore } from '../store';
import type { Priority } from '../types';
import { PRIORITY_CONFIG, requestNotificationPermission } from '../utils';
import ThemePicker from './ThemePicker';

interface Props { onShare: () => void; onManageTeam: () => void; }

export default function Header({ onShare, onManageTeam }: Props) {
  const { board, filters, setFilters, clearFilters, toggleSidebar, sidebarOpen } = useBoardStore();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(board.title);
  const [showFilters, setShowFilters] = useState(false);
  const { updateBoard } = useBoardStore();

  const activeFilterCount = filters.priorities.length + filters.assigneeIds.length + filters.labelIds.length + (filters.showOverdue ? 1 : 0);

  function handleTitleSave() {
    if (titleVal.trim()) updateBoard({ title: titleVal.trim() });
    setEditingTitle(false);
  }

  function togglePriority(p: Priority) {
    const current = filters.priorities;
    setFilters({ priorities: current.includes(p) ? current.filter(x => x !== p) : [...current, p] });
  }

  function toggleAssignee(id: string) {
    const current = filters.assigneeIds;
    setFilters({ assigneeIds: current.includes(id) ? current.filter(x => x !== id) : [...current, id] });
  }

  return (
    <header className="glass px-4 py-3 flex items-center gap-3 flex-shrink-0 z-50" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/30">
          <Zap size={16} className="text-white" />
        </div>
        <span className="font-bold text-gradient text-sm tracking-wide hidden sm:block">FlowBoard</span>
      </div>

      <div className="w-px h-6 flex-shrink-0" style={{ background: 'var(--border-medium)' }} />

      {/* Board Title */}
      <div className="flex-1 min-w-0">
        {editingTitle ? (
          <input
            autoFocus
            value={titleVal}
            onChange={e => setTitleVal(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={e => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setEditingTitle(false); }}
            className="bg-slate-800 border border-indigo-500 rounded-lg px-3 py-1 text-sm font-semibold text-white outline-none w-full max-w-xs"
          />
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => { setEditingTitle(true); setTitleVal(board.title); }} className="font-semibold text-sm truncate text-left max-w-xs" style={{ color: 'var(--text-1)' }}>
              {board.title}
            </button>
            <span className="text-xs hidden md:block truncate" style={{ color: 'var(--text-3)' }}>{board.description}</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative hidden md:flex items-center">
        <Search size={14} className="absolute left-3" style={{ color: 'var(--text-3)' }} />
        <input
          value={filters.search}
          onChange={e => setFilters({ search: e.target.value })}
          placeholder="Search cards..."
          className="rounded-lg pl-9 pr-3 py-1.5 text-xs outline-none w-48 transition-all"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-1)' }}
        />
        {filters.search && (
          <button onClick={() => setFilters({ search: '' })} className="absolute right-3" style={{ color: 'var(--text-3)' }}>
            <X size={12} />
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="relative">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${showFilters || activeFilterCount > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'}`}
        >
          <Filter size={13} />
          <span className="hidden sm:inline">Filter</span>
          {activeFilterCount > 0 && <span className="bg-white/20 rounded-full px-1.5 text-xs">{activeFilterCount}</span>}
        </button>

        {showFilters && (
          <div className="absolute top-full right-0 mt-2 w-72 glass-card shadow-2xl p-4 z-50 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Filters</span>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-xs text-indigo-400 hover:text-indigo-300">Clear all</button>
              )}
            </div>

            <div className="mb-4">
              <p className="text-xs text-slate-400 mb-2 font-medium">Priority</p>
              <div className="flex flex-wrap gap-2">
                {(['critical','high','medium','low'] as Priority[]).map(p => (
                  <button key={p} onClick={() => togglePriority(p)}
                    style={{ borderColor: filters.priorities.includes(p) ? PRIORITY_CONFIG[p].color : 'transparent', background: filters.priorities.includes(p) ? PRIORITY_CONFIG[p].bg : '' }}
                    className="text-xs px-2.5 py-1 rounded-full border-2 border-slate-700 text-slate-300 hover:border-slate-500 transition-all capitalize">
                    {PRIORITY_CONFIG[p].icon} {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs text-slate-400 mb-2 font-medium">Assignee</p>
              <div className="flex flex-wrap gap-2">
                {board.members.map(m => (
                  <button key={m.id} onClick={() => toggleAssignee(m.id)}
                    style={{ background: filters.assigneeIds.includes(m.id) ? m.color + '40' : '', borderColor: filters.assigneeIds.includes(m.id) ? m.color : 'transparent' }}
                    className="text-xs px-2.5 py-1 rounded-full border-2 border-slate-700 text-slate-300 hover:border-slate-500 transition-all flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ background: m.color }}>{m.initials}</span>
                    {m.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={filters.showOverdue} onChange={e => setFilters({ showOverdue: e.target.checked })}
                className="w-4 h-4 rounded accent-red-500" />
              <span className="text-xs text-slate-300">Show overdue only</span>
            </label>
          </div>
        )}
      </div>

      {/* Members */}
      <div className="flex items-center">
        <div className="flex -space-x-1.5 tooltip" data-tip="Manage team" onClick={onManageTeam}>
          {board.members.slice(0, 4).map(m => (
            <div key={m.id}
              style={{ background: m.color, border: '2px solid var(--bg-app)' }}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold cursor-pointer hover:z-10 transition-transform hover:scale-110 flex-shrink-0">
              {m.initials}
            </div>
          ))}
          {board.members.length > 4 && (
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer" style={{ background: 'var(--bg-input)', border: '2px solid var(--bg-app)', color: 'var(--text-2)' }}>
              +{board.members.length - 4}
            </div>
          )}
        </div>
        <button onClick={onManageTeam} className="ml-2 p-1.5 rounded-lg transition-all tooltip" style={{ background: 'var(--bg-input)', color: 'var(--text-3)' }} data-tip="Invite member">
          <Users size={14} />
        </button>
      </div>

      {/* Actions */}
      <button onClick={() => { requestNotificationPermission(); }} className="p-1.5 rounded-lg transition-all tooltip" style={{ background: 'var(--bg-input)', color: 'var(--text-3)' }} data-tip="Enable notifications">
        <Bell size={14} />
      </button>

      <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] tooltip" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-4)' }} data-tip="Command palette">
        <span className="font-mono">⌘K</span>
      </div>

      <ThemePicker />

      <button onClick={onShare} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-900/30">
        <Share2 size={13} />
        <span className="hidden sm:inline">Share</span>
      </button>

      <button onClick={toggleSidebar} className="p-1.5 rounded-lg transition-all tooltip" style={{ background: sidebarOpen ? 'var(--accent-bg)' : 'var(--bg-input)', color: sidebarOpen ? 'var(--accent)' : 'var(--text-3)' }} data-tip="Toggle sidebar">
        <PanelRight size={14} />
      </button>
    </header>
  );
}
