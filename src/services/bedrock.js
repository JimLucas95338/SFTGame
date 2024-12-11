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
      modelId: "anthropic.claude-v2", // Changed to match your available model
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

    console.log('Making request to Bedrock with model:', command.input.modelId);
    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    return responseBody.completion;
  } catch (error) {
    console.error('Detailed error:', {
      name: error.name,
      message: error.message,
      code: error.code,
      requestId: error.$metadata?.requestId,
      status: error.status
    });
    
    return "I'm having trouble connecting. Would you like some general farming advice instead?";
  }
}
