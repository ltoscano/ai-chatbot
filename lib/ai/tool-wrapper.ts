import { ToolError } from '@/lib/errors';

/**
 * Wrapper per i tool che garantisce che gli errori vengano gestiti in modo user-friendly
 * invece di interrompere lo stream della chat
 */
export function wrapToolExecution<T extends (...args: any[]) => any>(
  toolName: string,
  originalExecute: T,
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      const result = await originalExecute(...args);

      // Se il risultato è già un oggetto con success/error, lo restituiamo come è
      if (
        typeof result === 'object' &&
        result !== null &&
        'success' in result
      ) {
        return result;
      }

      // Altrimenti wrappiamo il risultato in un formato standardizzato
      return {
        success: true,
        result: result,
        message: `Tool ${toolName} executed successfully`,
      } as ReturnType<T>;
    } catch (error) {
      console.error(`❌ Tool ${toolName} execution failed:`, error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Invece di propagare l'eccezione, ritorniamo un oggetto di errore
      return {
        success: false,
        error: errorMessage,
        toolName: toolName,
        message: `Tool ${toolName} failed: ${errorMessage}`,
      } as ReturnType<T>;
    }
  }) as T;
}

/**
 * Wrapper per tool che potrebbero lanciare ToolError o altre eccezioni
 */
export function safeToolWrapper(tool: any) {
  if (!tool || typeof tool.execute !== 'function') {
    return tool;
  }

  return {
    ...tool,
    execute: wrapToolExecution(tool.description || 'unknown', tool.execute),
  };
}
