import { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, AlertTriangle, Pencil, Trash2, Settings2, Check, X, ChevronLeft, Zap } from 'lucide-react';
import { useBoardStore } from '../store';
import { filterCards } from '../utils';
import KanbanCard from './KanbanCard';
import type { Column as ColumnType } from '../types';

interface Props { column: ColumnType; colIndex: number; }

export default function Column({ column, colIndex }: Props) {
  const { board, filters, addCard, updateColumn, deleteColumn } = useBoardStore();
  const [addingCard, setAddingCard] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(column.title);
  const [showMenu, setShowMenu] = useState(false);
  const [editingWip, setEditingWip] = useState(false);
  const [wipVal, setWipVal] = useState(String(column.wipLimit ?? ''));
  const [collapsed, setCollapsed] = useState(false);

  const cardIds = filterCards(board.cards, column.cardIds, filters);
  const allCardIds = column.cardIds.filter(id => !board.cards[id]?.isArchived);
  const isWipExceeded = column.wipLimit !== null && allCardIds.length > column.wipLimit;
  const totalSP = allCardIds.reduce((sum, id) => sum + (board.cards[id]?.storyPoints || 0), 0);

  function handleAddCard() {
    if (newTitle.trim()) {
      addCard(column.id, newTitle.trim());
      setNewTitle('');
    }
    setAddingCard(false);
  }

  function handleTitleSave() {
    if (titleVal.trim()) updateColumn(column.id, { title: titleVal.trim() });
    setEditingTitle(false);
  }

  function handleWipSave() {
    const n = parseInt(wipVal);
    updateColumn(column.id, { wipLimit: isNaN(n) || n <= 0 ? null : n });
    setEditingWip(false);
  }

  const COLUMN_COLORS = ['#64748b','#3b82f6','#f59e0b','#22c55e','#8b5cf6','#ef4444','#ec4899','#06b6d4'];

  return (
    <Draggable draggableId={column.id} index={colIndex}>
      {(colProvided, colSnapshot) => (
        <div
          ref={colProvided.innerRef}
          {...colProvided.draggableProps}
          className={`flex-shrink-0 flex flex-col rounded-2xl transition-all duration-200 ${colSnapshot.isDragging ? 'shadow-2xl shadow-black/50 rotate-1' : ''} ${collapsed ? 'w-12' : 'w-72'}`}
          style={{ background: 'rgba(15,23,42,0.6)', border: `1px solid ${isWipExceeded ? 'rgba(239,68,68,0.5)' : 'rgba(71,85,105,0.3)'}`, ...colProvided.draggableProps.style }}
        >
          {/* Collapsed view */}
          {collapsed ? (
            <div {...colProvided.dragHandleProps}
              className="flex-1 flex flex-col items-center py-4 gap-3 cursor-pointer select-none"
              onClick={() => setCollapsed(false)}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: column.color }} />
              <span className="text-xs font-semibold text-slate-400 writing-mode-vertical" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}>
                {column.title}
              </span>
              <span className="text-[10px] text-slate-600">{allCardIds.length}</span>
              <ChevronLeft size={12} className="text-slate-600 rotate-180" />
            </div>
          ) : (<>
          {/* Column Header */}
          <div {...colProvided.dragHandleProps} className="p-3 flex items-center gap-2 flex-shrink-0 select-none">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: column.color, boxShadow: `0 0 8px ${column.color}80` }} />

            {editingTitle ? (
              <input autoFocus value={titleVal} onChange={e => setTitleVal(e.target.value)}
                onBlur={handleTitleSave} onKeyDown={e => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setEditingTitle(false); }}
                className="flex-1 bg-slate-700 rounded px-2 py-0.5 text-sm font-semibold text-white outline-none border border-indigo-500"
              />
            ) : (
              <span className="flex-1 text-sm font-semibold text-slate-100 truncate">{column.title}</span>
            )}

            {/* Card count / WIP */}
            <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${isWipExceeded ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-700/60 text-slate-400'}`}>
              {isWipExceeded && <AlertTriangle size={10} />}
              {allCardIds.length}{column.wipLimit ? `/${column.wipLimit}` : ''}
            </div>

            {/* Collapse */}
            <button onClick={() => setCollapsed(true)} className="p-1 rounded hover:bg-slate-700/60 text-slate-600 hover:text-slate-300 transition-colors tooltip" data-tip="Collapse">
              <ChevronLeft size={13} />
            </button>

            {/* Menu */}
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="p-1 rounded hover:bg-slate-700/60 text-slate-500 hover:text-slate-300 transition-colors">
                <Settings2 size={13} />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-52 glass-card shadow-xl p-1.5 z-50 animate-slide-up">
                  <button onClick={() => { setEditingTitle(true); setTitleVal(column.title); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/60 rounded-lg">
                    <Pencil size={13} /> Edit title
                  </button>
                  <div className="px-3 py-2">
                    <p className="text-xs text-slate-500 mb-1">WIP Limit</p>
                    {editingWip ? (
                      <div className="flex gap-1">
                        <input value={wipVal} onChange={e => setWipVal(e.target.value)} placeholder="No limit" className="flex-1 bg-slate-700 rounded px-2 py-1 text-xs text-white outline-none border border-indigo-500" />
                        <button onClick={handleWipSave} className="p-1 bg-indigo-600 rounded text-white"><Check size={12} /></button>
                        <button onClick={() => setEditingWip(false)} className="p-1 bg-slate-700 rounded text-slate-300"><X size={12} /></button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingWip(true); setWipVal(String(column.wipLimit ?? '')); }} className="text-xs text-indigo-400 hover:text-indigo-300">
                        {column.wipLimit ? `${column.wipLimit} cards max` : 'Set limit'}
                      </button>
                    )}
                  </div>
                  <div className="px-3 py-1">
                    <p className="text-xs text-slate-500 mb-1">Color</p>
                    <div className="flex gap-1 flex-wrap">
                      {COLUMN_COLORS.map(c => (
                        <button key={c} onClick={() => updateColumn(column.id, { color: c })}
                          className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${column.color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900' : ''}`}
                          style={{ background: c }} />
                      ))}
                    </div>
                  </div>
                  <hr className="border-slate-700 my-1" />
                  <button onClick={() => { if (confirm(`Delete "${column.title}" and all its cards?`)) { deleteColumn(column.id); } setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg">
                    <Trash2 size={13} /> Delete column
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Story points total */}
          {totalSP > 0 && (
            <div className="px-3 pb-1 flex items-center gap-1">
              <Zap size={10} className="text-yellow-500" />
              <span className="text-[10px] text-slate-600">{totalSP} story points</span>
            </div>
          )}

          {/* WIP warning */}
          {isWipExceeded && (
            <div className="mx-3 mb-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-center gap-2">
              <AlertTriangle size={11} />
              WIP limit exceeded! Focus on completing existing work.
            </div>
          )}

          {/* Cards droppable area */}
          <Droppable droppableId={column.id} type="CARD">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`flex-1 overflow-y-auto px-3 transition-all duration-200 min-h-[80px] ${snapshot.isDraggingOver ? 'bg-indigo-500/5 rounded-xl' : ''}`}
                style={{ maxHeight: 'calc(100vh - 220px)' }}
              >
                {cardIds.map((cardId, idx) => {
                  const card = board.cards[cardId];
                  if (!card) return null;
                  return <KanbanCard key={cardId} card={card} index={idx} />;
                })}
                {provided.placeholder}

                {cardIds.length === 0 && !snapshot.isDraggingOver && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-10 h-10 rounded-full bg-slate-800/60 flex items-center justify-center mb-2">
                      <Plus size={18} className="text-slate-600" />
                    </div>
                    <p className="text-xs text-slate-600">Drop cards here</p>
                  </div>
                )}
              </div>
            )}
          </Droppable>

          {/* Add card */}
          <div className="p-3 pt-2 flex-shrink-0">
            {addingCard ? (
              <div className="animate-slide-up">
                <textarea
                  autoFocus
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddCard(); }
                    if (e.key === 'Escape') { setAddingCard(false); setNewTitle(''); }
                  }}
                  placeholder="Card title..."
                  rows={2}
                  className="w-full bg-slate-800 border border-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none resize-none"
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={handleAddCard} className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors">
                    Add Card
                  </button>
                  <button onClick={() => { setAddingCard(false); setNewTitle(''); }} className="px-3 py-1.5 bg-slate-700/60 hover:bg-slate-700 text-slate-400 text-xs rounded-lg transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingCard(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/40 text-sm transition-all"
              >
                <Plus size={14} />
                Add card
              </button>
            )}
          </div>
          </>)}
        </div>
      )}
    </Draggable>
  );
}
