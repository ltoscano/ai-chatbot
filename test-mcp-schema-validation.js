#!/usr/bin/env node

/**
 * Script di test per diagnosticare problemi con i tool MCP e OpenAI schema validation
 */

import { tool } from 'ai';
import { z } from 'zod';

// Simula la funzione jsonSchemaToZod dal nostro file mcp-dynamic-tools.ts
function jsonSchemaToZod(jsonSchema) {
  if (!jsonSchema || typeof jsonSchema !== 'object') {
    return z.any();
  }

  switch (jsonSchema.type) {
    case 'string': {
      if (jsonSchema.enum) {
        return z.enum(jsonSchema.enum);
      }
      return z.string();
    }
      
    case 'number':
      return z.number();
      
    case 'integer':
      return z.number().int();
      
    case 'boolean':
      return z.boolean();
      
    case 'array': {
      if (jsonSchema.items) {
        return z.array(jsonSchemaToZod(jsonSchema.items));
      }
      return z.array(z.any());
    }
      
    case 'object': {
      if (jsonSchema.properties) {
        const shape = {};
        const required = jsonSchema.required || [];
        
        for (const [key, prop] of Object.entries(jsonSchema.properties)) {
          let fieldSchema = jsonSchemaToZod(prop);
          
          // Se il campo non è richiesto, lo rendiamo opzionale
          if (!required.includes(key)) {
            fieldSchema = fieldSchema.optional();
          }
          
          shape[key] = fieldSchema;
        }
        
        // Assicuriamoci che il shape non sia vuoto per OpenAI
        if (Object.keys(shape).length === 0) {
          console.warn('Empty object schema detected, adding default any field for OpenAI compatibility');
          return z.object({}).passthrough(); // Permette proprietà aggiuntive
        }
        
        return z.object(shape);
      }
      
      // Se non ci sono properties definite, restituiamo un record generico
      return z.record(z.any());
    }
      
    case 'null':
      return z.null();
      
    default:
      console.warn(`Unsupported JSON schema type: ${jsonSchema.type}, using z.any()`);
      return z.any();
  }
}

// Test case per diversi tipi di schema che potrebbero causare problemi
const testSchemas = [
  {
    name: 'fetch_fastmcp_documentation_problematic',
    schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'fetch_fastmcp_documentation_with_query',
    schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The query to search for in the FastMCP documentation'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'empty_object',
    schema: {
      type: 'object'
    }
  },
  {
    name: 'no_properties',
    schema: {
      type: 'object',
      properties: null
    }
  },
  {
    name: 'undefined_schema',
    schema: undefined
  },
  {
    name: 'null_schema',
    schema: null
  }
];

console.log('🧪 Testing MCP Schema Conversion for OpenAI Compatibility\n');

testSchemas.forEach((testCase, index) => {
  console.log(`\n--- Test ${index + 1}: ${testCase.name} ---`);
  console.log('📋 Original schema:', JSON.stringify(testCase.schema, null, 2));
  
  try {
    const zodSchema = jsonSchemaToZod(testCase.schema);
    console.log('✅ Successfully converted to Zod schema');
    
    // Prova a creare un tool per vedere se funziona con AI SDK
    const testTool = tool({
      description: `Test tool for ${testCase.name}`,
      parameters: zodSchema,
      execute: async (params) => {
        return `Executed with params: ${JSON.stringify(params)}`;
      }
    });
    
    console.log('✅ Successfully created AI SDK tool');
    
    // Test con diversi input
    console.log('🔧 Testing with empty object: {}');
    const result1 = await testTool.execute({});
    console.log('Result:', result1);
    
    if (testCase.name.includes('with_query')) {
      console.log('🔧 Testing with query parameter');
      const result2 = await testTool.execute({ query: 'test query' });
      console.log('Result:', result2);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
});

console.log('\n🎯 Test Complete!\n');
console.log('💡 Recommendations:');
console.log('- Empty object schemas should use z.object({}).passthrough() for OpenAI compatibility');
console.log('- Always provide default schemas for undefined/null cases');
console.log('- Test tools with both empty and populated parameters');
