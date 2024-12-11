import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.REACT_APP_AWS_REGION,
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
  }
});

export async function getFarmingAdvice(gameState, message) {
  try {
    const prompt = `\n\nHuman: You are an AI farming advisor in a farming simulation game. Here is the current game state:
    
    Weather: ${gameState.weather}
    Temperature: ${gameState.temperature}°F
    Moisture: ${gameState.moisture}%
    Money: $${gameState.money}
    Day: ${gameState.day}
    Sensors: ${gameState.sensors.length}
    
    The player asks: "${message}"
    
    Provide brief, specific advice (2-3 sentences) about what actions they should take based on the current conditions.

    Assistant: Let me analyze your farm's current state and provide specific advice.`;

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
    console.error('Error getting AI advice:', error);
    return "I'm having trouble connecting to the advisory system. Please try again later.";
  }
}
