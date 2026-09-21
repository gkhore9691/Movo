import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, TrendingUp, Users } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

export default function Signup() {
  const { signup } = useApp();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signup({
        name,
        email,
        password,
        businessName,
        phone: phone || undefined,
        city: city || undefined,
      });
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
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
      <div className="flex-1 flex items-center justify-center bg-[#0f1117] px-6 py-12 lg:bg-[#181b25]">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-3xl font-bold text-white tracking-tight" style={{ fontFamily: 'Geist, Inter, sans-serif' }}>movo</h1>
          </div>

          <h2 className="text-xl font-semibold text-white tracking-tight mb-1">Create your workspace</h2>
          <p className="text-sm text-white/40 mb-6">Get started with Movo in minutes</p>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5">Full name</label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-white/[0.10] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-colors"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5">Email</label>
              <input
                id="signup-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-white/[0.10] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-colors"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5">Password</label>
              <input
                id="signup-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-white/[0.10] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-colors"
                placeholder="Create a password"
              />
            </div>

            <div>
              <label htmlFor="businessName" className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5">Business name</label>
              <input
                id="businessName"
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full rounded-md border border-white/[0.10] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-colors"
                placeholder="Your business name"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="phone" className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5">
                  Phone <span className="text-white/20">(optional)</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-md border border-white/[0.10] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-colors"
                  placeholder="+91..."
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5">
                  City <span className="text-white/20">(optional)</span>
                </label>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-md border border-white/[0.10] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-colors"
                  placeholder="Indore"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-[#6366f1] hover:bg-[#5558e6] active:scale-[0.98] px-4 py-2.5 text-sm font-medium text-white transition-all duration-150 disabled:opacity-40"
            >
              {submitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/30">
            Already have an account?{' '}
            <Link to="/login" className="text-[#6366f1] hover:text-[#818cf8] transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
