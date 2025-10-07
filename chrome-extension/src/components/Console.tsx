import { useState, useEffect, useRef } from 'react';
import { Terminal, X, Copy, Trash2, ChevronRight, ChevronDown, Network, Search } from 'lucide-react';

interface ConsoleMessage {
  id: string;
  type: 'log' | 'error' | 'warn' | 'info';
  args: any[];
  timestamp: number;
}

interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  type: string; // fetch, xhr, script, stylesheet, image, document, other
  status: number;
  statusText: string;
  duration: number;
  timestamp: number;
  error?: boolean;
}

interface ConsoleProps {
  onClose: () => void;
  messages: ConsoleMessage[];
  networkRequests: NetworkRequest[];
  onClearConsole: () => void;
  onClearNetwork: () => void;
}

export const Console = ({ onClose, messages, networkRequests, onClearConsole, onClearNetwork }: ConsoleProps) => {
  const [activeTab, setActiveTab] = useState<'console' | 'network'>('console');
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [networkFilter, setNetworkFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | '2xx' | '3xx' | '4xx' | '5xx' | 'error'>('all');
  const consoleRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new message arrives
  useEffect(() => {
    const ref = activeTab === 'console' ? consoleRef.current : networkRef.current;
    if (ref) {
      const isNearBottom = ref.scrollHeight - ref.scrollTop - ref.clientHeight < 100;
      if (isNearBottom) {
        ref.scrollTop = ref.scrollHeight;
      }
    }
  }, [messages, networkRequests, activeTab]);

  const handleClear = () => {
    if (activeTab === 'console') {
      onClearConsole();
      setExpandedMessages(new Set());
    } else {
      onClearNetwork();
    }
  };

  const handleCopyAll = () => {
    if (activeTab === 'console') {
      const text = messages.map(msg => {
        const time = new Date(msg.timestamp).toLocaleTimeString();
        const args = msg.args.map(arg => formatValue(arg, false)).join(' ');
        return `[${time}] ${msg.type.toUpperCase()}: ${args}`;
      }).join('\n');
      navigator.clipboard.writeText(text);
    } else {
      const text = filteredNetworkRequests.map(req => {
        const time = new Date(req.timestamp).toLocaleTimeString();
        return `[${time}] ${req.method} ${req.url} - ${req.status} ${req.statusText} (${req.duration}ms)`;
      }).join('\n');
      navigator.clipboard.writeText(text);
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedMessages);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedMessages(newExpanded);
  };

  const formatValue = (value: any, expanded: boolean = false): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);

    // Handle serialized Error objects
    if (value && typeof value === 'object' && value.__type === 'Error') {
      if (expanded) {
        return `${value.name}: ${value.message}\n${value.stack || ''}`;
      }
      return `${value.name}: ${value.message}`;
    }

    try {
      return JSON.stringify(value, null, expanded ? 2 : 0);
    } catch (e) {
      return String(value);
    }
  };

  const getMessageColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-600';
      case 'warn': return 'text-orange-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-700';
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'error': return '✕';
      case 'warn': return '⚠';
      case 'info': return 'ℹ';
      default: return '›';
    }
  };

  const getStatusColor = (status: number) => {
    if (status === 0) return 'text-red-600';
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 300 && status < 400) return 'text-blue-600';
    if (status >= 400 && status < 500) return 'text-orange-600';
    if (status >= 500) return 'text-red-600';
    return 'text-gray-600';
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'text-blue-600';
      case 'POST': return 'text-green-600';
      case 'PUT': return 'text-orange-600';
      case 'DELETE': return 'text-red-600';
      case 'PATCH': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  // Filter network requests
  const filteredNetworkRequests = networkRequests.filter(req => {
    // Text filter
    if (networkFilter && !req.url.toLowerCase().includes(networkFilter.toLowerCase())) {
      return false;
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'error' && !req.error) return false;
      if (statusFilter === '2xx' && (req.status < 200 || req.status >= 300)) return false;
      if (statusFilter === '3xx' && (req.status < 300 || req.status >= 400)) return false;
      if (statusFilter === '4xx' && (req.status < 400 || req.status >= 500)) return false;
      if (statusFilter === '5xx' && req.status < 500) return false;
    }

    return true;
  });

  return (
    <div className="h-full flex flex-col bg-white border-t border-gray-200">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('console')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-sm font-medium transition-colors ${
                activeTab === 'console'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Terminal size={14} />
              Console
              <span className="text-xs text-gray-500">({messages.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('network')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-sm font-medium transition-colors ${
                activeTab === 'network'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Network size={14} />
              Network
              <span className="text-xs text-gray-500">({networkRequests.length})</span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopyAll}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="Copy all"
          >
            <Copy size={14} className="text-gray-600" />
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title={activeTab === 'console' ? 'Clear console' : 'Clear network'}
          >
            <Trash2 size={14} className="text-gray-600" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="Close"
          >
            <X size={14} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Network Filters */}
      {activeTab === 'network' && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by URL..."
              value={networkFilter}
              onChange={(e) => setNetworkFilter(e.target.value)}
              className="w-full pl-7 pr-3 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="all">All</option>
            <option value="2xx">2xx</option>
            <option value="3xx">3xx</option>
            <option value="4xx">4xx</option>
            <option value="5xx">5xx</option>
            <option value="error">Error</option>
          </select>
        </div>
      )}

      {/* Console Messages */}
      {activeTab === 'console' && (
        <div ref={consoleRef} className="flex-1 overflow-y-auto p-2 space-y-0.5 font-mono text-xs">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Console messages will appear here
            </div>
          ) : (
          messages.map((msg) => {
            const isExpanded = expandedMessages.has(msg.id);
            const hasObject = msg.args.some(arg => typeof arg === 'object' && arg !== null);
            const time = new Date(msg.timestamp).toLocaleTimeString();

            return (
              <div
                key={msg.id}
                className={`p-2 rounded border ${
                  msg.type === 'error' ? 'bg-red-50 border-red-200' :
                  msg.type === 'warn' ? 'bg-orange-50 border-orange-200' :
                  msg.type === 'info' ? 'bg-blue-50 border-blue-200' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <div
                  className={`flex items-start gap-2 ${hasObject ? 'cursor-pointer' : ''}`}
                  onClick={hasObject ? () => toggleExpand(msg.id) : undefined}
                >
                  {hasObject && (
                    <span className="flex-shrink-0 mt-0.5">
                      {isExpanded ? <ChevronDown size={12} className="text-gray-500" /> : <ChevronRight size={12} className="text-gray-500" />}
                    </span>
                  )}
                  <span className="flex-shrink-0 text-gray-400 mt-0.5">{getMessageIcon(msg.type)}</span>
                  <span className="flex-shrink-0 text-gray-400">{time}</span>
                  <div className={`flex-1 ${getMessageColor(msg.type)} break-all`}>
                    {msg.args.map((arg, idx) => (
                      <span key={idx} className="mr-2">
                        {typeof arg === 'object' && arg !== null ? (
                          <span className={isExpanded ? 'block whitespace-pre-wrap' : ''}>
                            {formatValue(arg, isExpanded)}
                          </span>
                        ) : (
                          formatValue(arg)
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
        </div>
      )}

      {/* Network Requests */}
      {activeTab === 'network' && (
        <div ref={networkRef} className="flex-1 overflow-y-auto">
          {filteredNetworkRequests.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              {networkRequests.length === 0 ? 'Network requests will appear here' : 'No requests match the filter'}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNetworkRequests.map((req) => {
                const time = new Date(req.timestamp).toLocaleTimeString();
                const urlParts = req.url.split('?');
                const baseUrl = urlParts[0];
                const queryString = urlParts[1];

                return (
                  <div
                    key={req.id}
                    className={`p-2 hover:bg-gray-50 transition-colors ${
                      req.error ? 'bg-red-50' :
                      req.status >= 400 ? 'bg-orange-50' :
                      req.status >= 300 ? 'bg-blue-50' :
                      ''
                    }`}
                  >
                    <div className="flex items-start gap-3 text-xs font-mono">
                      <span className="text-gray-400 flex-shrink-0">{time}</span>
                      <span className={`font-semibold flex-shrink-0 w-14 ${getMethodColor(req.method)}`}>
                        {req.method}
                      </span>
                      <span className={`font-semibold flex-shrink-0 w-8 text-right ${getStatusColor(req.status)}`}>
                        {req.status || '-'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-gray-700" title={req.url}>
                          {baseUrl}
                        </div>
                        {queryString && (
                          <div className="text-gray-400 text-[10px] truncate">?{queryString}</div>
                        )}
                      </div>
                      <span className="text-gray-400 flex-shrink-0 text-[10px]">
                        {req.duration}ms
                      </span>
                      <span className="text-gray-400 flex-shrink-0 text-[10px] uppercase">
                        {req.type}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
