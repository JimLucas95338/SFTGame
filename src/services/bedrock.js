import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.REACT_APP_AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
  }
});

export async function getFarmingAdvice(gameState, message) {
  try {
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
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0", // Updated to correct model ID
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: gameContext
          }
        ],
        temperature: 0.7
      })
    });

    console.log('Making request to Bedrock with:', {
      modelId: command.input.modelId,
      region: bedrockClient.config.region
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    console.log('Response from Bedrock:', responseBody);

    return responseBody.completion || responseBody.content;
  } catch (error) {
    console.error('Detailed error:', {
      name: error.name,
      message: error.message,
      code: error.code,
      requestId: error.$metadata?.requestId,
      region: bedrockClient.config.region,
      status: error.status
    });
    
    return "I'm having trouble connecting. Would you like some general farming advice instead?";
  }
}
