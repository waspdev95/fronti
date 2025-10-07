import { Plus } from 'lucide-react';
import { useAppStore } from '../store';
import { CommandInput } from './CommandInput';

export const Panel = () => {
  const {
    startNewSession,
  } = useAppStore();

  const handleNewChat = () => {
    startNewSession();
  };

  return (
    <div className="w-full h-full bg-[#FAFAFA] flex flex-col">
      <div className="flex items-center justify-end gap-2 px-4 py-3 bg-[#FAFAFA]">
        {/* <button
          className="p-1.5 bg-transparent border-0 rounded-md text-emerald-500 cursor-pointer flex items-center transition-all hover:bg-emerald-50 hover:text-emerald-600"
          onClick={handleNewChat}
          title="New Chat"
        >
          <Plus size={14} />
        </button> */}
      </div>

      <div className="flex-1 overflow-hidden px-4 py-4 flex flex-col">
        <CommandInput />
      </div>
    </div>
  );
};
