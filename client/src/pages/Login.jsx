import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/mockApi';
import Field from '../components/Field';
import Input from '../components/Input';
import Button from '../components/Button';
import { useToast } from '../components/Toast';
import { Stethoscope, Lock, Mail, CheckCircle2 } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      showToast('Signed in successfully');
      navigate('/patients');
    } catch (err) {
      setError('Email or password is wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col justify-center items-center p-4">
      {/* Top Clinic Header in Login */}
      <div className="w-full max-w-sm mb-4 text-center">
        <div className="w-12 h-12 rounded-[6px] bg-brand text-white flex items-center justify-center mx-auto mb-2 shadow-sm">
          <Stethoscope size={26} />
        </div>
        <h1 className="text-22 font-bold text-ink tracking-tight">
          Nilkanth Clinic
        </h1>
        <p className="text-13 text-muted">
          Dr. Jignesh Chauhan, B.A.M.S. | Mo: 90336 63170
        </p>
      </div>

      <div className="w-full max-w-sm bg-surface border border-hairline rounded-[6px] p-6 sm:p-8 shadow-card">
        <div className="border-b border-hairline pb-3 mb-5">
          <h2 className="text-17 font-semibold text-ink">
            Clinical register sign in
          </h2>
          <p className="text-13 text-muted mt-0.5">
            Enter credentials to open daily ledger & register
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-red-subtle border border-red text-red text-13 rounded-[4px]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Email" htmlFor="login-email">
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@nilkanth.in"
                required
                autoFocus
                className="pl-9"
              />
            </div>
          </Field>

          <Field label="Password" htmlFor="login-password">
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="pl-9"
              />
            </div>
          </Field>

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="w-full mt-2"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        {/* Owner login helper */}
        <div className="mt-6 pt-4 border-t border-hairline text-13 bg-surface-subtle p-3 rounded-[4px]">
          <div className="font-semibold text-brand text-11 tracking-wide mb-2">
            Single owner account:
          </div>
          <div className="flex items-center justify-between text-11">
            <div>
              <span className="font-medium text-ink block">Dr. Jignesh Chauhan (B.A.M.S.)</span>
              <span className="text-muted font-mono">admin@nilkanth.in (pass: admin)</span>
            </div>
            <button
              type="button"
              onClick={() => handleFillDemo('admin@nilkanth.in', 'admin')}
              className="text-11 bg-white border border-hairline hover:border-brand text-brand px-2.5 py-1 rounded font-medium shadow-sm transition-colors"
            >
              Fill login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
