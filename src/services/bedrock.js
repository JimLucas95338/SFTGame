import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// Create Bedrock client using environment variables
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.REACT_APP_AWS_REGION,
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
  }
});

export async function getFarmingAdvice(gameState, message) {
  try {
    // Build context for the AI
    const gameContext = `
      Current farm state:
      - Weather: ${gameState.weather}
      - Temperature: ${gameState.temperature}°F
      - Moisture: ${gameState.moisture}%
      - Money: $${gameState.money}
      - Day: ${gameState.day}
      
      Player question: "${message}"
    `;

    const prompt = `\n\nHuman: You are an AI farming advisor in a farming simulation game. Provide specific farming advice based on current conditions.

    ${gameContext}

    Please give detailed recommendations about what actions to take.

    Assistant: Let me analyze your farm's conditions and provide strategic advice.`;

    // Send request to Bedrock
    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-v2",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        prompt: prompt,
        max_tokens_to_sample: 300,
        temperature: 0.7,
        top_k: 250,
        top_p: 0.999,
        stop_sequences: ["\n\nHuman:"]
      })
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    return responseBody.completion;

  } catch (error) {
    console.error('Error getting AI farming advice:', error);
    // Fallback to basic advice if AI fails
    return `Based on current conditions (${gameState.weather}, ${gameState.temperature}°F), focus on maintaining crop health and monitoring moisture levels.`;
  }
}
