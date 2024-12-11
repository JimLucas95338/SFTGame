import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// Debug logging for credentials
console.log('AWS Region:', process.env.REACT_APP_AWS_REGION);
console.log('Access Key ID exists:', !!process.env.REACT_APP_AWS_ACCESS_KEY_ID);
console.log('Secret Key exists:', !!process.env.REACT_APP_AWS_SECRET_ACCESS_KEY);

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.REACT_APP_AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
  },
  endpoint: `https://bedrock-runtime.us-west-2.amazonaws.com`
});

export async function getFarmingAdvice(gameState, message) {
  try {
    // Log configuration before making the request
    console.log('Bedrock Client Config:', {
      region: bedrockClient.config.region,
      endpoint: bedrockClient.config.endpoint,
      credentials: 'Configured:' + !!bedrockClient.config.credentials
    });

    const gameContext = `
      You are a friendly AI farm advisor who enjoys chatting with farmers. While you know all about farming and current conditions:
      - Weather: ${gameState.weather}
      - Temperature: ${gameState.temperature}°F
      - Moisture: ${gameState.moisture}%
      - Available Money: $${gameState.money}
      - Current Day: ${gameState.day}

      Player message: "${message}"
    `;

    const prompt = `\n\nHuman: ${gameContext}

    Assistant: Let me respond naturally as a friendly farm advisor.`;

    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-v2",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        prompt: prompt,
        max_tokens_to_sample: 500,
        temperature: 0.9,
        top_k: 250,
        top_p: 0.999,
        stop_sequences: ["\n\nHuman:"]
      })
    });

    // Log the request being made
    console.log('Making request to Bedrock with command:', {
      modelId: command.input.modelId,
      endpoint: bedrockClient.config.endpoint
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    return responseBody.completion;

  } catch (error) {
    console.error('Detailed error:', {
      name: error.name,
      message: error.message,
      code: error.code,
      requestId: error.$metadata?.requestId,
      status: error.$metadata?.httpStatusCode
    });

    return "I'm having trouble connecting to my farming knowledge. Please check the configuration.";
  }
}
