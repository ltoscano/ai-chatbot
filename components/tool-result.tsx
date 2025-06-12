import React from 'react';
import { CheckCircle, XCircle, Wrench } from 'lucide-react';

interface ToolResultProps {
  result: any;
  toolName: string;
}

export function ToolResult({ result, toolName }: ToolResultProps) {
  // Check if we should show simplified messages
  const showRawResponse =
    process.env.NEXT_PUBLIC_MCP_HUB_SHOW_RAW_RESPONSE !== 'FALSE';

  // Verifica se il risultato indica un errore
  const isError =
    result &&
    typeof result === 'object' &&
    (('success' in result && !result.success) || 'error' in result);

  const isSuccess =
    result &&
    typeof result === 'object' &&
    'success' in result &&
    result.success;

  if (isError) {
    if (!showRawResponse) {
      return (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
            <XCircle size={16} />
            Tool Error: {toolName}
          </div>
        </div>
      );
    }

    return (
      <div className="border border-red-200 bg-red-50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
          <XCircle size={16} />
          Tool Error: {toolName}
        </div>
        <div className="text-red-600 text-sm">
          {result.error || result.message || 'Tool execution failed'}
        </div>
      </div>
    );
  }

  if (isSuccess) {
    if (!showRawResponse) {
      return (
        <div className="border border-green-200 bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
            <CheckCircle size={16} />
            Tool Success: {toolName}
          </div>
        </div>
      );
    }

    return (
      <div className="border border-green-200 bg-green-50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
          <CheckCircle size={16} />
          Tool Success: {toolName}
        </div>
        {result.result && (
          <div className="bg-white border rounded p-3 mt-2">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
              {typeof result.result === 'string'
                ? result.result
                : JSON.stringify(result.result, null, 2)}
            </pre>
          </div>
        )}
        {result.content && (
          <div className="bg-white border rounded p-3 mt-2">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
              {typeof result.content === 'string'
                ? result.content
                : JSON.stringify(result.content, null, 2)}
            </pre>
          </div>
        )}
        {result.message && (
          <div className="text-green-600 text-sm mt-2">{result.message}</div>
        )}
      </div>
    );
  }

  // Fallback per risultati non strutturati
  if (!showRawResponse) {
    return (
      <div className="border border-gray-200 bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-gray-700 font-semibold mb-2">
          <Wrench size={16} />
          Tool Result: {toolName}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-2 text-gray-700 font-semibold mb-2">
        <Wrench size={16} />
        Tool Result: {toolName}
      </div>
      <div className="bg-white border rounded p-3">
        <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
          {typeof result === 'string'
            ? result
            : JSON.stringify(result, null, 2)}
        </pre>
      </div>
    </div>
  );
}
