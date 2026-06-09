import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useBoardStore } from '../store';
import { PRIORITY_CONFIG } from '../utils';

export default function CalendarView() {
  const { board, selectCard } = useBoardStore();
  const [current, setCurrent] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = current.getFullYear();
  const month = current.getMonth();
  const monthName = current.toLocaleString('default', { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cardsByDate: Record<string, typeof allCards> = {};
  const allCards = Object.values(board.cards).filter(c => !c.isArchived && c.dueDate);
  allCards.forEach(c => {
    if (!c.dueDate) return;
    if (!cardsByDate[c.dueDate]) cardsByDate[c.dueDate] = [];
    cardsByDate[c.dueDate].push(c);
  });

  function dateKey(d: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  const today = new Date().toISOString().split('T')[0];
  const selectedCards = selectedDay ? (cardsByDate[selectedDay] ?? []) : [];

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrent(new Date(year, month - 1, 1))} className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft size={14} />
        </button>
        <span className="text-sm font-semibold text-slate-200">{monthName}</span>
        <button onClick={() => setCurrent(new Date(year, month + 1, 1))} className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-slate-600 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {/* Empty cells before first day */}
        {[...Array(firstDay)].map((_, i) => <div key={`e${i}`} />)}

        {/* Day cells */}
        {[...Array(daysInMonth)].map((_, i) => {
          const day = i + 1;
          const key = dateKey(day);
          const dayCards = cardsByDate[key] ?? [];
          const isToday = key === today;
          const isSelected = key === selectedDay;
          const isPast = key < today;

          return (
            <button key={day} onClick={() => setSelectedDay(key === selectedDay ? null : key)}
              className={`relative flex flex-col items-center py-1 rounded-lg text-xs transition-all
                ${isSelected ? 'bg-indigo-600/30 ring-1 ring-indigo-500' : isToday ? 'bg-indigo-900/40' : 'hover:bg-slate-700/40'}`}>
              <span className={`font-medium text-[11px] ${isToday ? 'text-indigo-300' : isPast ? 'text-slate-600' : 'text-slate-300'}`}>
                {day}
              </span>
              {dayCards.length > 0 && (
                <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                  {dayCards.slice(0, 3).map(c => (
                    <div key={c.id} className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_CONFIG[c.priority].color }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day cards */}
      {selectedDay && (
        <div className="mt-4 animate-slide-up">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={12} className="text-indigo-400" />
            <span className="text-xs font-semibold text-slate-300">
              {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
          {selectedCards.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-3">No cards due on this date</p>
          ) : (
            <div className="space-y-2">
              {selectedCards.map(c => {
                const cfg = PRIORITY_CONFIG[c.priority];
                const col = board.columns.find(col => col.id === c.columnId);
                return (
                  <button key={c.id} onClick={() => selectCard(c.id)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-700/40 transition-colors"
                    style={{ background: 'rgba(15,23,42,0.6)', border: `1px solid ${cfg.color}40`, borderLeft: `3px solid ${cfg.color}` }}>
                    <p className="text-xs font-medium text-slate-200 truncate">{c.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px]" style={{ color: cfg.color }}>{cfg.label}</span>
                      {col && <span className="text-[10px] text-slate-600">in {col.title}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Upcoming deadlines */}
      {!selectedDay && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Upcoming deadlines</p>
          {allCards
            .filter(c => c.dueDate && c.dueDate >= today)
            .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
            .slice(0, 5)
            .map(c => {
              const cfg = PRIORITY_CONFIG[c.priority];
              const diff = Math.floor((new Date(c.dueDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <button key={c.id} onClick={() => selectCard(c.id)}
                  className="w-full text-left flex items-center gap-2 py-2 border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30 rounded px-1 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                  <span className="flex-1 text-xs text-slate-300 truncate">{c.title}</span>
                  <span className={`text-[10px] flex-shrink-0 ${diff === 0 ? 'text-orange-400' : diff <= 2 ? 'text-yellow-400' : 'text-slate-500'}`}>
                    {diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : `${diff}d`}
                  </span>
                </button>
              );
            })}
          {allCards.filter(c => c.dueDate && c.dueDate >= today).length === 0 && (
            <p className="text-xs text-slate-600 text-center py-3">No upcoming deadlines</p>
          )}
        </div>
      )}
    </div>
  );
}
