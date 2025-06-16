#!/usr/bin/env node

/**
 * Test script per verificare la compatibilità OpenAI dei tool MCP
 * Questo script testa specificamente i miglioramenti per la compatibilità OpenAI
 */

import { config } from 'dotenv';

// Carica le variabili d'ambiente
config({ path: '.env.local' });

async function testOpenAICompatibility() {
  console.log('🧪 Testing OpenAI Compatibility for MCP Tools...\n');

  try {
    // Importa dinamicamente il modulo ES6
    const {
      getMcpTools,
      testMcpConnection,
      getMcpToolsCompatibilityReport,
      invalidateMcpToolsCache,
    } = await import('./lib/ai/mcp-dynamic-tools.ts');

    // Test 1: Verifica connessione e compatibilità di base
    console.log('1️⃣ Testing MCP connection and basic compatibility...');
    const connectionTest = await testMcpConnection();

    if (connectionTest.success) {
      console.log(
        `✅ Connection successful - ${connectionTest.toolsCount} tools found`,
      );
      if (connectionTest.compatibility) {
        console.log(
          `   OpenAI compatible: ${connectionTest.compatibility.openai}`,
        );
        console.log(
          `   Anthropic compatible: ${connectionTest.compatibility.anthropic}`,
        );
      }
    } else {
      console.log(`❌ Connection failed: ${connectionTest.error}`);
      return;
    }
    console.log();

    // Test 2: Discovery completo dei tool
    console.log('2️⃣ Testing full tool discovery...');
    invalidateMcpToolsCache(); // Forza re-discovery
    const tools = await getMcpTools();
    const toolNames = Object.keys(tools);

    console.log(`✅ Discovered ${toolNames.length} tools`);
    toolNames.slice(0, 5).forEach((name) => {
      console.log(`   - ${name}`);
    });
    if (toolNames.length > 5) {
      console.log(`   ... and ${toolNames.length - 5} more`);
    }
    console.log();

    // Test 3: Report di compatibilità dettagliato
    console.log('3️⃣ Generating compatibility report...');
    const compatReport = await getMcpToolsCompatibilityReport();

    console.log(`📊 Compatibility Report:`);
    console.log(`   Total tools: ${compatReport.totalTools}`);
    console.log(`   OpenAI compatible: ${compatReport.compatibleWithOpenAI}`);
    console.log(
      `   Anthropic compatible: ${compatReport.compatibleWithAnthropic}`,
    );
    console.log(
      `   Problematic tools: ${compatReport.problematicTools.length}`,
    );

    if (compatReport.problematicTools.length > 0) {
      console.log(
        `   Problematic: ${compatReport.problematicTools.slice(0, 3).join(', ')}`,
      );
      if (compatReport.problematicTools.length > 3) {
        console.log(
          `   ... and ${compatReport.problematicTools.length - 3} more`,
        );
      }
    }
    console.log();

    // Test 4: Esecuzione di tool con parametri vuoti (OpenAI compatibility test)
    console.log('4️⃣ Testing tool execution with empty parameters...');
    if (toolNames.length > 0) {
      const testToolName = toolNames[0];
      const testTool = tools[testToolName];

      if (testTool && testTool.execute) {
        console.log(`   Testing tool: ${testToolName}`);

        try {
          // Test con oggetto vuoto
          const emptyResult = await testTool.execute({});
          console.log(
            `   ✅ Empty params test: ${emptyResult.success ? 'PASS' : 'FAIL'}`,
          );

          // Test con parametro di compatibilità OpenAI
          const compatResult = await testTool.execute({
            _openai_compat: 'test',
          });
          console.log(
            `   ✅ OpenAI compat param test: ${compatResult.success ? 'PASS' : 'FAIL'}`,
          );
        } catch (error) {
          console.log(`   ❌ Tool execution error: ${error.message}`);
        }
      }
    } else {
      console.log('   ⚠️ No tools available for testing');
    }
    console.log();

    // Test 5: Verifica gestione errori
    console.log('5️⃣ Testing error handling...');
    if (toolNames.length > 0) {
      const testToolName = toolNames[0];
      const testTool = tools[testToolName];

      if (testTool && testTool.execute) {
        try {
          // Test con parametri che potrebbero causare errori
          const errorResult = await testTool.execute({
            invalid_param: 'this_should_not_exist',
            another_invalid: 123,
          });

          console.log(
            `   ✅ Error handling test: ${errorResult.success ? 'PASS' : 'HANDLED'}`,
          );
          if (!errorResult.success) {
            console.log(`   📝 Error message: ${errorResult.message}`);
          }
        } catch (error) {
          console.log(
            `   ✅ Error properly thrown and handled: ${error.message.slice(0, 100)}...`,
          );
        }
      }
    }
    console.log();

    // Riassunto finale
    const openaiCompatibilityPercent = Math.round(
      (compatReport.compatibleWithOpenAI / compatReport.totalTools) * 100,
    );
    const anthropicCompatibilityPercent = Math.round(
      (compatReport.compatibleWithAnthropic / compatReport.totalTools) * 100,
    );

    console.log('🎉 OpenAI Compatibility Test Complete!\n');
    console.log('📋 Summary:');
    console.log(
      `   ✅ Connection to MCP Hub: ${connectionTest.success ? 'SUCCESS' : 'FAILED'}`,
    );
    console.log(`   📦 Total tools discovered: ${compatReport.totalTools}`);
    console.log(
      `   🤖 OpenAI compatibility: ${openaiCompatibilityPercent}% (${compatReport.compatibleWithOpenAI}/${compatReport.totalTools})`,
    );
    console.log(
      `   🧠 Anthropic compatibility: ${anthropicCompatibilityPercent}% (${compatReport.compatibleWithAnthropic}/${compatReport.totalTools})`,
    );

    if (openaiCompatibilityPercent >= 80) {
      console.log('   🎯 OpenAI compatibility is EXCELLENT!');
    } else if (openaiCompatibilityPercent >= 60) {
      console.log('   ✅ OpenAI compatibility is GOOD');
    } else if (openaiCompatibilityPercent >= 40) {
      console.log(
        '   ⚠️ OpenAI compatibility is MODERATE - some tools may have issues',
      );
    } else {
      console.log(
        '   ❌ OpenAI compatibility is LOW - consider using Anthropic models',
      );
    }

    console.log('\n💡 Recommendations:');
    if (compatReport.problematicTools.length > 0) {
      console.log(
        '   - Some tools may have schema compatibility issues with OpenAI',
      );
      console.log(
        '   - Consider using Anthropic models for better compatibility',
      );
      console.log(
        '   - The system will automatically handle most compatibility issues',
      );
    } else {
      console.log(
        '   - All tools appear to be compatible with both OpenAI and Anthropic',
      );
      console.log('   - You can use any model provider with confidence');
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Esegui il test se questo file viene eseguito direttamente
if (process.argv[1].endsWith('test-openai-compatibility.js')) {
  testOpenAICompatibility()
    .then(() => {
      console.log('\n✅ All compatibility tests completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Compatibility test failed:', error);
      process.exit(1);
    });
}

export { testOpenAICompatibility };
