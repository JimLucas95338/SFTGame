import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.REACT_APP_AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
  }
});

function analyzeFarmState(gameState, grid) {
  const plantedCrops = grid.flat().filter(cell => cell !== null);
  const readyCrops = plantedCrops.filter(crop => crop.ready);
  const cropTypes = new Set(plantedCrops.map(crop => crop.type));
  
  return {
    plantedCount: plantedCrops.length,
    readyCount: readyCrops.length,
    diversity: cropTypes.size,
    availablePlots: 36 - plantedCrops.length,
    weatherCondition: gameState.weather,
    temperature: gameState.temperature,
    moisture: gameState.moisture,
    financialHealth: gameState.money > 500 ? 'good' : 'concerning',
    hasLoans: gameState.loans > 0,
    hasSensors: gameState.sensors.length > 0
  };
}

export async function getFarmingAdvice(gameState, message, grid) {
  try {
    const farmAnalysis = analyzeFarmState(gameState, grid);
    
    const systemPrompt = `You are a friendly and knowledgeable farming advisor AI in a farming simulation game.
    You should maintain a natural, conversational tone while being helpful and specific with your advice.

    Current farm status:
    - Weather: ${gameState.weather}
    - Temperature: ${gameState.temperature}°F
    - Moisture: ${gameState.moisture}%
    - Money: $${gameState.money}
    - Loans: $${gameState.loans}
    - Sensors: ${gameState.sensors.length}
    - Planted crops: ${farmAnalysis.plantedCount}/36 plots
    - Ready to harvest: ${farmAnalysis.readyCount}
    - Crop diversity: ${farmAnalysis.diversity} types

    Game mechanics:
    - Players manage a 6x6 grid (36 plots)
    - Weather affects crop growth and yields
    - Sensors improve yields
    - Loans are available with 1% daily interest
    
    Available crops:
    - Corn: 60-85°F, 60% moisture, $25 cost, $100 value, 3 days growth
    - Wheat: 55-75°F, 40% moisture, $15 cost, $75 value, 2 days growth
    - Tomato: 65-90°F, 75% moisture, $35 cost, $150 value, 4 days growth

    Whether the player is asking about farming or just chatting, be friendly and natural in your responses.
    If they ask about farming, include specific advice based on their current farm conditions.`;

    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
        top_p: 0.9,
      })
    });

    const response = await bedrockClient.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    return result.messages?.[0]?.content || result.completion;

  } catch (error) {
    console.error('Error in getFarmingAdvice:', error);
    
    // Fallback responses if the LLM call fails
    const fallbacks = [
      "I'm experiencing some technical difficulties. In the meantime, I notice you have crops that need attention. Would you like to discuss your current farm status?",
      "I'll be back to normal shortly. For now, let me know if you need help with your crops or weather planning.",
      "I'm having trouble connecting, but I can see your farm needs attention. What would you like to know about first?"
    ];
    
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}
