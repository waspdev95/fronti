import { useState, useEffect, useRef } from 'react';
import { Terminal, X, Copy, Ban, ChevronRight, ChevronDown, Network, Search } from 'lucide-react';
import { Tooltip } from './Tooltip';

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
  const [resourceTypeFilter, setResourceTypeFilter] = useState<'all' | 'fetch' | 'xhr' | 'doc' | 'css' | 'js' | 'font' | 'img' | 'media' | 'other'>('all');
  const [consoleLogLevelFilter, setConsoleLogLevelFilter] = useState<'all' | 'log' | 'error' | 'warn' | 'info'>('all');
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

  // Map resource types to filter categories
  const getResourceCategory = (type: string): string => {
    const lowerType = type.toLowerCase();
    if (lowerType === 'fetch') return 'fetch';
    if (lowerType === 'xhr') return 'xhr';
    if (lowerType === 'document') return 'doc';
    if (lowerType === 'stylesheet') return 'css';
    if (lowerType === 'script') return 'js';
    if (lowerType === 'font') return 'font';
    if (lowerType === 'image') return 'img';
    if (lowerType === 'media' || lowerType === 'video' || lowerType === 'audio') return 'media';
    return 'other';
  };

  // Filter console messages by log level
  const filteredConsoleMessages = messages.filter(msg => {
    if (consoleLogLevelFilter === 'all') return true;
    return msg.type === consoleLogLevelFilter;
  });

  // Count messages by type
  const consoleCounts = {
    all: messages.length,
    error: messages.filter(m => m.type === 'error').length,
    warn: messages.filter(m => m.type === 'warn').length,
    info: messages.filter(m => m.type === 'info').length,
    log: messages.filter(m => m.type === 'log').length,
  };

  // Filter network requests
  const filteredNetworkRequests = networkRequests.filter(req => {
    // Text filter
    if (networkFilter && !req.url.toLowerCase().includes(networkFilter.toLowerCase())) {
      return false;
    }

    // Resource type filter
    if (resourceTypeFilter !== 'all') {
      const category = getResourceCategory(req.type);
      if (resourceTypeFilter === 'fetch' && category !== 'fetch' && category !== 'xhr') return false;
      if (resourceTypeFilter !== 'fetch' && category !== resourceTypeFilter) return false;
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
          <Tooltip content="Copy all">
            <button
              onClick={handleCopyAll}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            >
              <Copy size={14} className="text-gray-600" />
            </button>
          </Tooltip>
          <Tooltip content={activeTab === 'console' ? 'Clear console' : 'Clear network'}>
            <button
              onClick={handleClear}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            >
              <Ban size={14} className="text-gray-600" />
            </button>
          </Tooltip>
          <Tooltip content="Close console">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            >
              <X size={14} className="text-gray-600" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Console Filters */}
      {activeTab === 'console' && (
        <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200 bg-gray-50 flex-wrap">
          {[
            { value: 'all', label: 'All', count: consoleCounts.all },
            { value: 'error', label: 'Errors', count: consoleCounts.error },
            { value: 'warn', label: 'Warnings', count: consoleCounts.warn },
            { value: 'info', label: 'Info', count: consoleCounts.info },
            { value: 'log', label: 'Logs', count: consoleCounts.log },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setConsoleLogLevelFilter(filter.value as any)}
              className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                consoleLogLevelFilter === filter.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              {filter.label} {filter.count > 0 && <span className="opacity-70">({filter.count})</span>}
            </button>
          ))}
        </div>
      )}

      {/* Network Filters */}
      {activeTab === 'network' && (
        <div className="flex flex-col gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50">
          {/* Search filter */}
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

          {/* Resource type filters */}
          <div className="flex items-center gap-1 flex-wrap">
            {[
              { value: 'all', label: 'All' },
              { value: 'fetch', label: 'Fetch/XHR' },
              { value: 'doc', label: 'Doc' },
              { value: 'css', label: 'CSS' },
              { value: 'js', label: 'JS' },
              { value: 'font', label: 'Font' },
              { value: 'img', label: 'Img' },
              { value: 'media', label: 'Media' },
              { value: 'other', label: 'Other' },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setResourceTypeFilter(filter.value as any)}
                className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                  resourceTypeFilter === filter.value
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Console Messages */}
      {activeTab === 'console' && (
        <div ref={consoleRef} className="flex-1 overflow-y-auto p-2 space-y-0.5 text-xs">
          {filteredConsoleMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              {messages.length === 0 ? 'Console messages will appear here' : 'No messages match the filter'}
            </div>
          ) : (
          filteredConsoleMessages.map((msg) => {
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
        <div ref={networkRef} className="flex-1 overflow-y-auto flex flex-col">
          {filteredNetworkRequests.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              {networkRequests.length === 0 ? 'Network requests will appear here' : 'No requests match the filter'}
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="sticky top-0 bg-gray-100 border-b border-gray-300 px-2 py-1.5 flex items-center gap-3 text-xs font-semibold text-gray-700">
                <span className="flex-shrink-0 w-16">Time</span>
                <span className="flex-shrink-0 w-14">Method</span>
                <span className="flex-shrink-0 w-12 text-center">Status</span>
                <span className="flex-1 min-w-0">URL</span>
                <span className="flex-shrink-0 w-16 text-right">Time</span>
                <span className="flex-shrink-0 w-16">Type</span>
              </div>

              {/* Table Body */}
              <div className="flex-1 divide-y divide-gray-200">
                {filteredNetworkRequests.map((req) => {
                  const time = new Date(req.timestamp).toLocaleTimeString();
                  const urlParts = req.url.split('?');
                  const baseUrl = urlParts[0];
                  const queryString = urlParts[1];

                  return (
                    <div
                      key={req.id}
                      className={`px-2 py-1.5 hover:bg-gray-50 transition-colors ${
                        req.error ? 'bg-red-50' :
                        req.status >= 400 ? 'bg-orange-50' :
                        req.status >= 300 ? 'bg-blue-50' :
                        ''
                      }`}
                    >
                      <div className="flex items-start gap-3 text-xs">
                        <span className="text-gray-500 flex-shrink-0 w-16">{time}</span>
                        <span className={`font-semibold flex-shrink-0 w-14 ${getMethodColor(req.method)}`}>
                          {req.method}
                        </span>
                        <span className={`font-semibold flex-shrink-0 w-12 text-center ${getStatusColor(req.status)}`}>
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
                        <span className="text-gray-500 flex-shrink-0 w-16 text-right">
                          {req.duration}ms
                        </span>
                        <span className="text-gray-500 flex-shrink-0 w-16 text-[10px] uppercase">
                          {req.type}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
