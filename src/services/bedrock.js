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
    // Build rich context for the AI
    const gameContext = `
      Current Farm State:
      - Day: ${gameState.day}
      - Weather: ${gameState.weather} with ${gameState.temperature}°F
      - Moisture Level: ${gameState.moisture}%
      - Available Funds: $${gameState.money}

      Crop Information:
      - Corn: Needs 60-85°F, 60% moisture, $25 to plant
      - Wheat: Needs 55-75°F, 40% moisture, $15 to plant
      - Tomato: Needs 65-90°F, 75% moisture, $35 to plant

      Player question: "${message}"
    `;

    const prompt = `\n\nHuman: You are an AI farming advisor in a farming simulation game. Be helpful and specific, considering:
    - Current weather and temperature conditions
    - Crop requirements and costs
    - Player's available funds
    - Long-term planning and risk management
    
    Consider yourself a seasoned farmer with deep practical knowledge. Use a friendly, conversational tone but stay focused on giving actionable advice.
    
    ${gameContext}

    Assistant: Let me provide specific farming advice based on your current situation.`;

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
    return `Based on current conditions (${gameState.weather}, ${gameState.temperature}°F), I recommend focusing on crop health and resource management. Let me know if you have specific questions about any crops or farming strategies.`;
  }
}
