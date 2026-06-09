import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Coffee, Brain, Target } from 'lucide-react';
import { useBoardStore } from '../store';

const MODES = {
  work:       { label: 'Focus',       duration: 25 * 60, color: '#818cf8', icon: Brain },
  short:      { label: 'Short Break', duration: 5  * 60, color: '#34d399', icon: Coffee },
  long:       { label: 'Long Break',  duration: 15 * 60, color: '#60a5fa', icon: Coffee },
};

type Mode = keyof typeof MODES;

export default function PomodoroTimer() {
  const [mode, setMode] = useState<Mode>('work');
  const [timeLeft, setTimeLeft] = useState(MODES.work.duration);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [customWork, setCustomWork] = useState(25);
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);
  const { toggleFocusMode, focusMode } = useBoardStore();

  const cfg = MODES[mode];
  const total = mode === 'work' ? customWork * 60 : cfg.duration;
  const progress = 1 - timeLeft / total;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            setRunning(false);
            if (mode === 'work') {
              setSessions(s => s + 1);
              playBeep();
              setMode('short');
              return MODES.short.duration;
            } else {
              playBeep();
              setMode('work');
              return customWork * 60;
            }
          }
          return t - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, mode, customWork]);

  function playBeep() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch {}
  }

  function switchMode(m: Mode) {
    setMode(m);
    setRunning(false);
    setTimeLeft(m === 'work' ? customWork * 60 : MODES[m].duration);
  }

  function reset() {
    setRunning(false);
    setTimeLeft(mode === 'work' ? customWork * 60 : cfg.duration);
  }

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');

  return (
    <div className="flex flex-col items-center">
      {/* Mode tabs */}
      <div className="flex gap-1 mb-4 bg-slate-900/60 rounded-xl p-1 w-full">
        {(Object.keys(MODES) as Mode[]).map(m => (
          <button key={m} onClick={() => switchMode(m)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${mode === m ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            style={{ background: mode === m ? MODES[m].color + '30' : '', color: mode === m ? MODES[m].color : '' }}>
            {MODES[m].label}
          </button>
        ))}
      </div>

      {/* Circular timer */}
      <div className="relative w-36 h-36 mb-4">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(30,41,59,0.8)" strokeWidth="8" />
          <circle cx="60" cy="60" r={radius} fill="none" stroke={cfg.color} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s linear' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold font-mono text-white tracking-tight">{mins}:{secs}</span>
          <span className="text-xs font-medium mt-0.5" style={{ color: cfg.color }}>{cfg.label}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={reset} className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-white transition-all">
          <RotateCcw size={15} />
        </button>
        <button onClick={() => setRunning(!running)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm text-white transition-all shadow-lg"
          style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)`, boxShadow: `0 4px 15px ${cfg.color}40` }}>
          {running ? <Pause size={15} /> : <Play size={15} />}
          {running ? 'Pause' : 'Start'}
        </button>
        <button onClick={toggleFocusMode}
          className={`p-2.5 rounded-xl transition-all ${focusMode ? 'bg-indigo-600/30 text-indigo-400' : 'bg-slate-800/60 text-slate-400 hover:text-white'}`}
          title="Focus mode">
          <Target size={15} />
        </button>
      </div>

      {/* Session counter */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${i < sessions % 4 ? 'bg-indigo-400' : 'bg-slate-700'}`} />
          ))}
        </div>
        <span className="text-xs text-slate-500">{sessions} session{sessions !== 1 ? 's' : ''} today</span>
      </div>

      {/* Custom duration */}
      <div className="w-full">
        <button onClick={() => setShowSettings(!showSettings)} className="text-xs text-slate-600 hover:text-slate-400 transition-colors w-full text-center">
          {showSettings ? '▲ Hide settings' : '▼ Settings'}
        </button>
        {showSettings && (
          <div className="mt-3 animate-slide-up bg-slate-800/40 rounded-xl p-3">
            <label className="text-xs text-slate-400 block mb-2">Work duration (minutes)</label>
            <div className="flex gap-2">
              {[15, 25, 45, 60].map(n => (
                <button key={n} onClick={() => { setCustomWork(n); if (mode === 'work') setTimeLeft(n * 60); }}
                  className={`flex-1 py-1 rounded-lg text-xs font-medium transition-all ${customWork === n ? 'bg-indigo-600 text-white' : 'bg-slate-700/60 text-slate-400 hover:bg-slate-700'}`}>
                  {n}m
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
