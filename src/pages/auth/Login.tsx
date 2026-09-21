import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, TrendingUp, Users } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

export default function Login() {
  const { login } = useApp();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      const token = localStorage.getItem('movo_token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.role === 'admin') { navigate('/admin'); return; }
        } catch { /* ignore */ }
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side -- brand showcase (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[55%] bg-[#0f1117] items-center justify-center relative overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }} />

        {/* Gradient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#6366f1]/10 rounded-full blur-[120px]" />

        <div className="relative z-10 max-w-md text-center px-8">
          <h1 className="text-5xl font-bold text-white tracking-tight mb-4" style={{ fontFamily: 'Geist, Inter, sans-serif' }}>movo</h1>
          <p className="text-lg text-white/50 mb-12">Your business, always moving.</p>

          <div className="space-y-6 text-left">
            {/* Feature highlights */}
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-md bg-[#6366f1]/15 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-[#6366f1]" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/80">AI-Powered Operations</p>
                <p className="text-xs text-white/40 mt-0.5">Automate follow-ups, quotes, and customer communication</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-md bg-emerald-500/15 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/80">Revenue Intelligence</p>
                <p className="text-xs text-white/40 mt-0.5">Track every rupee from lead to payment</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-md bg-amber-500/15 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/80">Customer Memory</p>
                <p className="text-xs text-white/40 mt-0.5">Every interaction, vehicle, and preference remembered</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side -- form */}
      <div className="flex-1 flex items-center justify-center bg-[#0f1117] px-6 lg:bg-[#181b25]">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-3xl font-bold text-white tracking-tight" style={{ fontFamily: 'Geist, Inter, sans-serif' }}>movo</h1>
          </div>

          <h2 className="text-xl font-semibold text-white tracking-tight mb-1">Welcome back</h2>
          <p className="text-sm text-white/40 mb-6">Sign in to your workspace</p>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-white/[0.10] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-colors"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-white/[0.10] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-colors"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-[#6366f1] hover:bg-[#5558e6] active:scale-[0.98] px-4 py-2.5 text-sm font-medium text-white transition-all duration-150 disabled:opacity-40"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/30">
            Don't have an account?{' '}
            <Link to="/signup" className="text-[#6366f1] hover:text-[#818cf8] transition-colors">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
