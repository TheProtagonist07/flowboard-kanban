import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Board, Card, Column, FilterState, Activity } from './types';

const COLORS = ['#7c3aed','#3b82f6','#10b981','#f97316','#ef4444','#ec4899','#06b6d4','#84cc16'];

const DEFAULT_LABELS = [
  { id: 'l1', name: 'Bug', color: '#ef4444' },
  { id: 'l2', name: 'Feature', color: '#3b82f6' },
  { id: 'l3', name: 'Design', color: '#8b5cf6' },
  { id: 'l4', name: 'Docs', color: '#10b981' },
  { id: 'l5', name: 'Research', color: '#f59e0b' },
  { id: 'l6', name: 'DevOps', color: '#06b6d4' },
];

const makeCard = (partial: Partial<Card> & { id: string; title: string; columnId: string }): Card => ({
  description: '',
  priority: 'medium',
  assigneeIds: [],
  labelIds: [],
  dueDate: null,
  subtasks: [],
  comments: [],
  voiceNotes: [],
  activities: [],
  storyPoints: 0,
  createdAt: Date.now(),
  timeSpent: 0,
  isArchived: false,
  ...partial,
});

function createDefaultBoard(): Board {
  const cards: Record<string, Card> = {};
  const c1 = makeCard({ id: 'c1', title: 'Design new onboarding flow', columnId: 'col1', priority: 'high', assigneeIds: ['m1','m3'], labelIds: ['l2','l3'], dueDate: fmtDate(3), storyPoints: 8, subtasks: [{ id: 's1', text: 'Research competitor flows', done: true }, { id: 's2', text: 'Create wireframes', done: false }, { id: 's3', text: 'User testing', done: false }], description: 'Redesign the user onboarding experience to improve activation rates. Focus on mobile-first approach.', voiceNotes: [], activities: [], comments: [], createdAt: Date.now(), timeSpent: 0, isArchived: false });
  const c2 = makeCard({ id: 'c2', title: 'Fix authentication bug on mobile', columnId: 'col2', priority: 'critical', assigneeIds: ['m2'], labelIds: ['l1'], dueDate: fmtDate(1), storyPoints: 5, description: 'Users are getting logged out unexpectedly on iOS 17+ when app goes to background.', subtasks: [{ id: 's4', text: 'Reproduce bug', done: true }, { id: 's5', text: 'Root cause analysis', done: true }, { id: 's6', text: 'Implement fix', done: false }], voiceNotes: [], activities: [], comments: [], createdAt: Date.now(), timeSpent: 45, isArchived: false });
  const c3 = makeCard({ id: 'c3', title: 'Update API documentation', columnId: 'col1', priority: 'medium', assigneeIds: ['m4'], labelIds: ['l4'], dueDate: fmtDate(7), storyPoints: 3, description: 'Update all v2 endpoint docs with request/response examples.', subtasks: [{ id: 's7', text: 'Audit existing docs', done: false }, { id: 's8', text: 'Write new endpoints', done: false }], voiceNotes: [], activities: [], comments: [], createdAt: Date.now(), timeSpent: 0, isArchived: false });
  const c4 = makeCard({ id: 'c4', title: 'Performance audit - lighthouse score', columnId: 'col2', priority: 'high', assigneeIds: ['m1'], labelIds: ['l2'], dueDate: fmtDate(5), storyPoints: 5, description: 'Improve Lighthouse score from 72 to 90+. Focus on LCP and CLS metrics.', subtasks: [], voiceNotes: [], activities: [], comments: [], createdAt: Date.now(), timeSpent: 20, isArchived: false });
  const c5 = makeCard({ id: 'c5', title: 'Competitor analysis report', columnId: 'col1', priority: 'low', assigneeIds: ['m3','m4'], labelIds: ['l5'], dueDate: fmtDate(14), storyPoints: 3, description: 'Comprehensive competitive analysis of top 5 competitors for Q3 planning.', subtasks: [], voiceNotes: [], activities: [], comments: [], createdAt: Date.now(), timeSpent: 0, isArchived: false });
  const c6 = makeCard({ id: 'c6', title: 'Set up CI/CD pipeline', columnId: 'col3', priority: 'high', assigneeIds: ['m2'], labelIds: ['l6'], dueDate: fmtDate(2), storyPoints: 8, description: 'Configure GitHub Actions for automated testing and deployment.', subtasks: [{ id: 's9', text: 'Write test suite', done: true }, { id: 's10', text: 'Configure GH Actions', done: true }, { id: 's11', text: 'Set up staging deploy', done: false }], voiceNotes: [], activities: [], comments: [], createdAt: Date.now(), timeSpent: 120, isArchived: false });
  const c7 = makeCard({ id: 'c7', title: 'User interview sessions', columnId: 'col4', priority: 'medium', assigneeIds: ['m3'], labelIds: ['l5'], dueDate: fmtDate(-2), storyPoints: 3, description: 'Completed 8 user interviews for Q2 research sprint.', subtasks: [], voiceNotes: [], activities: [], comments: [], createdAt: Date.now(), timeSpent: 180, isArchived: false });

  [c1, c2, c3, c4, c5, c6, c7].forEach(c => { cards[c.id] = c; });

  return {
    id: nanoid(10),
    title: 'Product Roadmap',
    description: 'Q3 2026 · Team velocity and delivery tracking',
    columns: [
      { id: 'col1', title: 'Backlog', cardIds: ['c1','c3','c5'], wipLimit: null, color: '#64748b', order: 0 },
      { id: 'col2', title: 'In Progress', cardIds: ['c2','c4'], wipLimit: 3, color: '#3b82f6', order: 1 },
      { id: 'col3', title: 'Review', cardIds: ['c6'], wipLimit: 2, color: '#f59e0b', order: 2 },
      { id: 'col4', title: 'Done', cardIds: ['c7'], wipLimit: null, color: '#22c55e', order: 3 },
    ],
    cards,
    members: [
      { id: 'm1', name: 'Alice Chen', initials: 'AC', color: '#7c3aed', role: 'Product' },
      { id: 'm2', name: 'Bob Smith', initials: 'BS', color: '#3b82f6', role: 'Engineering' },
      { id: 'm3', name: 'Carol Davis', initials: 'CD', color: '#10b981', role: 'Design' },
      { id: 'm4', name: 'David Park', initials: 'DP', color: '#f97316', role: 'Engineering' },
    ],
    labels: DEFAULT_LABELS,
    currentUserId: 'm1',
    createdAt: Date.now(),
  };
}

function fmtDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

export type Theme = 'midnight' | 'light' | 'contrast' | 'hacker' | 'dracula' | 'nord' | 'monokai' | 'sunset';

interface BoardStore {
  board: Board;
  filters: FilterState;
  selectedCardId: string | null;
  sidebarOpen: boolean;
  focusMode: boolean;
  activeTab: 'timer' | 'analytics' | 'calendar' | 'team';
  theme: Theme;
  // Actions
  addCard: (columnId: string, title: string) => void;
  updateCard: (id: string, updates: Partial<Card>) => void;
  deleteCard: (id: string) => void;
  moveCard: (cardId: string, fromCol: string, toCol: string, index: number) => void;
  archiveCard: (id: string) => void;
  addColumn: (title: string) => void;
  updateColumn: (id: string, updates: Partial<Column>) => void;
  deleteColumn: (id: string) => void;
  reorderColumns: (fromIndex: number, toIndex: number) => void;
  addMember: (name: string, role?: string) => void;
  removeMember: (id: string) => void;
  updateBoard: (updates: Partial<Board>) => void;
  importBoard: (board: Board) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  clearFilters: () => void;
  selectCard: (id: string | null) => void;
  toggleSidebar: () => void;
  toggleFocusMode: () => void;
  setActiveTab: (tab: 'timer' | 'analytics' | 'calendar' | 'team') => void;
  toggleSubtask: (cardId: string, subtaskId: string) => void;
  addSubtask: (cardId: string, text: string) => void;
  deleteSubtask: (cardId: string, subtaskId: string) => void;
  addComment: (cardId: string, text: string) => void;
  addVoiceNote: (cardId: string, text: string) => void;
  logActivity: (cardId: string, activity: Omit<Activity, 'id'>) => void;
  addLabel: (name: string, color: string) => void;
  setCurrentUser: (id: string) => void;
  setTheme: (theme: Theme) => void;
}

