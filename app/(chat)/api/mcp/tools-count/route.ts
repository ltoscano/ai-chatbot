import { NextResponse } from 'next/server';
import {
  getMcpTools,
  discoverAndRegisterMcpTools,
  invalidateMcpToolsCache,
} from '@/lib/ai/mcp-dynamic-tools';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    console.log(
      `📊 API endpoint called: getting MCP tools count (forceRefresh: ${forceRefresh})...`,
    );

    let tools: Record<string, any>;

    if (forceRefresh) {
      // Forza l'invalidazione della cache e la riscoperta
      console.log(
        '🔄 Force refresh: invalidating cache and rediscovering tools...',
      );
      invalidateMcpToolsCache();
      tools = await discoverAndRegisterMcpTools();
    } else {
      // Usa la normale logica di cache
      tools = await getMcpTools();
    }

    const toolsCount = Object.keys(tools).length;
    console.log(
      `✅ MCP tools count retrieved: ${toolsCount} (fromCache: ${!forceRefresh})`,
    );

    return NextResponse.json({
      success: true,
      count: toolsCount,
      fromCache: !forceRefresh,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Failed to get MCP tools count:', error);
    return NextResponse.json(
      {
        success: false,
        count: 0,
        message: 'Failed to get MCP tools count',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
