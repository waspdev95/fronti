import { Folder } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

export const Settings = () => {
  const { settings, updateSettings } = useSettings();
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const shortcut = isMac ? 'Cmd+Shift+K' : 'Ctrl+Shift+K';

  const handleProjectPathChange = (value: string) => {
    updateSettings({ projectPath: value });
  };

  const handleLocalhostUrlChange = (value: string) => {
    updateSettings({ localhostUrl: value });
  };

  const handleBrowseFolder = () => {
    const path = prompt('Enter project folder path:', settings.projectPath || 'C:\\Users\\project');
    if (path) {
      updateSettings({ projectPath: path });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Project Section */}
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-sm font-semibold text-gray-900">Project Path</label>
          <p className="text-xs text-gray-500 mt-0.5">Enter or paste your project folder path</p>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
            value={settings.projectPath}
            onChange={(e) => handleProjectPathChange(e.target.value)}
            placeholder="C:\Users\project"
          />
          <button
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center"
            onClick={handleBrowseFolder}
            title="Browse folder"
          >
            <Folder size={16} />
          </button>
        </div>
      </div>

      <div className="border-t border-gray-200" />

      {/* Development Server Section */}
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-sm font-semibold text-gray-900">Development Server</label>
          <p className="text-xs text-gray-500 mt-0.5">URL of your local development server</p>
        </div>

        <input
          type="text"
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
          value={settings.localhostUrl}
          onChange={(e) => handleLocalhostUrlChange(e.target.value)}
          placeholder="http://localhost:3000"
        />
      </div>

      <div className="border-t border-gray-200" />

      {/* Keyboard Shortcuts Section */}
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-sm font-semibold text-gray-900">Keyboard Shortcuts</label>
        </div>
        <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg border border-gray-200">
          <span className="text-sm text-gray-700">Toggle editor</span>
          <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-semibold text-gray-700 shadow-sm">
            {shortcut}
          </kbd>
        </div>
      </div>
    </div>
  );
};
