import { useMemo } from 'react';
import { TrendingUp, BarChart3, Users, Clock, Target, AlertTriangle } from 'lucide-react';
import { useBoardStore } from '../store';
import { PRIORITY_CONFIG, formatMinutes } from '../utils';
import type { Priority } from '../types';

export default function Analytics() {
  const { board } = useBoardStore();
  const allCards = Object.values(board.cards).filter(c => !c.isArchived);

  const stats = useMemo(() => {
    const byColumn = board.columns.map(col => ({
      col,
      count: col.cardIds.filter(id => board.cards[id] && !board.cards[id].isArchived).length,
    }));

    const byPriority: Record<Priority, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    allCards.forEach(c => { byPriority[c.priority]++; });

    const overdue = allCards.filter(c => c.dueDate && new Date(c.dueDate) < new Date()).length;
    const doneCol = board.columns.find(c => c.title.toLowerCase() === 'done');
    const doneCount = doneCol ? doneCol.cardIds.filter(id => board.cards[id]).length : 0;
    const totalPoints = allCards.reduce((sum, c) => sum + c.storyPoints, 0);
    const totalTime = allCards.reduce((sum, c) => sum + c.timeSpent, 0);

    const memberLoad = board.members.map(m => ({
      member: m,
      cards: allCards.filter(c => c.assigneeIds.includes(m.id)).length,
    })).sort((a, b) => b.cards - a.cards);

    const completionRate = allCards.length > 0 ? Math.round((doneCount / allCards.length) * 100) : 0;

    return { byColumn, byPriority, overdue, doneCount, totalPoints, totalTime, memberLoad, completionRate };
  }, [board]);

  const maxColCount = Math.max(...stats.byColumn.map(b => b.count), 1);

  return (
    <div className="space-y-5">
      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-800/40 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Target size={12} className="text-indigo-400" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wide">Completion</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.completionRate}%</div>
          <div className="h-1 mt-1.5 rounded-full bg-slate-700 overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${stats.completionRate}%` }} />
          </div>
        </div>
        <div className="bg-slate-800/40 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle size={12} className="text-red-400" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wide">Overdue</span>
          </div>
          <div className={`text-2xl font-bold ${stats.overdue > 0 ? 'text-red-400' : 'text-green-400'}`}>{stats.overdue}</div>
          <div className="text-[10px] text-slate-500">{stats.overdue === 0 ? 'All on track!' : 'Need attention'}</div>
        </div>
        <div className="bg-slate-800/40 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} className="text-yellow-400" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wide">Story Pts</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalPoints}</div>
          <div className="text-[10px] text-slate-500">{allCards.length} total cards</div>
        </div>
        <div className="bg-slate-800/40 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock size={12} className="text-green-400" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wide">Time Logged</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatMinutes(stats.totalTime)}</div>
          <div className="text-[10px] text-slate-500">this sprint</div>
        </div>
      </div>

      {/* Column distribution */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <BarChart3 size={13} className="text-slate-400" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Column Load</span>
        </div>
        <div className="space-y-2">
          {stats.byColumn.map(({ col, count }) => (
            <div key={col.id}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                  <span className="text-xs text-slate-300 truncate max-w-[100px]">{col.title}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">{count}</span>
                  {col.wipLimit && count > col.wipLimit && (
                    <span className="text-[9px] bg-red-500/20 text-red-400 px-1 rounded">WIP!</span>
                  )}
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(count / maxColCount) * 100}%`, background: col.color + (count > (col.wipLimit || 999) ? '' : '99') }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Priority breakdown */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <TrendingUp size={13} className="text-slate-400" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">By Priority</span>
        </div>
        <div className="space-y-2">
          {(['critical','high','medium','low'] as Priority[]).map(p => {
            const count = stats.byPriority[p];
            const pct = allCards.length ? Math.round((count / allCards.length) * 100) : 0;
            return (
              <div key={p} className="flex items-center gap-2">
                <span className="text-[10px] w-14 text-slate-500 capitalize">{p}</span>
                <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: PRIORITY_CONFIG[p].color }} />
                </div>
                <span className="text-[10px] text-slate-400 w-5 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Team workload */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <Users size={13} className="text-slate-400" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Team Load</span>
        </div>
        <div className="space-y-2.5">
          {stats.memberLoad.map(({ member, cards }) => {
            const pct = cards > 0 ? Math.min((cards / 5) * 100, 100) : 0;
            const isOverloaded = cards > 5;
            return (
              <div key={member.id} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0" style={{ background: member.color }}>
                  {member.initials}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] text-slate-300">{member.name.split(' ')[0]}</span>
                    <span className={`text-[10px] ${isOverloaded ? 'text-red-400' : 'text-slate-500'}`}>{cards} tasks</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: isOverloaded ? '#ef4444' : member.color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottleneck alert */}
      {stats.byColumn.some(({ col, count }) => col.wipLimit && count > col.wipLimit) && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={13} className="text-red-400" />
            <span className="text-xs font-semibold text-red-300">Bottleneck Detected</span>
          </div>
          <p className="text-[11px] text-red-400/80 leading-relaxed">
            Some columns have exceeded their WIP limits. Focus on completing in-progress items before adding new ones.
          </p>
        </div>
      )}
    </div>
  );
}
