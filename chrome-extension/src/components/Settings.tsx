import React from 'react';
import { Folder } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

export const Settings = () => {
  const { settings, updateSettings } = useSettings();

  const handleProjectPathChange = (value: string) => {
    updateSettings({ projectPath: value });
  };

  const handleLocalhostUrlChange = (value: string) => {
    updateSettings({ localhostUrl: value });
  };

  const handlePermissionChange = (tool: string, enabled: boolean) => {
    updateSettings({
      toolPermissions: {
        ...settings.toolPermissions,
        [tool]: enabled,
      },
    });
  };

  const handleToggleAll = () => {
    const allEnabled = Object.values(settings.toolPermissions).every(v => v);
    const newState = !allEnabled;

    updateSettings({
      toolPermissions: {
        read: newState,
        write: newState,
        edit: newState,
        bash: newState,
        grep: newState,
        glob: newState,
        webSearch: newState,
        webFetch: newState,
      },
    });
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

      {/* Claude Code Permissions Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-semibold text-gray-900">Claude Code Permissions</label>
            <p className="text-xs text-gray-500 mt-0.5">Control which tools Claude Code can use</p>
          </div>
          <button
            onClick={handleToggleAll}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            {Object.values(settings.toolPermissions).every(v => v) ? 'Disable All' : 'Enable All'}
          </button>
        </div>

        <div className="space-y-2">
            {/* Read */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="permission-read"
                checked={settings.toolPermissions.read}
                onChange={(e) => handlePermissionChange('read', e.target.checked)}
                className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-2 focus:ring-gray-900 cursor-pointer"
              />
              <label htmlFor="permission-read" className="flex-1 text-sm text-gray-900 cursor-pointer">
                <span className="font-medium">Read</span>
                <span className="text-gray-600 ml-1">- View file contents</span>
              </label>
            </div>

            {/* Write */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="permission-write"
                checked={settings.toolPermissions.write}
                onChange={(e) => handlePermissionChange('write', e.target.checked)}
                className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-2 focus:ring-gray-900 cursor-pointer"
              />
              <label htmlFor="permission-write" className="flex-1 text-sm text-gray-900 cursor-pointer">
                <span className="font-medium">Write</span>
                <span className="text-gray-600 ml-1">- Create new files</span>
              </label>
            </div>

            {/* Edit */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="permission-edit"
                checked={settings.toolPermissions.edit}
                onChange={(e) => handlePermissionChange('edit', e.target.checked)}
                className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-2 focus:ring-gray-900 cursor-pointer"
              />
              <label htmlFor="permission-edit" className="flex-1 text-sm text-gray-900 cursor-pointer">
                <span className="font-medium">Edit</span>
                <span className="text-gray-600 ml-1">- Modify existing files</span>
              </label>
            </div>

            {/* Bash */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="permission-bash"
                checked={settings.toolPermissions.bash}
                onChange={(e) => handlePermissionChange('bash', e.target.checked)}
                className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-2 focus:ring-gray-900 cursor-pointer"
              />
              <label htmlFor="permission-bash" className="flex-1 text-sm text-gray-900 cursor-pointer">
                <span className="font-medium text-red-600">Bash</span>
                <span className="text-gray-600 ml-1">- Execute terminal commands</span>
              </label>
            </div>

            {/* Grep */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="permission-grep"
                checked={settings.toolPermissions.grep}
                onChange={(e) => handlePermissionChange('grep', e.target.checked)}
                className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-2 focus:ring-gray-900 cursor-pointer"
              />
              <label htmlFor="permission-grep" className="flex-1 text-sm text-gray-900 cursor-pointer">
                <span className="font-medium">Grep</span>
                <span className="text-gray-600 ml-1">- Search file contents</span>
              </label>
            </div>

            {/* Glob */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="permission-glob"
                checked={settings.toolPermissions.glob}
                onChange={(e) => handlePermissionChange('glob', e.target.checked)}
                className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-2 focus:ring-gray-900 cursor-pointer"
              />
              <label htmlFor="permission-glob" className="flex-1 text-sm text-gray-900 cursor-pointer">
                <span className="font-medium">Glob</span>
                <span className="text-gray-600 ml-1">- Find files by pattern</span>
              </label>
            </div>

            {/* WebSearch */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="permission-websearch"
                checked={settings.toolPermissions.webSearch}
                onChange={(e) => handlePermissionChange('webSearch', e.target.checked)}
                className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-2 focus:ring-gray-900 cursor-pointer"
              />
              <label htmlFor="permission-websearch" className="flex-1 text-sm text-gray-900 cursor-pointer">
                <span className="font-medium">WebSearch</span>
                <span className="text-gray-600 ml-1">- Search the web</span>
              </label>
            </div>

            {/* WebFetch */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="permission-webfetch"
                checked={settings.toolPermissions.webFetch}
                onChange={(e) => handlePermissionChange('webFetch', e.target.checked)}
                className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-2 focus:ring-gray-900 cursor-pointer"
              />
              <label htmlFor="permission-webfetch" className="flex-1 text-sm text-gray-900 cursor-pointer">
                <span className="font-medium">WebFetch</span>
                <span className="text-gray-600 ml-1">- Fetch web content</span>
              </label>
            </div>
        </div>
      </div>

    </div>
  );
};
