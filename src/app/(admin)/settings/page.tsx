'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAppStore } from '@/stores/useAppStore';

export default function SettingsPage() {
  const { darkMode, toggleDarkMode } = useAppStore();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Application preferences and configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Dark Mode</Label>
              <p className="text-xs text-gray-500 mt-0.5">Switch between light and dark themes</p>
            </div>
            <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p><strong>ReviewFlow</strong> v3.0</p>
          <p>Professional event judging platform</p>
          <p className="text-xs text-gray-400">Built with Next.js 15, TypeScript, Drizzle ORM, Neon Postgres, and Shadcn/UI</p>
        </CardContent>
      </Card>
    </div>
  );
}
