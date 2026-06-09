import { useState, useRef, useCallback } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';

interface Props {
  onTranscript: (text: string) => void;
  compact?: boolean;
}

export default function VoiceInput({ onTranscript, compact = false }: Props) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser. Use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setListening(true);
      setError('');
      setTranscript('');
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      setTranscript(final || interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') setError('Microphone access denied. Please allow it in browser settings.');
      else if (event.error === 'no-speech') setError('No speech detected. Try again.');
      else setError('Error: ' + event.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  function handleSave() {
    if (transcript.trim()) {
      onTranscript(transcript.trim());
      setTranscript('');
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={listening ? stopListening : startListening}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            listening
              ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse-slow'
              : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700 border border-slate-600/40'
          }`}
        >
          {listening ? <Square size={11} /> : <Mic size={11} />}
          {listening ? 'Stop' : 'Voice note'}
        </button>
        {transcript && (
          <button onClick={handleSave} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors">
            Save note
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-slate-800/40 border border-slate-700/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Mic size={14} className="text-indigo-400" />
          Voice Notes
        </span>
        <button
          onClick={listening ? stopListening : startListening}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            listening
              ? 'bg-red-500 text-white shadow-lg shadow-red-900/30'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
        >
          {listening ? (
            <><Square size={11} /> Stop recording</>
          ) : (
            <><Mic size={11} /> Start recording</>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
          {error}
        </div>
      )}

      {listening && (
        <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
          <Loader2 size={12} className="animate-spin text-red-400" />
          <div className="flex gap-0.5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-1 rounded-full bg-red-400" style={{ height: `${8 + Math.random() * 12}px`, animation: `pulse ${0.5 + i * 0.15}s ease-in-out infinite alternate` }} />
            ))}
          </div>
          Listening... speak clearly
        </div>
      )}

      {transcript && (
        <div className="mb-3 p-3 bg-slate-900/60 rounded-lg border border-slate-700/40">
          <p className="text-sm text-slate-200 leading-relaxed">{transcript}</p>
          <button onClick={handleSave} className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 font-medium">
            + Add as note
          </button>
        </div>
      )}

      {!listening && !transcript && !error && (
        <p className="text-xs text-slate-500 text-center py-2">
          Click "Start recording" and speak. Your words will be transcribed automatically.
        </p>
      )}
    </div>
  );
}
