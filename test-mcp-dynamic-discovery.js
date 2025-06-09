#!/usr/bin/env node

// Test per verificare il sistema di discovery dinamico dei tool MCP
const { config } = require('dotenv');

// Carica le variabili d'ambiente
config({ path: '.env.local' });

async function testMcpDynamicDiscovery() {
  console.log('🧪 Testing MCP Dynamic Discovery System...\n');

  try {
    // Importa dinamicamente il modulo ES6
    const {
      discoverAndRegisterMcpTools,
      getMcpTools,
      invalidateMcpToolsCache,
    } = await import('./lib/ai/mcp-dynamic-tools.ts');

    // Test 1: Discovery iniziale
    console.log('1️⃣ Testing initial discovery...');
    const tools1 = await discoverAndRegisterMcpTools();
    console.log(`✅ Discovered ${Object.keys(tools1).length} tools:`);
    Object.keys(tools1).forEach((toolName) => {
      console.log(`   - ${toolName}`);
    });
    console.log();

    // Test 2: Cache hit
    console.log('2️⃣ Testing cache hit...');
    const startTime = Date.now();
    const tools2 = await getMcpTools();
    const endTime = Date.now();
    console.log(`✅ Cache hit in ${endTime - startTime}ms`);
    console.log(
      `   Same tools count: ${Object.keys(tools2).length === Object.keys(tools1).length}`,
    );
    console.log();

    // Test 3: Invalidate cache e re-discovery
    console.log('3️⃣ Testing cache invalidation...');
    invalidateMcpToolsCache();
    const tools3 = await getMcpTools();
    console.log(
      `✅ Re-discovered ${Object.keys(tools3).length} tools after cache invalidation`,
    );
    console.log();

    // Test 4: Verifica struttura tool
    console.log('4️⃣ Testing tool structure...');
    const toolNames = Object.keys(tools3);
    if (toolNames.length > 0) {
      const firstTool = tools3[toolNames[0]];
      console.log(`✅ First tool (${toolNames[0]}) structure:`);
      console.log(`   - Has description: ${!!firstTool.description}`);
      console.log(`   - Has parameters: ${!!firstTool.parameters}`);
      console.log(
        `   - Has execute function: ${typeof firstTool.execute === 'function'}`,
      );
    } else {
      console.log('⚠️  No tools discovered - check MCP_HUB_URL configuration');
    }
    console.log();

    console.log('🎉 All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Esegui il test
testMcpDynamicDiscovery().catch(console.error);
