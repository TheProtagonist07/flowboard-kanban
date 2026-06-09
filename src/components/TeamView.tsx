import { useState } from 'react';
import { UserPlus, Trash2, Crown } from 'lucide-react';
import { useBoardStore } from '../store';

export default function TeamView() {
  const { board, addMember, removeMember, setCurrentUser } = useBoardStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const allCards = Object.values(board.cards).filter(c => !c.isArchived);

  function handleAdd() {
    if (name.trim()) {
      addMember(name.trim(), role.trim() || undefined);
      setName('');
      setRole('');
      setAdding(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Team Members</span>
        <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
          <UserPlus size={12} /> Invite
        </button>
      </div>

      {adding && (
        <div className="mb-4 p-3 bg-slate-800/40 rounded-xl border border-slate-700/40 animate-slide-up">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" autoFocus
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 mb-2" />
          <input value={role} onChange={e => setRole(e.target.value)} placeholder="Role (optional)"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 mb-2" />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg">Add</button>
            <button onClick={() => { setAdding(false); setName(''); setRole(''); }} className="px-3 py-1.5 bg-slate-700/60 text-slate-400 text-xs rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {board.members.map(m => {
          const tasks = allCards.filter(c => c.assigneeIds.includes(m.id));
          const overdue = tasks.filter(c => c.dueDate && new Date(c.dueDate) < new Date()).length;
          const isCurrent = m.id === board.currentUserId;

          return (
            <div key={m.id} className={`p-3 rounded-xl transition-all ${isCurrent ? 'bg-indigo-900/20 border border-indigo-700/30' : 'bg-slate-800/30 border border-slate-700/30'}`}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 relative"
                  style={{ background: m.color }}>
                  {m.initials}
                  {isCurrent && <Crown size={10} className="absolute -top-1 -right-1 text-yellow-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-200 truncate">{m.name}</p>
                      {m.role && <p className="text-[11px] text-slate-500">{m.role}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      {!isCurrent && (
                        <button onClick={() => setCurrentUser(m.id)} className="text-[10px] text-indigo-400 hover:text-indigo-300 px-2 py-0.5 border border-indigo-700/30 rounded-full">
                          Switch
                        </button>
                      )}
                      {isCurrent && <span className="text-[10px] text-indigo-400 font-medium">You</span>}
                      <button onClick={() => { if (confirm(`Remove ${m.name}?`)) removeMember(m.id); }}
                        className="p-1 text-slate-600 hover:text-red-400 transition-colors">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-1.5">
                    <span className="text-[10px] text-slate-400">{tasks.length} tasks</span>
                    {overdue > 0 && <span className="text-[10px] text-red-400">{overdue} overdue</span>}
                    <span className="text-[10px] text-slate-500">
                      {tasks.filter(c => { const col = board.columns.find(co => co.id === c.columnId); return col?.title.toLowerCase() === 'done'; }).length} done
                    </span>
                  </div>
                </div>
              </div>

              {/* Assigned cards */}
              {tasks.length > 0 && (
                <div className="mt-2 space-y-1">
                  {tasks.slice(0, 3).map(c => (
                    <div key={c.id} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#4ade80' }[c.priority] }} />
                      <span className="truncate">{c.title}</span>
                    </div>
                  ))}
                  {tasks.length > 3 && <span className="text-[10px] text-slate-600">+{tasks.length - 3} more</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
