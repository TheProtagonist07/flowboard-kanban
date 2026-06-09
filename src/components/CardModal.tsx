import { useState, useEffect } from 'react';
import { X, Trash2, CheckSquare, Square, Plus, Calendar, Zap, Clock, Tag, User, MessageSquare, Mic, ArrowRight, Archive } from 'lucide-react';
import { useBoardStore } from '../store';
import { PRIORITY_CONFIG, formatTimeAgo, formatMinutes } from '../utils';
import VoiceInput from './VoiceInput';
import type { Priority } from '../types';

export default function CardModal() {
  const { board, selectedCardId, selectCard, updateCard, deleteCard, archiveCard, toggleSubtask, addSubtask, deleteSubtask, addComment, addVoiceNote } = useBoardStore();
  const card = selectedCardId ? board.cards[selectedCardId] : null;
  const [newSubtask, setNewSubtask] = useState('');
  const [newComment, setNewComment] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [trackingTime, setTrackingTime] = useState(false);
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (trackingTime && timerStart) {
      interval = setInterval(() => setElapsed(Math.floor((Date.now() - timerStart) / 1000)), 1000);
    }
    return () => clearInterval(interval);
  }, [trackingTime, timerStart]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') selectCard(null);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectCard]);

  if (!card) return null;

  const cfg = PRIORITY_CONFIG[card.priority];
  const assignees = board.members.filter(m => card.assigneeIds.includes(m.id));
  const labels = board.labels.filter(l => card.labelIds.includes(l.id));
  const currentCol = board.columns.find(c => c.id === card.columnId);
  const currentUser = board.members.find(m => m.id === board.currentUserId);

  function toggleLabel(id: string) {
    const newIds = card!.labelIds.includes(id)
      ? card!.labelIds.filter(l => l !== id)
      : [...card!.labelIds, id];
    updateCard(card!.id, { labelIds: newIds });
  }

  function toggleAssignee(id: string) {
    const newIds = card!.assigneeIds.includes(id)
      ? card!.assigneeIds.filter(a => a !== id)
      : [...card!.assigneeIds, id];
    updateCard(card!.id, { assigneeIds: newIds });
  }

  function handleAddSubtask() {
    if (newSubtask.trim()) {
      addSubtask(card!.id, newSubtask.trim());
      setNewSubtask('');
    }
    setAddingSubtask(false);
  }

  function handleAddComment() {
    if (newComment.trim()) {
      addComment(card!.id, newComment.trim());
      setNewComment('');
    }
  }

  function stopTimeTracking() {
    if (timerStart) {
      const mins = Math.floor((Date.now() - timerStart) / 60000);
      updateCard(card!.id, { timeSpent: (card!.timeSpent || 0) + mins });
    }
    setTrackingTime(false);
    setTimerStart(null);
    setElapsed(0);
  }

  const formatElapsed = (secs: number) => `${String(Math.floor(secs/3600)).padStart(2,'0')}:${String(Math.floor(secs%3600/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={e => { if (e.target === e.currentTarget) selectCard(null); }}
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden animate-slide-up shadow-2xl shadow-black/60"
        style={{ background: '#0f172a', border: '1px solid rgba(71,85,105,0.5)' }}>

        {/* Priority top bar */}
        <div className="h-1 flex-shrink-0" style={{ background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}60)` }} />

        {/* Header */}
        <div className="flex items-start gap-3 p-5 pb-4 flex-shrink-0 border-b border-slate-800">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-slate-500">{currentCol?.title}</span>
              <span className="text-slate-700">›</span>
              <span className="text-xs" style={{ color: cfg.color }}>{cfg.label} Priority</span>
            </div>
            <textarea
              value={card.title}
              onChange={e => updateCard(card.id, { title: e.target.value })}
              className="w-full bg-transparent text-lg font-semibold text-white outline-none resize-none leading-tight"
              rows={1}
              style={{ minHeight: 28 }}
              onInput={e => { const el = e.target as HTMLTextAreaElement; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }}
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => archiveCard(card.id)} className="p-2 rounded-lg hover:bg-slate-700/60 text-slate-500 hover:text-yellow-400 transition-all tooltip" data-tip="Archive">
              <Archive size={14} />
            </button>
            <button onClick={() => { if (confirm('Delete this card?')) { deleteCard(card.id); } }}
              className="p-2 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all tooltip" data-tip="Delete">
              <Trash2 size={14} />
            </button>
            <button onClick={() => selectCard(null)} className="p-2 rounded-lg hover:bg-slate-700/60 text-slate-500 hover:text-white transition-all">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</label>
              <textarea
                value={card.description}
                onChange={e => updateCard(card.id, { description: e.target.value })}
                placeholder="Add a more detailed description..."
                className="w-full bg-slate-800/40 border border-slate-700/40 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500 resize-none transition-colors"
                rows={3}
              />
            </div>

            {/* Subtasks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare size={12} />
                  Checklist
                  {card.subtasks.length > 0 && (
                    <span className="text-slate-600">({card.subtasks.filter(s => s.done).length}/{card.subtasks.length})</span>
                  )}
                </label>
                <button onClick={() => setAddingSubtask(true)} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                  <Plus size={11} /> Add item
                </button>
              </div>

              {card.subtasks.length > 0 && (
                <div className="mb-3">
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden mb-3">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(card.subtasks.filter(s=>s.done).length/card.subtasks.length)*100}%`, background: cfg.color }} />
                  </div>
                  <div className="space-y-1.5">
                    {card.subtasks.map(st => (
                      <div key={st.id} className="flex items-center gap-3 group">
                        <button onClick={() => toggleSubtask(card.id, st.id)} className="flex-shrink-0">
                          {st.done ? <CheckSquare size={15} className="text-indigo-400" /> : <Square size={15} className="text-slate-600 hover:text-slate-400" />}
                        </button>
                        <span className={`flex-1 text-sm ${st.done ? 'line-through text-slate-600' : 'text-slate-300'}`}>{st.text}</span>
                        <button onClick={() => deleteSubtask(card.id, st.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {addingSubtask && (
                <div className="flex gap-2 animate-slide-up">
                  <input autoFocus value={newSubtask} onChange={e => setNewSubtask(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddSubtask(); if (e.key === 'Escape') { setAddingSubtask(false); setNewSubtask(''); } }}
                    placeholder="Add a task..."
                    className="flex-1 bg-slate-800 border border-indigo-500 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none"
                  />
                  <button onClick={handleAddSubtask} className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg">Add</button>
                  <button onClick={() => { setAddingSubtask(false); setNewSubtask(''); }} className="px-2 py-1.5 bg-slate-700/60 text-slate-400 text-xs rounded-lg">×</button>
                </div>
              )}
            </div>

            {/* Voice Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Mic size={12} />
                Voice Notes
              </label>
              <VoiceInput onTranscript={text => addVoiceNote(card.id, text)} />
              {card.voiceNotes.length > 0 && (
                <div className="mt-3 space-y-2">
                  {card.voiceNotes.map((note, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 bg-slate-800/40 rounded-lg border border-slate-700/40">
                      <Mic size={12} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-slate-300 leading-relaxed">{note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comments */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MessageSquare size={12} />
                Comments
              </label>
              {card.comments.length > 0 && (
                <div className="space-y-3 mb-3">
                  {card.comments.map(comment => {
                    const author = board.members.find(m => m.id === comment.authorId);
                    return (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold" style={{ background: author?.color }}>
                          {author?.initials}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-xs font-semibold text-slate-300">{author?.name}</span>
                            <span className="text-[11px] text-slate-600">{formatTimeAgo(comment.timestamp)}</span>
                          </div>
                          <p className="text-sm text-slate-300 bg-slate-800/40 rounded-lg px-3 py-2 border border-slate-700/30">{comment.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold" style={{ background: currentUser?.color }}>
                  {currentUser?.initials}
                </div>
                <div className="flex-1 flex gap-2">
                  <input value={newComment} onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddComment(); }}
                    placeholder="Write a comment..."
                    className="flex-1 bg-slate-800/40 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button onClick={handleAddComment} disabled={!newComment.trim()} className="px-3 py-2 bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors">
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-56 flex-shrink-0 border-l border-slate-800 overflow-y-auto p-4 space-y-5">
            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Priority</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['critical','high','medium','low'] as Priority[]).map(p => (
                  <button key={p} onClick={() => updateCard(card.id, { priority: p })}
                    style={{ background: card.priority === p ? PRIORITY_CONFIG[p].bg : '', borderColor: card.priority === p ? PRIORITY_CONFIG[p].color : 'rgba(71,85,105,0.4)', color: card.priority === p ? PRIORITY_CONFIG[p].color : '#64748b' }}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all hover:border-slate-500 capitalize">
                    {PRIORITY_CONFIG[p].icon} {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Calendar size={11} /> Due Date
              </label>
              <input type="date" value={card.dueDate ?? ''}
                onChange={e => updateCard(card.id, { dueDate: e.target.value || null })}
                className="w-full bg-slate-800/40 border border-slate-700/40 rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500 transition-colors"
              />
              {card.dueDate && (
                <button onClick={() => updateCard(card.id, { dueDate: null })} className="text-[10px] text-red-400 hover:text-red-300 mt-1">Clear date</button>
              )}
            </div>

            {/* Assignees */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <User size={11} /> Assignees
                </label>
                <button onClick={() => setShowAssigneePicker(!showAssigneePicker)} className="text-[10px] text-indigo-400">
                  {showAssigneePicker ? 'Done' : 'Edit'}
                </button>
              </div>
              {showAssigneePicker ? (
                <div className="space-y-1">
                  {board.members.map(m => (
                    <button key={m.id} onClick={() => toggleAssignee(m.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${card.assigneeIds.includes(m.id) ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-700/40'}`}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ background: m.color }}>{m.initials}</div>
                      {m.name}
                      {card.assigneeIds.includes(m.id) && <span className="ml-auto text-indigo-400">✓</span>}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {assignees.length > 0 ? assignees.map(m => (
                    <div key={m.id} className="flex items-center gap-1 px-2 py-1 bg-slate-800/60 rounded-full text-xs text-slate-300">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold" style={{ background: m.color }}>{m.initials}</div>
                      {m.name.split(' ')[0]}
                    </div>
                  )) : <button onClick={() => setShowAssigneePicker(true)} className="text-xs text-slate-600 hover:text-slate-400">+ Assign</button>}
                </div>
              )}
            </div>

            {/* Labels */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Tag size={11} /> Labels
                </label>
                <button onClick={() => setShowLabelPicker(!showLabelPicker)} className="text-[10px] text-indigo-400">
                  {showLabelPicker ? 'Done' : 'Edit'}
                </button>
              </div>
              {showLabelPicker ? (
                <div className="space-y-1">
                  {board.labels.map(l => (
                    <button key={l.id} onClick={() => toggleLabel(l.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${card.labelIds.includes(l.id) ? 'opacity-100' : 'opacity-50 hover:opacity-75'}`}
                      style={{ background: card.labelIds.includes(l.id) ? l.color + '20' : '' }}>
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                      <span style={{ color: card.labelIds.includes(l.id) ? l.color : '#94a3b8' }}>{l.name}</span>
                      {card.labelIds.includes(l.id) && <span className="ml-auto" style={{ color: l.color }}>✓</span>}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {labels.length > 0 ? labels.map(l => (
                    <span key={l.id} className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: l.color + '25', color: l.color, border: `1px solid ${l.color}40` }}>{l.name}</span>
                  )) : <button onClick={() => setShowLabelPicker(true)} className="text-xs text-slate-600 hover:text-slate-400">+ Label</button>}
                </div>
              )}
            </div>

            {/* Story Points */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Zap size={11} /> Story Points
              </label>
              <input type="number" min="0" max="100" value={card.storyPoints}
                onChange={e => updateCard(card.id, { storyPoints: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-full bg-slate-800/40 border border-slate-700/40 rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Time Tracking */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Clock size={11} /> Time Tracking
              </label>
              {card.timeSpent > 0 && (
                <p className="text-xs text-slate-400 mb-2">Logged: <span className="text-indigo-400 font-medium">{formatMinutes(card.timeSpent)}</span></p>
              )}
              {trackingTime ? (
                <div className="space-y-2">
                  <div className="text-center font-mono text-lg font-bold text-indigo-400 bg-indigo-900/20 rounded-lg py-2">
                    {formatElapsed(elapsed)}
                  </div>
                  <button onClick={stopTimeTracking} className="w-full py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-medium hover:bg-red-500/30 transition-colors">
                    Stop & Log
                  </button>
                </div>
              ) : (
                <button onClick={() => { setTrackingTime(true); setTimerStart(Date.now()); setElapsed(0); }}
                  className="w-full py-1.5 bg-slate-700/60 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors">
                  Start Timer
                </button>
              )}
            </div>

            {/* Move to */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <ArrowRight size={11} /> Move to
              </label>
              <select value={card.columnId}
                onChange={e => {
                  const newCol = board.columns.find(c => c.id === e.target.value)!;
                  const { moveCard } = useBoardStore.getState();
                  moveCard(card.id, card.columnId, e.target.value, newCol.cardIds.length);
                }}
                className="w-full bg-slate-800/40 border border-slate-700/40 rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500 transition-colors">
                {board.columns.map(col => (
                  <option key={col.id} value={col.id}>{col.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
