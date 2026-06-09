import { useState } from 'react';
import { Search, Share2, Users, Bell, PanelRight, Zap, Filter, X } from 'lucide-react';
import { useBoardStore } from '../store';
import type { Priority } from '../types';
import { PRIORITY_CONFIG, requestNotificationPermission } from '../utils';

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
    <header className="glass border-b border-slate-700/50 px-4 py-3 flex items-center gap-3 flex-shrink-0 z-50">
      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/30">
          <Zap size={16} className="text-white" />
        </div>
        <span className="font-bold text-gradient text-sm tracking-wide hidden sm:block">FlowBoard</span>
      </div>

      <div className="w-px h-6 bg-slate-700 flex-shrink-0" />

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
            <button onClick={() => { setEditingTitle(true); setTitleVal(board.title); }} className="font-semibold text-slate-100 text-sm hover:text-white truncate text-left max-w-xs">
              {board.title}
            </button>
            <span className="text-xs text-slate-500 hidden md:block truncate">{board.description}</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative hidden md:flex items-center">
        <Search size={14} className="absolute left-3 text-slate-500" />
        <input
          value={filters.search}
          onChange={e => setFilters({ search: e.target.value })}
          placeholder="Search cards..."
          className="bg-slate-800/60 border border-slate-700/60 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 w-48 transition-all"
        />
        {filters.search && (
          <button onClick={() => setFilters({ search: '' })} className="absolute right-3 text-slate-500 hover:text-white">
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
              style={{ background: m.color, border: '2px solid #020617' }}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold cursor-pointer hover:z-10 transition-transform hover:scale-110 flex-shrink-0">
              {m.initials}
            </div>
          ))}
          {board.members.length > 4 && (
            <div className="w-7 h-7 rounded-full bg-slate-700 border-2 border-slate-950 flex items-center justify-center text-slate-300 text-[10px] font-bold cursor-pointer">
              +{board.members.length - 4}
            </div>
          )}
        </div>
        <button onClick={onManageTeam} className="ml-2 p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-white transition-all tooltip" data-tip="Invite member">
          <Users size={14} />
        </button>
      </div>

      {/* Actions */}
      <button onClick={() => { requestNotificationPermission(); }} className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-white transition-all tooltip" data-tip="Enable notifications">
        <Bell size={14} />
      </button>

      <button onClick={onShare} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-900/30">
        <Share2 size={13} />
        <span className="hidden sm:inline">Share</span>
      </button>

      <button onClick={toggleSidebar} className={`p-1.5 rounded-lg transition-all tooltip ${sidebarOpen ? 'bg-indigo-600/20 text-indigo-400' : 'bg-slate-800/60 text-slate-400 hover:text-white'}`} data-tip="Toggle sidebar">
        <PanelRight size={14} />
      </button>
    </header>
  );
}
