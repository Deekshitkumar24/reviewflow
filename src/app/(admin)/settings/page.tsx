'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/stores/useAppStore';
import { RainbowButton } from '@/components/ui/RainbowButton';
import { Settings, Palette, Bell, Info, Save, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TABS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'security', label: 'Security & Access', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'about', label: 'About', icon: Info },
];

export default function SettingsPage() {
  const { darkMode, toggleDarkMode } = useAppStore();
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Application preferences and system configuration</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 pt-4">
        {/* Vertical Tabs Sidebar */}
        <div className="flex flex-col gap-1 w-full md:w-64 flex-shrink-0">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-left ${
                  isActive
                    ? 'bg-[#111] text-white border border-white/10 shadow-sm'
                    : 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${isActive ? 'text-blue-500' : 'text-gray-500'}`} />
                <span className="text-sm">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <Card className="bg-[#111] border-white/5 overflow-hidden">
                    <CardHeader>
                      <CardTitle className="text-gray-200">Organization Info</CardTitle>
                      <CardDescription className="text-gray-500">Update your primary organization details.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-gray-300">Platform Name</Label>
                        <Input defaultValue="ReviewFlow" className="bg-white/5 border-white/10 text-white focus-visible:ring-blue-500" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-gray-300">Default Contact Email</Label>
                        <Input defaultValue="admin@reviewflow.local" className="bg-white/5 border-white/10 text-white focus-visible:ring-blue-500" />
                      </div>
                      <div className="pt-4 flex justify-end">
                         <RainbowButton>
                           <Save className="w-4 h-4 mr-2" /> Save Changes
                         </RainbowButton>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <Card className="bg-[#111] border-white/5">
                    <CardHeader>
                      <CardTitle className="text-gray-200">Appearance</CardTitle>
                      <CardDescription className="text-gray-500">Customize how ReviewFlow looks on your device.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <Label className="text-sm font-medium text-white">Dark Mode Theme</Label>
                          <p className="text-xs text-gray-500 mt-0.5">Toggle the primary dark aesthetic for the platform</p>
                        </div>
                        <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <Card className="bg-[#111] border-white/5">
                    <CardHeader>
                      <CardTitle className="text-gray-200">Security Policies</CardTitle>
                      <CardDescription className="text-gray-500">Manage login requirements and access controls.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between py-2 border-b border-white/5">
                        <div>
                          <Label className="text-sm font-medium text-white">Enforce 2FA</Label>
                          <p className="text-xs text-gray-500 mt-0.5">Require two-factor authentication for all Admin roles</p>
                        </div>
                        <Switch checked={true} />
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <Label className="text-sm font-medium text-white">Strict Session Length</Label>
                          <p className="text-xs text-gray-500 mt-0.5">Force logout after 12 hours of inactivity</p>
                        </div>
                        <Switch checked={true} />
                      </div>
                      <div className="pt-4 flex justify-end">
                         <RainbowButton>
                           <Save className="w-4 h-4 mr-2" /> Update Policies
                         </RainbowButton>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <Card className="bg-[#111] border-white/5">
                    <CardHeader>
                      <CardTitle className="text-gray-200">Email Notifications</CardTitle>
                      <CardDescription className="text-gray-500">Choose what events trigger an email alert.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between py-2 border-b border-white/5">
                        <div>
                          <Label className="text-sm font-medium text-white">Review Submissions</Label>
                          <p className="text-xs text-gray-500 mt-0.5">Notify when a new review is submitted</p>
                        </div>
                        <Switch checked={false} />
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-white/5">
                        <div>
                          <Label className="text-sm font-medium text-white">New Coordinator Registrations</Label>
                          <p className="text-xs text-gray-500 mt-0.5">Receive alerts when new coordinators sign up</p>
                        </div>
                        <Switch checked={true} />
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <Label className="text-sm font-medium text-white">Weekly Export Digests</Label>
                          <p className="text-xs text-gray-500 mt-0.5">Get a weekly PDF summary of activity</p>
                        </div>
                        <Switch checked={false} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'about' && (
                <div className="space-y-6">
                  <Card className="bg-[#111] border-white/5 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600 opacity-50" />
                    <CardHeader>
                      <CardTitle className="text-gray-200">About ReviewFlow</CardTitle>
                      <CardDescription className="text-gray-500">System information and license details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-gray-400">
                      <p><strong className="text-white">ReviewFlow</strong> v3.0 (Premium Enterprise)</p>
                      <p>Professional event judging platform tailored for scale and speed.</p>
                      <div className="pt-4 border-t border-white/5 mt-4">
                        <p className="text-xs font-mono text-gray-500">Built with Next.js App Router, TypeScript, Drizzle ORM, Neon Postgres, Shadcn/UI, Framer Motion</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
