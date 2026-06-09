import { useState } from 'react';
import { DragDropContext, Droppable, type DropResult } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import { useBoardStore } from '../store';
import Column from './Column';

export default function Board() {
  const { board, moveCard, reorderColumns, addColumn } = useBoardStore();
  const [addingColumn, setAddingColumn] = useState(false);
  const [colTitle, setColTitle] = useState('');

  function onDragEnd(result: DropResult) {
    const { source, destination, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'COLUMN') {
      reorderColumns(source.index, destination.index);
    } else {
      moveCard(result.draggableId, source.droppableId, destination.droppableId, destination.index);
    }
  }

  function handleAddColumn() {
    if (colTitle.trim()) {
      addColumn(colTitle.trim());
      setColTitle('');
    }
    setAddingColumn(false);
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="board" direction="horizontal" type="COLUMN">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex gap-4 h-full px-4 py-4 overflow-x-auto pb-4"
            style={{ alignItems: 'flex-start' }}
          >
            {board.columns.map((col, idx) => (
              <Column key={col.id} column={col} colIndex={idx} />
            ))}
            {provided.placeholder}

            {/* Add Column */}
            <div className="flex-shrink-0 w-72">
              {addingColumn ? (
                <div className="rounded-2xl p-3 animate-slide-up" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.4)' }}>
                  <input
                    autoFocus
                    value={colTitle}
                    onChange={e => setColTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddColumn();
                      if (e.key === 'Escape') { setAddingColumn(false); setColTitle(''); }
                    }}
                    placeholder="Column name..."
                    className="w-full bg-slate-800 border border-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none mb-2"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleAddColumn} className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors">
                      Add Column
                    </button>
                    <button onClick={() => { setAddingColumn(false); setColTitle(''); }} className="px-3 py-1.5 bg-slate-700/60 text-slate-400 text-xs rounded-lg">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingColumn(true)}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl text-slate-500 hover:text-slate-300 transition-all"
                  style={{ background: 'rgba(15,23,42,0.3)', border: '2px dashed rgba(71,85,105,0.4)' }}
                >
                  <Plus size={16} />
                  <span className="text-sm font-medium">Add column</span>
                </button>
              )}
            </div>
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
