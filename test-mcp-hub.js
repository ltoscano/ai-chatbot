import { mcpHub } from './lib/ai/tools/mcp-hub.js';

// Test the MCP Hub tool with the new @agentic implementation
process.env.MCP_HUB_URL = 'https://agentic.so/tools/mcp';

async function testMcpHub() {
  console.log('Testing MCP Hub tool with @agentic/mcp...');

  try {
    // Test listing tools
    console.log('\n1. Testing list_tools action...');
    const listResult = await mcpHub.execute({
      action: 'list_tools',
    });
    console.log('List tools result:', JSON.stringify(listResult, null, 2));

    if (listResult.success && listResult.tools && listResult.tools.length > 0) {
      // Test calling the first available tool
      const firstTool = listResult.tools[0];
      console.log(`\n2. Testing call_tool action with '${firstTool.name}'...`);

      const callResult = await mcpHub.execute({
        action: 'call_tool',
        tool_name: firstTool.name,
        tool_parameters: {}, // Empty parameters for basic test
      });
      console.log('Call tool result:', JSON.stringify(callResult, null, 2));
    } else {
      console.log('No tools available for testing call_tool action.');
    }
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testMcpHub()
    .then(() => {
      console.log('\nTest completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export { testMcpHub };
