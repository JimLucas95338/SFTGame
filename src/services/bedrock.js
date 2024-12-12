import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.REACT_APP_AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
  }
});

// Helper to analyze current farm conditions
function analyzeConditions(gameState, grid) {
  const plantedCrops = grid.flat().filter(cell => cell !== null);
  const readyCrops = plantedCrops.filter(crop => crop.ready);
  const cropTypes = new Set(plantedCrops.map(crop => crop.type));
  
  return {
    plantedCount: plantedCrops.length,
    readyCount: readyCrops.length,
    diversity: cropTypes.size,
    availablePlots: 36 - plantedCrops.length,
    potentialIncome: readyCrops.reduce((sum, crop) => {
      const baseValue = {
        CORN: 100,
        WHEAT: 75,
        TOMATO: 150
      }[crop.type] || 0;
      return sum + (baseValue * crop.yieldValue);
    }, 0)
  };
}

// Helper to get optimal crops for current conditions
function getOptimalCrops(weather, temperature, moisture) {
  const scores = {
    CORN: 0,
    WHEAT: 0,
    TOMATO: 0
  };

  // Temperature scoring
  if (temperature >= 60 && temperature <= 85) scores.CORN += 2;
  if (temperature >= 55 && temperature <= 75) scores.WHEAT += 2;
  if (temperature >= 65 && temperature <= 90) scores.TOMATO += 2;

  // Moisture scoring
  if (moisture >= 55 && moisture <= 65) scores.CORN += 2;
  if (moisture >= 35 && moisture <= 45) scores.WHEAT += 2;
  if (moisture >= 70 && moisture <= 80) scores.TOMATO += 2;

  // Weather effects
  if (weather === 'rainy') {
    scores.TOMATO += 1;
    scores.WHEAT -= 1;
  } else if (weather === 'sunny') {
    scores.WHEAT += 1;
    scores.CORN += 1;
  } else if (weather === 'windy') {
    scores.WHEAT += 1;
    scores.TOMATO -= 1;
  }

  return Object.entries(scores)
    .sort(([,a], [,b]) => b - a)
    .map(([crop]) => crop);
}

export async function getFarmingAdvice(gameState, message, grid) {
  try {
    const farmAnalysis = analyzeConditions(gameState, grid);
    const optimalCrops = getOptimalCrops(
      gameState.weather, 
      gameState.temperature, 
      gameState.moisture
    );

    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        system: `You are an expert farming advisor in a farming simulation game. Be specific and strategic in your advice.

        Game mechanics:
        - Players manage a 6x6 grid (36 plots)
        - Weather affects crop growth and yields
        - Sensors can be purchased to improve yields
        - Loans available if money is low
        - Each crop has optimal growing conditions
        
        Crops:
        CORN: 60-85°F, 60% moisture, $25 cost, $100 value, 3 days growth
        WHEAT: 55-75°F, 40% moisture, $15 cost, $75 value, 2 days growth
        TOMATO: 65-90°F, 75% moisture, $35 cost, $150 value, 4 days growth
        
        Focus on practical advice about:
        - Which crops to plant based on conditions
        - When to harvest
        - Managing money and loans
        - Using sensors strategically
        - Weather impacts
        
        Keep responses concise but specific.`,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Current Farm Status:
                Weather: ${gameState.weather}
                Temperature: ${gameState.temperature}°F
                Moisture: ${gameState.moisture}%
                Money: $${gameState.money}
                Day: ${gameState.day}
                Loans: $${gameState.loans}
                Sensors: ${gameState.sensors.length}
                
                Farm Analysis:
                Planted Crops: ${farmAnalysis.plantedCount}/36 plots
                Ready to Harvest: ${farmAnalysis.readyCount}
                Crop Diversity: ${farmAnalysis.diversity} types
                Available Plots: ${farmAnalysis.availablePlots}
                Potential Income: $${farmAnalysis.potentialIncome}
                
                Best Crops for Current Conditions:
                1. ${optimalCrops[0]}
                2. ${optimalCrops[1]}
                3. ${optimalCrops[2]}
                
                Player Question: "${message}"
                
                Provide specific advice considering all these factors.`
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    if (responseBody.messages?.[0]?.content?.[0]?.text) {
      return responseBody.messages[0].content[0].text;
    }

    // Enhanced fallback response if AI fails
    return generateDetailedFallback(gameState, farmAnalysis, optimalCrops);

  } catch (error) {
    console.error('Bedrock error:', error);
    return generateDetailedFallback(gameState, analyzeConditions(gameState, grid), 
      getOptimalCrops(gameState.weather, gameState.temperature, gameState.moisture));
  }
}

function generateDetailedFallback(gameState, analysis, optimalCrops) {
  const advice = [];

  // Add condition-specific advice
  if (analysis.readyCount > 0) {
    advice.push(`You have ${analysis.readyCount} crops ready to harvest worth $${analysis.potentialIncome}.`);
  }

  if (gameState.money < 50) {
    advice.push("Your funds are low. Consider harvesting crops or taking a small loan.");
  }

  if (analysis.availablePlots > 5) {
    advice.push(`You have ${analysis.availablePlots} empty plots. ${optimalCrops[0]} would grow well in current conditions.`);
  }

  if (gameState.sensors.length < 2 && gameState.money > 200) {
    advice.push("Installing more sensors would help optimize your crop yields.");
  }

  // Add weather-specific advice
  const weatherAdvice = {
    sunny: "Sunny conditions are good for most crops. Monitor moisture levels.",
    rainy: "Rainy weather helps save on watering costs. Good for water-loving crops.",
    windy: "Wind increases water evaporation. Drought-resistant crops do better."
  }[gameState.weather] || "Current weather is suitable for farming.";
  
  advice.push(weatherAdvice);

  return advice.join(" ");
}
