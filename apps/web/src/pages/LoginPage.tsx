import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { Boxes, Shield, GraduationCap, Sparkles, ArrowRight, Check } from 'lucide-react';
import { getErrorMessage } from '../services/api';

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'coordinator' | 'student' | null>(null);

  // Fill credentials without auto-logging in
  const handleFillCredentials = (role: 'coordinator' | 'student') => {
    setError(null);
    setSelectedRole(role);
    if (role === 'coordinator') {
      setEmail('coordinator@department.edu');
      setPassword('demo1234');
    } else {
      setEmail('student1@department.edu');
      setPassword('demo1234');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const user = await login({ email, password });
      // Role-specific navigation
      if (user.role === 'student') {
        navigate('/student/portal');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStudentEmail = email.toLowerCase().includes('student');

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 p-4">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-xl shadow-blue-500/25 mb-1">
            <Boxes className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Department Inventory System
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Item tracking, borrowing quotas, lifecycle management, and student return workflows.
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-md shadow-2xl">
          <CardContent className="p-6 space-y-6">
            {error && (
              <Alert variant="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {/* Demo Account Fill Buttons */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                ⚡ Select Account (Prefills Credentials)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleFillCredentials('coordinator')}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs font-semibold transition-all ${
                    email === 'coordinator@department.edu'
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                      : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-blue-400" />
                    <span>Coordinator</span>
                  </span>
                  {email === 'coordinator@department.edu' && (
                    <Check className="w-3.5 h-3.5 text-blue-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleFillCredentials('student')}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs font-semibold transition-all ${
                    email === 'student1@department.edu'
                      ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm'
                      : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Student</span>
                  </span>
                  {email === 'student1@department.edu' && (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800" />
              <span className="flex-shrink mx-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Sign In with Credentials
              </span>
              <div className="flex-grow border-t border-slate-800" />
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setSelectedRole(null);
                  }}
                  placeholder="coordinator@department.edu"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Default demo password: <code>demo1234</code>
                </span>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className={`w-full py-2.5 font-semibold text-sm shadow-lg transition-colors ${
                  isStudentEmail
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                }`}
                isLoading={isSubmitting || isLoading}
                rightIcon={<ArrowRight className="w-4 h-4 ml-1" />}
              >
                {isStudentEmail ? 'Sign In to Student Portal' : 'Sign In to Dashboard'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Footer Info */}
        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Competitive Coding Edition • Problem Statement #5</span>
        </div>
      </div>
    </div>
  );
};
