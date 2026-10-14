import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import {
  Boxes,
  Shield,
  GraduationCap,
  ArrowRight,
  Lock,
  User,
  School,
} from 'lucide-react';
import { getErrorMessage } from '../services/api';

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginRole, setLoginRole] = useState<'staff' | 'student'>('staff');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError(
        loginRole === 'student'
          ? 'Please enter your Student Roll No or Email'
          : 'Please enter your Institutional Email'
      );
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const user = await login({ email: email.trim(), password });
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

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background radial gradients */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-xl shadow-blue-500/25 mb-1">
            <Boxes className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Department Inventory System
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Laboratory Equipment Tracking, Quota Enforcement & Student Borrowing Portal
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-md shadow-2xl">
          <CardContent className="p-6 space-y-5">
            {error && (
              <Alert variant="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {/* Role Tab Selector */}
            <div className="grid grid-cols-2 p-1 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setLoginRole('staff');
                  setError(null);
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg font-semibold transition-all ${
                  loginRole === 'staff'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Staff & Faculty</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginRole('student');
                  setError(null);
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg font-semibold transition-all ${
                  loginRole === 'student'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Student Portal</span>
              </button>
            </div>

            {/* Email / Roll No Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>{loginRole === 'student' ? 'Student ID or Email' : 'Faculty / Staff Email'}</span>
                  {loginRole === 'student' && (
                    <span className="text-[10px] text-emerald-400 font-normal lowercase">
                      e.g. CS-2024-001
                    </span>
                  )}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    {loginRole === 'student' ? (
                      <GraduationCap className="w-4 h-4" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      loginRole === 'student'
                        ? 'Enter Roll No or Student Email'
                        : 'Enter faculty/staff email address'
                    }
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/50 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/50 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className={`w-full py-2.5 font-semibold text-sm shadow-lg transition-colors ${
                  loginRole === 'student'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                }`}
                isLoading={isSubmitting || isLoading}
                rightIcon={<ArrowRight className="w-4 h-4 ml-1" />}
              >
                {loginRole === 'student' ? 'Sign In to Student Portal' : 'Sign In to Operations Dashboard'}
              </Button>
            </form>

            {/* Quick Fill Demo Credentials */}
            <div className="pt-3 border-t border-slate-800 text-center space-y-2">
              <p className="text-[11px] text-slate-500 uppercase font-semibold tracking-wider">
                Demo Credentials (Password: demo1234)
              </p>
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLoginRole('staff');
                    setEmail('coordinator@department.edu');
                    setPassword('demo1234');
                  }}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-blue-900/40 text-blue-300 hover:bg-blue-800/60 border border-blue-700/50 transition-colors"
                >
                  Coordinator
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginRole('student');
                    setEmail('student1@department.edu');
                    setPassword('demo1234');
                  }}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-emerald-900/40 text-emerald-300 hover:bg-emerald-800/60 border border-emerald-700/50 transition-colors"
                >
                  Student 1
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginRole('staff');
                    setEmail('admin@department.edu');
                    setPassword('demo1234');
                  }}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-purple-900/40 text-purple-300 hover:bg-purple-800/60 border border-purple-700/50 transition-colors"
                >
                  Administrator
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Footer */}
        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-2">
          <School className="w-3.5 h-3.5 text-slate-400" />
          <span>Department of Computer Science & Information Technology • Internal Lab System</span>
        </div>
      </div>
    </div>
  );
};
