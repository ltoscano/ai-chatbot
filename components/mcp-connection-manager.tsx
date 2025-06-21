'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wifi, WifiOff, AlertCircle } from 'lucide-react';

interface McpConnectionStatus {
  success: boolean;
  status: 'connected' | 'disconnected';
  toolsCount: number;
  message: string;
  error?: string;
}

export function McpConnectionManager() {
  const [status, setStatus] = useState<McpConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/mcp/reset');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      setStatus({
        success: false,
        status: 'disconnected',
        toolsCount: 0,
        message: 'Failed to check MCP status',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetConnections = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/mcp/reset?action=reset', {
        method: 'POST',
      });
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      setStatus({
        success: false,
        status: 'disconnected',
        toolsCount: 0,
        message: 'Failed to reset MCP connections',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (isLoading) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (!status) return <AlertCircle className="h-4 w-4" />;
    if (status.success && status.status === 'connected') {
      return <Wifi className="h-4 w-4 text-green-500" />;
    }
    return <WifiOff className="h-4 w-4 text-red-500" />;
  };

  const getStatusColor = () => {
    if (!status) return 'text-gray-500';
    if (status.success && status.status === 'connected') {
      return 'text-green-600';
    }
    return 'text-red-600';
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          MCP Hub
        </span>
      </div>

      {status && (
        <div className="flex-1 text-sm text-gray-600">
          {status.success ? (
            <span>
              {status.toolsCount} tools available
            </span>
          ) : (
            <span>
              {status.error || status.message}
            </span>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={checkStatus}
          disabled={isLoading}
          className="text-xs"
        >
          Check Status
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={resetConnections}
          disabled={isLoading}
          className="text-xs"
        >
          Reset Connection
        </Button>
      </div>
    </div>
  );
}

export default McpConnectionManager;
