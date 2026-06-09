import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { MessageSquare, Mic, Calendar, CheckSquare, Zap, Clock } from 'lucide-react';
import { useBoardStore } from '../store';
import { PRIORITY_CONFIG, formatDate, dueDateColor, formatMinutes } from '../utils';
import type { Card } from '../types';

interface Props { card: Card; index: number; }

export default function KanbanCard({ card, index }: Props) {
  const { board, selectCard } = useBoardStore();
  const [hovered, setHovered] = useState(false);
  const cfg = PRIORITY_CONFIG[card.priority];
  const assignees = board.members.filter(m => card.assigneeIds.includes(m.id));
  const labels = board.labels.filter(l => card.labelIds.includes(l.id));
  const doneSubtasks = card.subtasks.filter(s => s.done).length;
  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date();

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => selectCard(card.id)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={`group relative rounded-xl cursor-pointer transition-all duration-200 mb-2 overflow-hidden
            ${snapshot.isDragging ? 'shadow-2xl shadow-black/50 rotate-1 scale-[1.02] opacity-90' : 'hover:shadow-lg hover:shadow-black/30'}`}
          style={{
            background: snapshot.isDragging ? 'rgba(30,41,59,0.98)' : hovered ? 'rgba(30,41,59,0.95)' : 'rgba(15,23,42,0.9)',
            border: `1px solid ${hovered || snapshot.isDragging ? 'rgba(99,102,241,0.4)' : 'rgba(71,85,105,0.35)'}`,
            transform: snapshot.isDragging ? provided.draggableProps.style?.transform + ' rotate(2deg)' : provided.draggableProps.style?.transform,
          }}
        >
          {/* Priority bar */}
          <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl" style={{ background: cfg.color }} />

          <div className="p-3 pl-4">
            {/* Labels */}
            {labels.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {labels.map(label => (
                  <span key={label.id} className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: label.color + '25', color: label.color, border: `1px solid ${label.color}40` }}>
                    {label.name}
                  </span>
                ))}
              </div>
            )}

            {/* Title */}
            <h3 className="text-sm font-medium text-slate-100 leading-snug mb-2 group-hover:text-white transition-colors">
              {card.title}
            </h3>

            {/* Meta row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Due date */}
                {card.dueDate && (
                  <span className={`flex items-center gap-1 text-[11px] font-medium ${dueDateColor(card.dueDate)} ${isOverdue ? 'animate-pulse-slow' : ''}`}>
                    <Calendar size={10} />
                    {formatDate(card.dueDate)}
                  </span>
                )}

                {/* Story points */}
                {card.storyPoints > 0 && (
                  <span className="flex items-center gap-0.5 text-[11px] text-slate-500 bg-slate-700/40 px-1.5 py-0.5 rounded-md">
                    <Zap size={9} className="text-yellow-500" />
                    {card.storyPoints}
                  </span>
                )}

                {/* Time */}
                {card.timeSpent > 0 && (
                  <span className="flex items-center gap-0.5 text-[11px] text-slate-500">
                    <Clock size={9} />
                    {formatMinutes(card.timeSpent)}
                  </span>
                )}

                {/* Comments */}
                {card.comments.length > 0 && (
                  <span className="flex items-center gap-0.5 text-[11px] text-slate-500">
                    <MessageSquare size={10} />
                    {card.comments.length}
                  </span>
                )}

                {/* Voice notes */}
                {card.voiceNotes.length > 0 && (
                  <span className="flex items-center gap-0.5 text-[11px] text-slate-500">
                    <Mic size={10} />
                    {card.voiceNotes.length}
                  </span>
                )}
              </div>

              {/* Assignees */}
              {assignees.length > 0 && (
                <div className="flex -space-x-1 flex-shrink-0">
                  {assignees.slice(0, 3).map(m => (
                    <div key={m.id}
                      style={{ background: m.color, border: '1.5px solid rgba(2,6,23,0.9)' }}
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold" title={m.name}>
                      {m.initials}
                    </div>
                  ))}
                  {assignees.length > 3 && (
                    <div className="w-5 h-5 rounded-full bg-slate-700 border-[1.5px] border-slate-950 flex items-center justify-center text-slate-300 text-[8px]">
                      +{assignees.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Subtask progress */}
            {card.subtasks.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1 text-[10px] text-slate-500">
                    <CheckSquare size={9} />
                    {doneSubtasks}/{card.subtasks.length}
                  </span>
                  <span className="text-[10px] text-slate-500">{Math.round((doneSubtasks / card.subtasks.length) * 100)}%</span>
                </div>
                <div className="h-1 rounded-full bg-slate-700/60 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(doneSubtasks / card.subtasks.length) * 100}%`, background: cfg.color }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
