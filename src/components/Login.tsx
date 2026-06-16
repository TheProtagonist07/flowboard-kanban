import { useState } from 'react';
import toast from 'react-hot-toast';
import { LayoutGrid, Mail, Lock, User as UserIcon, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { error } = await signUpWithEmail(email, password, name || email.split('@')[0]);
        if (error) return toast.error(error);
        toast.success('Account created — check your email if confirmation is on, then sign in.');
        setMode('signin');
      } else {
        const { error } = await signInWithEmail(email, password);
        if (error) return toast.error(error);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-center h-screen px-4"
      style={{ background: 'linear-gradient(135deg, var(--gradient-a) 0%, var(--gradient-b) 50%, var(--gradient-a) 100%)' }}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, var(--glow-a), transparent)', transform: 'translate(-50%,-50%)' }} />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, var(--glow-b), transparent)', transform: 'translate(50%,50%)' }} />
      </div>

      <div className="relative w-full max-w-sm rounded-2xl p-8"
        style={{ background: 'var(--bg-modal)', border: '1px solid var(--border-medium)', boxShadow: '0 24px 60px rgba(0,0,0,0.35)' }}>
        <div className="flex flex-col items-center mb-7">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            <LayoutGrid size={24} />
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>FlowBoard</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
            {mode === 'signin' ? 'Sign in to your team boards' : 'Create your account'}
          </p>
        </div>

        <button onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-2.5 h-11 rounded-lg font-medium text-sm mb-4 transition-opacity hover:opacity-90"
          style={{ background: '#fff', color: '#1f2937' }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
          <span className="text-xs" style={{ color: 'var(--text-4)' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <Field icon={<UserIcon size={16} />}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Display name"
                className="w-full bg-transparent outline-none text-sm" style={{ color: 'var(--text-1)' }} />
            </Field>
          )}
          <Field icon={<Mail size={16} />}>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
              className="w-full bg-transparent outline-none text-sm" style={{ color: 'var(--text-1)' }} />
          </Field>
          <Field icon={<Lock size={16} />}>
            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
              className="w-full bg-transparent outline-none text-sm" style={{ color: 'var(--text-1)' }} />
          </Field>

          <button type="submit" disabled={busy}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            {busy && <Loader2 size={16} className="animate-spin" />}
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm mt-5" style={{ color: 'var(--text-3)' }}>
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="font-semibold" style={{ color: 'var(--accent)' }}>
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 h-11 px-3 rounded-lg"
      style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)' }}>
      <span style={{ color: 'var(--text-4)' }}>{icon}</span>
      {children}
    </div>
  );
}
