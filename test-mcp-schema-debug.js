#!/usr/bin/env node

/**
 * Script di test per verificare i tool MCP e identificare problemi di schema
 * Eseguire con: node test-mcp-schema-debug.js
 */

const {
  getMcpTools,
  testMcpConnection,
  invalidateMcpToolsCache,
} = require('./lib/ai/mcp-dynamic-tools.ts');

async function testMcpSchema() {
  console.log('🧪 Testing MCP Schema Validation...\n');

  try {
    // Test 1: Connessione base
    console.log('1️⃣ Testing MCP connection...');
    const connectionTest = await testMcpConnection();

    if (!connectionTest.success) {
      console.error('❌ Connection failed:', connectionTest.error);
      return;
    }

    console.log('✅ Connection successful');
    console.log(
      `📦 Found ${connectionTest.toolsCount} tools:`,
      connectionTest.tools,
    );
    console.log('');

    // Test 2: Scoperta e registrazione tool
    console.log('2️⃣ Testing tool discovery and schema conversion...');

    // Invalida la cache per un test pulito
    invalidateMcpToolsCache();

    const tools = await getMcpTools();
    const toolNames = Object.keys(tools);

    console.log(`✅ Successfully registered ${toolNames.length} tools:`);
    toolNames.forEach((name) => console.log(`  - ${name}`));
    console.log('');

    // Test 3: Verifica schema specifici
    console.log('3️⃣ Testing specific tool schemas...');

    for (const [toolName, tool] of Object.entries(tools)) {
      try {
        console.log(`🔍 Testing ${toolName}...`);

        // Prova a eseguire il tool con parametri vuoti per testare lo schema
        const testResult = await tool.execute({});
        console.log(`  ✅ Schema validation passed for ${toolName}`);
      } catch (error) {
        console.error(
          `  ❌ Schema validation failed for ${toolName}:`,
          error.message,
        );

        // Verifica se è un errore di schema OpenAI
        if (
          error.message.includes('object schema missing properties') ||
          error.message.includes('invalid schema')
        ) {
          console.error(`  🚨 OpenAI schema validation issue detected!`);
        }
      }
    }

    console.log('\n✅ MCP Schema test completed successfully!');
  } catch (error) {
    console.error('❌ MCP Schema test failed:', error);

    if (error.message.includes('object schema missing properties')) {
      console.error('\n🚨 This looks like the OpenAI schema validation issue!');
      console.error('💡 Try using an Anthropic model instead of OpenAI GPT-4o');
    }
  }
}

// Esegui il test se chiamato direttamente
if (require.main === module) {
  testMcpSchema().catch(console.error);
}

module.exports = { testMcpSchema };
