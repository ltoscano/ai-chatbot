const { vertex } = require('@ai-sdk/google-vertex');

async function testVertex() {
  try {
    console.log('Testing Vertex AI connection...');

    // Test environment variables
    console.log('GOOGLE_VERTEX_PROJECT:', process.env.GOOGLE_VERTEX_PROJECT);
    console.log('GOOGLE_VERTEX_LOCATION:', process.env.GOOGLE_VERTEX_LOCATION);
    console.log(
      'GOOGLE_APPLICATION_CREDENTIALS:',
      process.env.GOOGLE_APPLICATION_CREDENTIALS,
    );

    // Create the model
    const model = vertex('gemini-1.5-pro');
    console.log('Model created successfully');

    // Test a simple call
    const response = await model.doGenerate({
      inputFormat: 'messages',
      mode: { type: 'regular' },
      prompt: {
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Hello, just say "test successful"' },
            ],
          },
        ],
      },
    });

    console.log('Response:', response);
  } catch (error) {
    console.error('Error testing Vertex AI:', error);
  }
}

testVertex();
