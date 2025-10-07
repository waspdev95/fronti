import { useState, useEffect } from 'react';

export interface AppSettings {
  projectPath: string;
  localhostUrl: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  projectPath: '',
  localhostUrl: 'http://localhost:3000',
};

/**
 * Hook to manage application settings via Chrome storage
 */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await chrome.storage.local.get(['projectPath', 'localhostUrl']);
      setSettings({
        projectPath: result.projectPath || '',
        localhostUrl: result.localhostUrl || 'http://localhost:3000',
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const updated = { ...settings, ...newSettings };
      await chrome.storage.local.set(updated);
      setSettings(updated);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  return {
    settings,
    updateSettings,
  };
}
