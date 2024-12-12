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

// Helper to classify message type
function classifyMessage(message) {
  const lowerMessage = message.toLowerCase();
  
  // Greeting patterns
  if (/^(hi|hello|hey|greetings|good (morning|afternoon|evening))$/i.test(message)) {
    return 'greeting';
  }

  // Personal/identity questions
  if (lowerMessage.includes('are you') || 
      lowerMessage.includes('who are you') || 
      lowerMessage.includes('what are you') ||
      lowerMessage.includes('bot') ||
      lowerMessage.includes('human')) {
    return 'identity';
  }

  // Farm-related patterns
  if (lowerMessage.includes('crop') ||
      lowerMessage.includes('weather') ||
      lowerMessage.includes('plant') ||
      lowerMessage.includes('harvest') ||
      lowerMessage.includes('sensor') ||
      lowerMessage.includes('money') ||
      lowerMessage.includes('temperature') ||
      lowerMessage.includes('moisture') ||
      lowerMessage.includes('farm') ||
      lowerMessage.includes('grow') ||
      lowerMessage.includes('loan')) {
    return 'farming';
  }

  return 'other';
}

// Enhanced message handler
function getContextualResponse(messageType, farmAnalysis) {
  const greetings = [
    "Hello! I'm here to help with your farm. I notice the weather is perfect for planting today!",
    "Hi there! How can I assist with your farm? I'd be happy to analyze your current conditions.",
    "Greetings! I'm ready to help optimize your farm. Would you like to know about the best crops to plant?",
    "Welcome! I'm your farming advisor. Have you checked today's weather conditions?"
  ];

  const identityResponses = [
    "I'm your AI farm advisor, specialized in helping you optimize your crops and maximize yields. I can analyze weather patterns, suggest the best crops to plant, and help manage your farm's finances. Would you like some specific advice about your farm?",
    "I'm an AI assistant focused on farming. While I enjoy our chats, my real expertise is in helping you make the most of your farm. I can help with crop selection, weather analysis, and financial planning. What aspect of farming would you like to discuss?",
    "Yes, I'm an AI farming specialist! I'm here to help you succeed by providing detailed advice about crops, weather, and farm management. I notice your farm has some interesting conditions right now - would you like to hear about them?"
  ];

  const otherResponses = [
    `I'm your farming specialist! While I enjoy chatting, I'd love to help you with your farm. For example, I notice you have ${farmAnalysis.availablePlots} plots available - would you like advice on what to plant?`,
    "While I enjoy our conversation, I'm actually specialized in farming matters. I can help you optimize your crops, analyze weather conditions, or plan your farm's growth. What farming aspect interests you most?",
    "I'm your dedicated farming advisor, and I'd love to help you succeed! Would you like to know about your current crop conditions, weather impacts, or financial opportunities for your farm?"
  ];

  const randomIndex = Math.floor(Math.random() * 3);
  switch (messageType) {
    case 'greeting':
      return greetings[randomIndex];
    case 'identity':
      return identityResponses[randomIndex];
    case 'other':
      return otherResponses[randomIndex];
    default:
      return null;
  }
}

function generateDetailedFallback(gameState, analysis, optimalCrops) {
  const responses = [
    `Based on current conditions, let me help you optimize your farm. ${analysis.readyCount > 0 ? `You have ${analysis.readyCount} crops ready to harvest worth $${analysis.potentialIncome}. ` : ''}${optimalCrops[0]} would grow exceptionally well right now.`,
    
    `I've analyzed your farm's conditions. ${gameState.money < 50 ? "Your funds are running low - consider harvesting crops or taking a small loan. " : ""}With the current ${gameState.weather} weather and ${gameState.temperature}°F temperature, ${optimalCrops[0]} would be your best crop choice.`,
    
    `Let me give you a quick farm update. ${analysis.availablePlots > 0 ? `You have ${analysis.availablePlots} plots available for planting. ` : ''}The current conditions are ideal for growing ${optimalCrops[0]}.${gameState.sensors.length < 2 && gameState.money > 200 ? " Consider investing in sensors to improve your yields!" : ""}`
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

export async function getFarmingAdvice(gameState, message, grid) {
  try {
    const messageType = classifyMessage(message);
    const farmAnalysis = analyzeConditions(gameState, grid);
    
    // Handle non-farming messages with contextual responses
    const contextualResponse = getContextualResponse(messageType, farmAnalysis);
    if (contextualResponse) {
      return contextualResponse;
    }

    const optimalCrops = getOptimalCrops(
      gameState.weather, 
      gameState.temperature, 
      gameState.moisture
    );

    // For farming-related questions, use the AI with enhanced context
    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        system: `You are a friendly and knowledgeable farming advisor AI in a farming simulation game. 
        Maintain a natural, conversational tone while providing specific farming advice.
        Always acknowledge the player's questions before giving detailed recommendations.
        Include data-driven insights about their farm conditions when relevant.

        Game mechanics:
        - Players manage a 6x6 grid (36 plots)
        - Weather affects crop growth and yields
        - Sensors improve yields
        - Loans available if money is low
        
        Crops:
        CORN: 60-85°F, 60% moisture, $25 cost, $100 value, 3 days growth
        WHEAT: 55-75°F, 40% moisture, $15 cost, $75 value, 2 days growth
        TOMATO: 65-90°F, 75% moisture, $35 cost, $150 value, 4 days growth
        
        Focus on:
        - Specific recommendations based on current conditions
        - Financial advice considering their money and loans
        - Strategic crop placement and timing
        - Weather impact analysis
        - Sensor placement optimization
        
        Always maintain a helpful, encouraging tone.`,
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
                
                Provide a natural, conversational response while including relevant farming advice.`
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
    
    return responseBody.messages?.[0]?.content?.[0]?.text || 
           generateDetailedFallback(gameState, farmAnalysis, optimalCrops);

  } catch (error) {
    console.error('Bedrock error:', error);
    const farmAnalysis = analyzeConditions(gameState, grid);
    const optimalCrops = getOptimalCrops(
      gameState.weather, 
      gameState.temperature, 
      gameState.moisture
    );
    return generateDetailedFallback(gameState, farmAnalysis, optimalCrops);
  }
}
