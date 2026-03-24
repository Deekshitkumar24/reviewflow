'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Mail, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Email required'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (json.success) {
        setSent(true);
      } else {
        toast.error(json.error?.message ?? 'Request failed');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#1A56DB] flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-gray-100">ReviewFlow</span>
        </div>

        {sent ? (
          <div className="text-center bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 space-y-4">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Check your email</h2>
            <p className="text-sm text-gray-500">
              If <strong>{email}</strong> is registered, a password reset link has been sent. Check your inbox.
            </p>
            <p className="text-xs text-gray-400">The link expires in 1 hour.</p>
            <Button variant="outline" className="w-full mt-2" onClick={() => router.push('/login')}>
              Back to Login
            </Button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 space-y-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Reset your password</h1>
              <p className="text-sm text-gray-500 mt-1">Enter your email and we&apos;ll send a reset link.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@organization.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-[#1A56DB] hover:bg-[#1044A5] gap-2" disabled={loading}>
                {loading ? 'Sending...' : <><span>Send Reset Link</span><ArrowRight className="w-4 h-4" /></>}
              </Button>
            </form>

            <div className="text-center">
              <button onClick={() => router.push('/login')} className="text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                ← Back to Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
