export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type SidebarTab = 'timer' | 'analytics' | 'calendar' | 'team';
export type BoardView = 'kanban' | 'matrix';

export interface Member {
  id: string;
  name: string;
  initials: string;
  color: string;
  role?: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Subtask {
  id: string;
  text: string;
  done: boolean;
}

export interface Comment {
  id: string;
  authorId: string;
  text: string;
  timestamp: number;
}

export interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: number;
}

export interface Card {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  assigneeIds: string[];
  labelIds: string[];
  dueDate: string | null;
  subtasks: Subtask[];
  comments: Comment[];
  voiceNotes: string[];
  activities: Activity[];
  storyPoints: number;
  columnId: string;
  createdAt: number;
  timeSpent: number; // minutes
  isArchived: boolean;
}

export interface Column {
  id: string;
  title: string;
  cardIds: string[];
  wipLimit: number | null;
  color: string;
  order: number;
}

export interface Board {
  id: string;
  title: string;
  description: string;
  columns: Column[];
  cards: Record<string, Card>;
  members: Member[];
  labels: Label[];
  currentUserId: string;
  createdAt: number;
}

export interface FilterState {
  search: string;
  priorities: Priority[];
  assigneeIds: string[];
  labelIds: string[];
  showOverdue: boolean;
}
