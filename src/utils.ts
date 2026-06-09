import type { Priority, Board, Card } from './types';

export const PRIORITY_CONFIG: Record<Priority, { color: string; bg: string; label: string; icon: string }> = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'Critical', icon: '🔴' },
  high:     { color: '#f97316', bg: 'rgba(249,115,22,0.15)', label: 'High',     icon: '🟠' },
  medium:   { color: '#eab308', bg: 'rgba(234,179,8,0.15)', label: 'Medium',   icon: '🟡' },
  low:      { color: '#4ade80', bg: 'rgba(74,222,128,0.15)', label: 'Low',      icon: '🟢' },
};

export function getPriorityColor(p: Priority) { return PRIORITY_CONFIG[p].color; }
export function getPriorityBg(p: Priority)    { return PRIORITY_CONFIG[p].bg; }
export function getPriorityLabel(p: Priority) { return PRIORITY_CONFIG[p].label; }

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  if (diff < 7) return `Due in ${diff}d`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function dueDateColor(dateStr: string | null): string {
  if (!dateStr) return 'text-slate-500';
  const diff = Math.floor((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'text-red-400';
  if (diff <= 1) return 'text-orange-400';
  if (diff <= 3) return 'text-yellow-400';
  return 'text-slate-400';
}

export function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function encodeBoard(board: Board): string {
  return btoa(encodeURIComponent(JSON.stringify(board)));
}

export function decodeBoard(encoded: string): Board | null {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded)));
  } catch {
    return null;
  }
}

export function getBoardShareUrl(board: Board): string {
  const encoded = encodeBoard(board);
  return `${window.location.origin}${window.location.pathname}?board=${encoded}`;
}

export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export function sendNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
}

export function checkDueDateNotifications(cards: Record<string, Card>) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  Object.values(cards).forEach(card => {
    if (!card.dueDate || card.isArchived) return;
    const diff = Math.floor((new Date(card.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff === 0) {
      sendNotification(`Due today: ${card.title}`, `This card is due today!`);
    } else if (diff === 1) {
      sendNotification(`Due tomorrow: ${card.title}`, `Don't forget to complete this card tomorrow.`);
    } else if (diff < 0 && diff >= -1) {
      sendNotification(`Overdue: ${card.title}`, `This card was due ${Math.abs(diff)} day(s) ago.`);
    }
  });
}

export function filterCards(cards: Record<string, Card>, columnCardIds: string[], filters: {
  search: string; priorities: string[]; assigneeIds: string[]; labelIds: string[]; showOverdue: boolean;
}): string[] {
  return columnCardIds.filter(id => {
    const card = cards[id];
    if (!card || card.isArchived) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!card.title.toLowerCase().includes(q) && !card.description.toLowerCase().includes(q)) return false;
    }
    if (filters.priorities.length > 0 && !filters.priorities.includes(card.priority)) return false;
    if (filters.assigneeIds.length > 0 && !filters.assigneeIds.some(a => card.assigneeIds.includes(a))) return false;
    if (filters.labelIds.length > 0 && !filters.labelIds.some(l => card.labelIds.includes(l))) return false;
    if (filters.showOverdue && card.dueDate) {
      const diff = Math.floor((new Date(card.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (diff >= 0) return false;
    }
    return true;
  });
}

export const PRIORITY_MATRIX: Record<Priority, { quadrant: string; action: string }> = {
  critical: { quadrant: 'Urgent & Important', action: 'Do Now' },
  high:     { quadrant: 'Important, Not Urgent', action: 'Schedule' },
  medium:   { quadrant: 'Urgent, Not Important', action: 'Delegate' },
  low:      { quadrant: 'Neither', action: 'Eliminate or Later' },
};
