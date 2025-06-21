import { NextResponse } from 'next/server';
import {
  forceResetMcpConnections,
  getMcpTools,
} from '@/lib/ai/mcp-dynamic-tools';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'reset';

    if (action === 'reset') {
      // Forza il reset delle connessioni MCP
      forceResetMcpConnections();

      // Tenta una nuova connessione per verificare che funzioni
      const tools = await getMcpTools();
      const toolCount = Object.keys(tools).length;

      return NextResponse.json({
        success: true,
        action: 'reset',
        message: 'MCP connections reset successfully',
        toolsDiscovered: toolCount,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action',
        message: 'Supported actions: reset',
      },
      { status: 400 },
    );
  } catch (error) {
    console.error('❌ Failed to reset MCP connections:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to reset MCP connections',
        action: 'reset',
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    // Restituisce lo stato delle connessioni MCP
    const tools = await getMcpTools();
    const toolCount = Object.keys(tools).length;

    return NextResponse.json({
      success: true,
      status: 'connected',
      toolsCount: toolCount,
      tools: Object.keys(tools),
      message: `MCP Hub connected with ${toolCount} tools available`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Failed to check MCP status:', error);
    return NextResponse.json(
      {
        success: false,
        status: 'disconnected',
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to connect to MCP Hub',
        toolsCount: 0,
      },
      { status: 500 },
    );
  }
}
