'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
          <CardTitle className="text-base">Keyboard Shortcuts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { keys: '⌘ + K', desc: 'Open command palette' },
            { keys: '⌘ + B', desc: 'Toggle sidebar' },
            { keys: '⌘ + D', desc: 'Toggle dark mode' },
            { keys: 'Esc', desc: 'Close modals' },
          ].map(shortcut => (
            <div key={shortcut.keys} className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">{shortcut.desc}</span>
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">{shortcut.keys}</kbd>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p><strong>ReviewFlow</strong> v3.0</p>
          <p>Professional event judging platform</p>
          <p className="text-xs text-gray-400">Built with Next.js 14, TypeScript, Prisma, and ShadCN/UI</p>
        </CardContent>
      </Card>
    </div>
  );
}
