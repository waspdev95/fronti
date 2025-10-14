import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { ChatInput } from './ChatInput';

export const Panel = () => {
  const {
    startNewSession,
  } = useAppStore();

  const [projectPath, setProjectPath] = useState<string>('');

  useEffect(() => {
    // Load project path from settings
    chrome.storage.local.get(['projectPath'], (result) => {
      if (result.projectPath) {
        setProjectPath(result.projectPath);
      }
    });
  }, []);

  const handleNewChat = () => {
    startNewSession();
  };

  return (
    <div className="w-full h-full bg-[#FAFAFA] flex flex-col">
      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Chat Input Section */}
        <div className="flex-1 min-h-0 overflow-hidden px-4 py-4">
          <ChatInput />
        </div>
      </div>
    </div>
  );
};
