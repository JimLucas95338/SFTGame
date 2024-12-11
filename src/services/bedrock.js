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
    // Calculate which crops would thrive in current conditions
    const suitableCrops = {
      CORN: gameState.temperature >= 60 && gameState.temperature <= 85 && gameState.moisture >= 55,
      WHEAT: gameState.temperature >= 55 && gameState.temperature <= 75 && gameState.moisture >= 35,
      TOMATO: gameState.temperature >= 65 && gameState.temperature <= 90 && gameState.moisture >= 70
    };

    const recommendations = Object.entries(suitableCrops)
      .filter(([, suitable]) => suitable)
      .map(([crop]) => crop);

    const gameContext = `
      Current Farm Status:
      - Day: ${gameState.day}
      - Weather: ${gameState.weather}
      - Temperature: ${gameState.temperature}°F
      - Moisture: ${gameState.moisture}%
      - Available Money: $${gameState.money}

      Currently Suitable Crops: ${recommendations.join(', ') || 'Conditions are challenging for all crops'}

      Crop Requirements:
      - Corn ($25): Needs 60-85°F and 60% moisture
      - Wheat ($15): Needs 55-75°F and 40% moisture
      - Tomato ($35): Needs 65-90°F and 75% moisture

      Player question: "${message}"
    `;

    const prompt = `\n\nHuman: You are an experienced farming advisor in a farming simulation game. Provide specific, practical advice based on current conditions. Your responses should be:
    - Specific to the player's question
    - Consider current weather conditions and funds
    - Include clear recommendations
    - Explain the reasoning behind your advice
    - Be brief but informative
    
    ${gameContext}

    Assistant: Let me analyze your farm's current conditions and provide targeted advice.`;

    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-v2",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        prompt: prompt,
        max_tokens_to_sample: 300,
        temperature: 0.8,  // Increased for more response variation
        top_k: 250,
        top_p: 0.999,
        stop_sequences: ["\n\nHuman:"]
      })
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    // Add some randomization to the fallback response if AI fails
    const fallbackResponses = [
      `With ${gameState.weather} weather at ${gameState.temperature}°F, ${recommendations.length > 0 ? recommendations[0] : 'wheat'} might be a good choice. What's your farming strategy?`,
      `Current conditions are good for ${recommendations.join(' or ')}. Would you like specific planting advice?`,
      `I recommend focusing on ${recommendations[0]} given the current weather. How can I help with your farming decisions?`
    ];

    return responseBody.completion || fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

  } catch (error) {
    console.error('Error getting AI farming advice:', error);
    return `With ${gameState.temperature}°F and ${gameState.moisture}% moisture, consider focusing on weather-appropriate crops. What would you like to know about specific crops?`;
  }
}
