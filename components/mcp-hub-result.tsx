import React from 'react';
import { CheckCircle, XCircle, Wrench, List, Play } from 'lucide-react';

interface McpHubResultProps {
  result: {
    success: boolean;
    action?: string;
    tools?: Array<{
      name: string;
      description: string;
      parameters?: Record<string, any>;
    }>;
    tool_name?: string;
    result?: any;
    error?: string;
    message?: string;
  };
}

export function McpHubResult({ result }: McpHubResultProps) {
  const {
    success,
    action,
    tools,
    tool_name,
    result: toolResult,
    error,
    message,
  } = result;

  if (!success) {
    return (
      <div className="border border-red-200 bg-red-50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
          <XCircle size={16} />
          MCP Hub Error
        </div>
        <div className="text-red-600 text-sm">
          {error || message || 'Unknown error occurred'}
        </div>
      </div>
    );
  }

  if (action === 'list_tools' && tools) {
    return (
      <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-blue-700 font-semibold mb-3">
          <List size={16} />
          Available MCP Tools ({tools.length})
        </div>
        <div className="space-y-2">
          {tools.map((tool) => (
            <div key={tool.name} className="bg-white border rounded p-3">
              <div className="flex items-center gap-2 mb-1">
                <Wrench size={14} className="text-blue-600" />
                <span className="font-medium text-gray-900">{tool.name}</span>
              </div>
              <div className="text-sm text-gray-600">{tool.description}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (action === 'call_tool' && tool_name) {
    return (
      <div className="border border-green-200 bg-green-50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-green-700 font-semibold mb-3">
          <CheckCircle size={16} />
          Tool Executed: {tool_name}
        </div>
        {toolResult && (
          <div className="bg-white border rounded p-3">
            <div className="flex items-center gap-2 mb-2">
              <Play size={14} className="text-green-600" />
              <span className="font-medium text-gray-900">Result</span>
            </div>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
              {typeof toolResult === 'string'
                ? toolResult
                : JSON.stringify(toolResult, null, 2)}
            </pre>
          </div>
        )}
        {message && (
          <div className="text-green-600 text-sm mt-2">{message}</div>
        )}
      </div>
    );
  }

  // Fallback for unknown actions
  return (
    <div className="border border-gray-200 bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-2 text-gray-700 font-semibold mb-2">
        <CheckCircle size={16} />
        MCP Hub Response
      </div>
      <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}
