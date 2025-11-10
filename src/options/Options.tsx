import React, { useEffect, useState } from 'react';
import { Cloud, LogOut, Save, Shield } from 'lucide-react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import {
  getCurrentUser,
  isAuthenticated,
  signIn,
  signUp,
  signOut,
} from '@/lib/supabase/client';
import { getSyncSettings, saveSyncSettings } from '@/lib/storage/db';
import type { SyncSettings } from '@/types/sync';

export const Options: React.FC = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<SyncSettings>({
    autoSync: true,
    syncInterval: 300000,
    conflictResolution: 'manual',
    maxRetries: 3,
    retryDelay: 5000,
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    loadUserAndSettings();
  }, []);

  const loadUserAndSettings = async () => {
    try {
      const auth = await isAuthenticated();
      setAuthenticated(auth);

      if (auth) {
        const user = await getCurrentUser();
        setUserEmail(user?.email || null);
      }

      const savedSettings = await getSyncSettings();
      setSettings(savedSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) throw error;
        alert('Account created! Please check your email to verify your account.');
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
      }

      await loadUserAndSettings();
      setEmail('');
      setPassword('');
    } catch (error: any) {
      setAuthError(error.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setAuthenticated(false);
      setUserEmail(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await saveSyncSettings(settings);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Cloud className="w-16 h-16 mx-auto mb-4 text-brand-500 animate-pulse" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <Cloud className="w-8 h-8 text-brand-500" />
            Excalidraw Sync
          </h1>
          <p className="text-gray-600">Sync your Excalidraw diagrams across devices</p>
        </div>

        {!authenticated ? (
          <Card>
            <h2 className="text-xl font-semibold mb-4">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </h2>
            <form onSubmit={handleAuth} className="space-y-4">
              <Input
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
              <Input
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
              {authError && <p className="text-sm text-red-600">{authError}</p>}
              <Button type="submit" isLoading={authLoading} className="w-full">
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Button>
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="w-full text-sm text-brand-600 hover:text-brand-700"
              >
                {isSignUp
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Create one"}
              </button>
            </form>
          </Card>
        ) : (
          <>
            <Card className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Account</h2>
                  <p className="text-sm text-gray-600">{userEmail}</p>
                </div>
                <Button variant="secondary" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </Card>

            <Card className="mb-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Sync Settings
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Auto Sync</label>
                    <p className="text-xs text-gray-500">
                      Automatically sync diagrams as you work
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoSync}
                    onChange={(e) =>
                      setSettings({ ...settings, autoSync: e.target.checked })
                    }
                    className="h-5 w-5 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sync Interval (minutes)
                  </label>
                  <select
                    value={settings.syncInterval / 60000}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        syncInterval: parseInt(e.target.value) * 60000,
                      })
                    }
                    className="input"
                  >
                    <option value="1">1 minute</option>
                    <option value="5">5 minutes</option>
                    <option value="10">10 minutes</option>
                    <option value="30">30 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conflict Resolution
                  </label>
                  <select
                    value={settings.conflictResolution}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        conflictResolution: e.target.value as any,
                      })
                    }
                    className="input"
                  >
                    <option value="manual">Manual (ask me)</option>
                    <option value="latest">Latest version wins</option>
                    <option value="local">Local always wins</option>
                    <option value="cloud">Cloud always wins</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    What to do when the same diagram is edited on multiple devices
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSaveSettings} className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    {settingsSaved ? 'Saved!' : 'Save Settings'}
                  </Button>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold mb-2">About</h2>
              <p className="text-sm text-gray-600 mb-2">
                Excalidraw Sync automatically syncs your Excalidraw diagrams to the cloud,
                making them available on all your devices.
              </p>
              <p className="text-xs text-gray-500">
                Version 1.0.0 • Powered by Supabase
              </p>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};
