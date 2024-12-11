import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.REACT_APP_AWS_REGION,
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
  }
});

// Helper function to get crop recommendations based on conditions
function getCropRecommendations(weather, temperature, moisture) {
  const recommendations = [];
  
  if (temperature >= 60 && temperature <= 85 && moisture >= 55) {
    recommendations.push("Corn would grow well");
  }
  if (temperature >= 55 && temperature <= 75 && moisture >= 35) {
    recommendations.push("Wheat is a good choice");
  }
  if (temperature >= 65 && temperature <= 90 && moisture >= 70) {
    recommendations.push("Tomatoes could thrive");
  }
  
  return recommendations.join(". ");
}

// Helper function to get weather advice
function getWeatherAdvice(weather, temperature, moisture) {
  const advice = [];
  
  if (temperature > 85) {
    advice.push("High temperatures may stress crops");
  } else if (temperature < 55) {
    advice.push("Cold weather may slow growth");
  }
  
  if (moisture > 75) {
    advice.push("Consider skipping watering today");
  } else if (moisture < 40) {
    advice.push("Crops may need extra water");
  }
  
  return advice.join(". ");
}

export async function getFarmingAdvice(gameState, message) {
  console.log('Generating farming advice:', { gameState, message });
  
  try {
    // Build rich context for the AI
    const weatherAdvice = getWeatherAdvice(gameState.weather, gameState.temperature, gameState.moisture);
    const cropRecommendations = getCropRecommendations(gameState.weather, gameState.temperature, gameState.moisture);
    
    const gameContext = `Current farm state:
    - Weather: ${gameState.weather}
    - Temperature: ${gameState.temperature}°F (${weatherAdvice})
    - Moisture: ${gameState.moisture}%
    - Money: $${gameState.money}
    - Day: ${gameState.day}
    - Sensors: ${gameState.sensors.map(s => s.type).join(', ') || 'none'}
    - Active Loans: $${gameState.loans}
    
    Crop Recommendations: ${cropRecommendations}

    Available crops and their needs:
    - Corn (🌽): Cost $25, 60% moisture, 60-85°F, 3 days to grow
    - Wheat (🌾): Cost $15, 40% moisture, 55-75°F, 2 days to grow
    - Tomato (🍅): Cost $35, 75% moisture, 65-90°F, 4 days to grow

    Player question: "${message}"`;

    const prompt = `\n\nHuman: You are an AI farming advisor in a farming simulation game. Act as a knowledgeable and helpful farm manager providing specific, actionable advice based on the current conditions and the player's question. Consider weather patterns, crop requirements, and financial situation.

    ${gameContext}

    Provide a detailed response about what specific actions the player should take and explain why. Include numbers and specific recommendations when relevant.

    Assistant: Let me analyze your farm's conditions and provide strategic advice.`;

    console.log('Sending prompt to Bedrock:', prompt);

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

    try {
      const response = await bedrockClient.send(command);
      console.log('Raw Bedrock response:', response);
      
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      console.log('Parsed response:', responseBody);
      
      return responseBody.completion;
    } catch (apiError) {
      console.error('Bedrock API Error:', apiError);
      
      // Provide fallback advice based on game state
      const fallbackAdvice = generateFallbackAdvice(gameState);
      console.log('Using fallback advice:', fallbackAdvice);
      
      return fallbackAdvice;
    }
  } catch (error) {
    console.error('Error in getFarmingAdvice:', error);
    throw new Error('Unable to generate farming advice: ' + error.message);
  }
}

// Fallback advice generator when AI is unavailable
function generateFallbackAdvice(gameState) {
  const advice = [];
  
  // Financial advice
  if (gameState.money < 100) {
    advice.push("Your funds are low. Consider harvesting any ready crops or taking a small loan.");
  }
  
  // Weather-based advice
  if (gameState.temperature > 85) {
    advice.push("Due to high temperatures, water your crops more frequently and consider planting heat-resistant crops.");
  } else if (gameState.temperature < 55) {
    advice.push("In these cold conditions, wheat might be your best option as it's more cold-resistant.");
  }
  
  // Sensor advice
  if (gameState.sensors.length < 2 && gameState.money > 200) {
    advice.push("Installing more sensors would help optimize your crop yields.");
  }
  
  // If no specific advice is generated, give general guidance
  if (advice.length === 0) {
    advice.push("Focus on maintaining a diverse crop selection and monitor weather conditions carefully.");
  }
  
  return advice.join(" ");
}

// Helper function to log Bedrock errors with more context
function logBedrockError(error, context) {
  console.error('Bedrock Error:', {
    error: error.message,
    code: error.code,
    requestId: error.$metadata?.requestId,
    context: context
  });
}