const DEFAULT_FILTERS: FilterState = {
  search: '',
  priorities: [],
  assigneeIds: [],
  labelIds: [],
  showOverdue: false,
};

export const useBoardStore = create<BoardStore>()(
  persist(
    (set, get) => ({
      board: createDefaultBoard(),
      filters: DEFAULT_FILTERS,
      selectedCardId: null,
      sidebarOpen: true,
      focusMode: false,
      activeTab: 'timer',
      theme: 'midnight' as Theme,

      addCard: (columnId, title) => {
        const id = `c${nanoid(8)}`;
        const card = makeCard({ id, title, columnId });
        set(s => ({
          board: {
            ...s.board,
            cards: { ...s.board.cards, [id]: card },
            columns: s.board.columns.map(col =>
              col.id === columnId ? { ...col, cardIds: [...col.cardIds, id] } : col
            ),
          },
        }));
      },

      updateCard: (id, updates) => {
        set(s => ({
          board: {
            ...s.board,
            cards: { ...s.board.cards, [id]: { ...s.board.cards[id], ...updates } },
          },
        }));
      },

      deleteCard: (id) => {
        const { board } = get();
        const newCards = { ...board.cards };
        delete newCards[id];
        set(s => ({
          board: {
            ...s.board,
            cards: newCards,
            columns: s.board.columns.map(col => ({ ...col, cardIds: col.cardIds.filter(c => c !== id) })),
          },
          selectedCardId: s.selectedCardId === id ? null : s.selectedCardId,
        }));
      },

      moveCard: (cardId, fromCol, toCol, index) => {
        set(s => {
          const from = s.board.columns.find(c => c.id === fromCol)!;
          const to = s.board.columns.find(c => c.id === toCol)!;
          const newFromIds = from.cardIds.filter(id => id !== cardId);
          let newToIds: string[];
          if (fromCol === toCol) {
            newToIds = [...newFromIds];
            newToIds.splice(index, 0, cardId);
          } else {
            newToIds = [...to.cardIds];
            newToIds.splice(index, 0, cardId);
          }
          return {
            board: {
              ...s.board,
              cards: { ...s.board.cards, [cardId]: { ...s.board.cards[cardId], columnId: toCol } },
              columns: s.board.columns.map(col => {
                if (col.id === fromCol) return { ...col, cardIds: newFromIds };
                if (col.id === toCol) return { ...col, cardIds: newToIds };
                return col;
              }),
            },
          };
        });
      },

      archiveCard: (id) => {
        set(s => ({
          board: {
            ...s.board,
            cards: { ...s.board.cards, [id]: { ...s.board.cards[id], isArchived: true } },
            columns: s.board.columns.map(col => ({ ...col, cardIds: col.cardIds.filter(c => c !== id) })),
          },
        }));
      },

      addColumn: (title) => {
        const id = `col${nanoid(8)}`;
        const order = get().board.columns.length;
        set(s => ({
          board: {
            ...s.board,
            columns: [...s.board.columns, { id, title, cardIds: [], wipLimit: null, color: COLORS[order % COLORS.length], order }],
          },
        }));
      },

      updateColumn: (id, updates) => {
        set(s => ({
          board: {
            ...s.board,
            columns: s.board.columns.map(col => col.id === id ? { ...col, ...updates } : col),
          },
        }));
      },

      deleteColumn: (id) => {
        const col = get().board.columns.find(c => c.id === id);
        if (!col) return;
        const newCards = { ...get().board.cards };
        col.cardIds.forEach(cid => delete newCards[cid]);
        set(s => ({
          board: {
            ...s.board,
            cards: newCards,
            columns: s.board.columns.filter(c => c.id !== id),
          },
        }));
      },

      reorderColumns: (fromIndex, toIndex) => {
        set(s => {
          const cols = [...s.board.columns];
          const [moved] = cols.splice(fromIndex, 1);
          cols.splice(toIndex, 0, moved);
          return { board: { ...s.board, columns: cols.map((c, i) => ({ ...c, order: i })) } };
        });
      },

      addMember: (name, role) => {
        const id = `m${nanoid(8)}`;
        const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        set(s => ({
          board: { ...s.board, members: [...s.board.members, { id, name, initials, color, role }] },
        }));
      },

      removeMember: (id) => {
        set(s => ({
          board: {
            ...s.board,
            members: s.board.members.filter(m => m.id !== id),
            cards: Object.fromEntries(
              Object.entries(s.board.cards).map(([k, v]) => [k, { ...v, assigneeIds: v.assigneeIds.filter(a => a !== id) }])
            ),
          },
        }));
      },

      updateBoard: (updates) => set(s => ({ board: { ...s.board, ...updates } })),

      importBoard: (board) => set({ board, selectedCardId: null }),

      setFilters: (filters) => set(s => ({ filters: { ...s.filters, ...filters } })),

      clearFilters: () => set({ filters: DEFAULT_FILTERS }),

      selectCard: (id) => set({ selectedCardId: id }),

      toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

      toggleFocusMode: () => set(s => ({ focusMode: !s.focusMode })),

      setActiveTab: (tab) => set({ activeTab: tab }),

      toggleSubtask: (cardId, subtaskId) => {
        set(s => ({
          board: {
            ...s.board,
            cards: {
              ...s.board.cards,
              [cardId]: {
                ...s.board.cards[cardId],
                subtasks: s.board.cards[cardId].subtasks.map(st =>
                  st.id === subtaskId ? { ...st, done: !st.done } : st
                ),
              },
            },
          },
        }));
      },

      addSubtask: (cardId, text) => {
        const id = nanoid(8);
        set(s => ({
          board: {
            ...s.board,
            cards: {
              ...s.board.cards,
              [cardId]: {
                ...s.board.cards[cardId],
                subtasks: [...s.board.cards[cardId].subtasks, { id, text, done: false }],
              },
            },
          },
        }));
      },

      deleteSubtask: (cardId, subtaskId) => {
        set(s => ({
          board: {
            ...s.board,
            cards: {
              ...s.board.cards,
              [cardId]: {
                ...s.board.cards[cardId],
                subtasks: s.board.cards[cardId].subtasks.filter(st => st.id !== subtaskId),
              },
            },
          },
        }));
      },

      addComment: (cardId, text) => {
        const { board } = get();
        const id = nanoid(8);
        set(s => ({
          board: {
            ...s.board,
            cards: {
              ...s.board.cards,
              [cardId]: {
                ...s.board.cards[cardId],
                comments: [...s.board.cards[cardId].comments, { id, authorId: board.currentUserId, text, timestamp: Date.now() }],
              },
            },
          },
        }));
      },

      addVoiceNote: (cardId, text) => {
        set(s => ({
          board: {
            ...s.board,
            cards: {
              ...s.board.cards,
              [cardId]: {
                ...s.board.cards[cardId],
                voiceNotes: [...s.board.cards[cardId].voiceNotes, text],
              },
            },
          },
        }));
      },

      logActivity: (cardId, activity) => {
        const id = nanoid(8);
        set(s => ({
          board: {
            ...s.board,
            cards: {
              ...s.board.cards,
              [cardId]: {
                ...s.board.cards[cardId],
                activities: [{ ...activity, id }, ...s.board.cards[cardId].activities].slice(0, 20),
              },
            },
          },
        }));
      },

      addLabel: (name, color) => {
        const id = `l${nanoid(8)}`;
        set(s => ({ board: { ...s.board, labels: [...s.board.labels, { id, name, color }] } }));
      },

      setCurrentUser: (id) => set(s => ({ board: { ...s.board, currentUserId: id } })),

      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      },
    }),
    { name: 'kanban-v2' }
  )
);
