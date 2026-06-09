import { Timer, BarChart3, Calendar, Users2 } from 'lucide-react';
import { useBoardStore } from '../store';
import PomodoroTimer from './PomodoroTimer';
import Analytics from './Analytics';
import CalendarView from './CalendarView';
import TeamView from './TeamView';

const TABS = [
  { id: 'timer'     as const, label: 'Timer',     icon: Timer },
  { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
  { id: 'calendar'  as const, label: 'Calendar',  icon: Calendar },
  { id: 'team'      as const, label: 'Team',      icon: Users2 },
];

export default function Sidebar() {
  const { sidebarOpen, activeTab, setActiveTab } = useBoardStore();

  if (!sidebarOpen) return null;

  return (
    <aside className="w-72 flex-shrink-0 flex flex-col animate-slide-in-right"
      style={{ background: 'var(--bg-sidebar)', backdropFilter: 'blur(12px)', borderLeft: '1px solid var(--border-subtle)' }}>
      {/* Tabs */}
      <div className="flex flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex flex-col items-center gap-0.5 py-3 text-[10px] font-medium transition-all border-b-2"
              style={{ borderColor: active ? 'var(--accent)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-4)' }}>
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'timer'     && <PomodoroTimer />}
        {activeTab === 'analytics' && <Analytics />}
        {activeTab === 'calendar'  && <CalendarView />}
        {activeTab === 'team'      && <TeamView />}
      </div>
    </aside>
  );
}
