import React from 'react';
import { Folder, Check } from 'lucide-react';
import * as Checkbox from '@radix-ui/react-checkbox';
import * as Switch from '@radix-ui/react-switch';
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
    const visiblePermissions = [
      settings.toolPermissions.read,
      settings.toolPermissions.write,
      settings.toolPermissions.edit,
      settings.toolPermissions.bash,
    ];
    const allEnabled = visiblePermissions.every(v => v);
    const newState = !allEnabled;

    updateSettings({
      toolPermissions: {
        ...settings.toolPermissions,
        read: newState,
        write: newState,
        edit: newState,
        bash: newState,
      },
    });
  };

  const handleBrowseFolder = () => {
    const path = prompt('Enter project folder path:', settings.projectPath || 'C:\\Users\\project');
    if (path) {
      updateSettings({ projectPath: path });
    }
  };

  const allEnabled = [
    settings.toolPermissions.read,
    settings.toolPermissions.write,
    settings.toolPermissions.edit,
    settings.toolPermissions.bash,
  ].every(v => v);

  return (
    <div className="flex flex-col gap-6">
      {/* Project Section */}
      <div className="flex flex-col">
        <label className="text-sm font-semibold text-gray-900 mb-2">Project Path</label>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all hover:border-gray-300"
            value={settings.projectPath}
            onChange={(e) => handleProjectPathChange(e.target.value)}
            placeholder="C:\Users\project"
          />
          <button
            className="px-3 py-2 bg-white border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center"
            onClick={handleBrowseFolder}
            title="Browse folder"
          >
            <Folder size={16} />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">Enter or paste your project folder path</p>
      </div>

      {/* Development Server Section */}
      <div className="flex flex-col">
        <label className="text-sm font-semibold text-gray-900 mb-2">Development Server</label>
        <input
          type="text"
          className="px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all hover:border-gray-300"
          value={settings.localhostUrl}
          onChange={(e) => handleLocalhostUrlChange(e.target.value)}
          placeholder="http://localhost:3000"
        />
        <p className="text-xs text-gray-500 mt-1">URL of your local development server</p>
      </div>

      {/* Claude Code Permissions Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-gray-900">Permissions</label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{allEnabled ? 'All enabled' : 'Enable all'}</span>
            <Switch.Root
              checked={allEnabled}
              onCheckedChange={handleToggleAll}
              className="w-10 h-5 bg-gray-200 rounded-full relative shadow-sm outline-none cursor-pointer transition-colors data-[state=checked]:bg-gray-900 hover:bg-gray-300 data-[state=checked]:hover:bg-gray-800"
            >
              <Switch.Thumb className="block w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-150 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[21px]" />
            </Switch.Root>
          </div>
        </div>

        <div className="space-y-3">
            {/* Read */}
            <div className="flex items-center gap-3 group">
              <Checkbox.Root
                id="permission-read"
                checked={settings.toolPermissions.read}
                onCheckedChange={(checked) => handlePermissionChange('read', checked as boolean)}
                className="w-5 h-5 bg-white border-2 border-gray-300 rounded-md flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
              >
                <Checkbox.Indicator>
                  <Check size={14} className="text-white" strokeWidth={3} />
                </Checkbox.Indicator>
              </Checkbox.Root>
              <label htmlFor="permission-read" className="flex-1 text-sm cursor-pointer select-none">
                <span className="font-medium text-gray-900">Read</span>
                <span className="text-gray-500 ml-1.5 text-xs">View file contents</span>
              </label>
            </div>

            {/* Write */}
            <div className="flex items-center gap-3 group">
              <Checkbox.Root
                id="permission-write"
                checked={settings.toolPermissions.write}
                onCheckedChange={(checked) => handlePermissionChange('write', checked as boolean)}
                className="w-5 h-5 bg-white border-2 border-gray-300 rounded-md flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
              >
                <Checkbox.Indicator>
                  <Check size={14} className="text-white" strokeWidth={3} />
                </Checkbox.Indicator>
              </Checkbox.Root>
              <label htmlFor="permission-write" className="flex-1 text-sm cursor-pointer select-none">
                <span className="font-medium text-gray-900">Write</span>
                <span className="text-gray-500 ml-1.5 text-xs">Create new files</span>
              </label>
            </div>

            {/* Edit */}
            <div className="flex items-center gap-3 group">
              <Checkbox.Root
                id="permission-edit"
                checked={settings.toolPermissions.edit}
                onCheckedChange={(checked) => handlePermissionChange('edit', checked as boolean)}
                className="w-5 h-5 bg-white border-2 border-gray-300 rounded-md flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
              >
                <Checkbox.Indicator>
                  <Check size={14} className="text-white" strokeWidth={3} />
                </Checkbox.Indicator>
              </Checkbox.Root>
              <label htmlFor="permission-edit" className="flex-1 text-sm cursor-pointer select-none">
                <span className="font-medium text-gray-900">Edit</span>
                <span className="text-gray-500 ml-1.5 text-xs">Modify existing files</span>
              </label>
            </div>

            {/* Bash */}
            <div className="flex items-center gap-3 group">
              <Checkbox.Root
                id="permission-bash"
                checked={settings.toolPermissions.bash}
                onCheckedChange={(checked) => handlePermissionChange('bash', checked as boolean)}
                className="w-5 h-5 bg-white border-2 border-gray-300 rounded-md flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
              >
                <Checkbox.Indicator>
                  <Check size={14} className="text-white" strokeWidth={3} />
                </Checkbox.Indicator>
              </Checkbox.Root>
              <label htmlFor="permission-bash" className="flex-1 text-sm cursor-pointer select-none">
                <span className="font-medium text-red-600">Bash</span>
                <span className="text-gray-500 ml-1.5 text-xs">Execute terminal commands</span>
              </label>
            </div>
        </div>
      </div>

    </div>
  );
};
