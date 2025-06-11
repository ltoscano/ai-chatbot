import { NextResponse } from 'next/server';
import { invalidateMcpToolsCache } from '@/lib/ai/mcp-dynamic-tools';

export async function POST() {
  try {
    console.log('🔄 API endpoint called: invalidating MCP tools cache...');
    invalidateMcpToolsCache();
    console.log('✅ MCP tools cache invalidated via API');

    return NextResponse.json({
      success: true,
      message: 'MCP tools cache invalidated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Failed to invalidate MCP tools cache:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to invalidate MCP tools cache',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
