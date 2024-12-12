import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// Initialize Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.REACT_APP_AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
  }
});

// Sophisticated message classifier for better context understanding
function classifyMessage(message) {
  const lowerMessage = message.toLowerCase();
  
  // Greeting patterns
  if (/^(hi|hello|hey|greetings|good (morning|afternoon|evening))$/i.test(message)) {
    return 'greeting';
  }

  // Personal/identity questions
  if (lowerMessage.includes('who are you') || 
      lowerMessage.includes('what are you') ||
      lowerMessage.includes('bot') ||
      lowerMessage.includes('human')) {
    return 'identity';
  }

  // Farm-specific queries
  if (lowerMessage.includes('crop') ||
      lowerMessage.includes('weather') ||
      lowerMessage.includes('plant') ||
      lowerMessage.includes('harvest') ||
      lowerMessage.includes('money') ||
      lowerMessage.includes('loan')) {
    return 'farming';
  }

  // Emotional responses
  if (lowerMessage.includes('thank') ||
      lowerMessage.includes('great') ||
      lowerMessage.includes('awesome') ||
      lowerMessage.includes('good job')) {
    return 'emotional';
  }

  return 'general';
}

// Generate contextual responses based on message type
function getContextualResponse(messageType, farmAnalysis) {
  const greetings = [
    "Hello! I'm here to help with your farm. I notice the weather is perfect for planting today!",
    "Hi there! How can I assist with your farm? I'd be happy to analyze your current conditions.",
    "Greetings! I'm ready to help optimize your farm. Would you like to know about the best crops to plant?",
  ];

  const identityResponses = [
    "I'm your AI farm advisor, specialized in helping you optimize your crops and maximize yields. I can analyze weather patterns, suggest the best crops to plant, and help manage your farm's finances. What would you like to know?",
    "I'm an AI assistant focused on farming. I enjoy our chats and my real expertise is in helping you make the most of your farm. I can help with crop selection, weather analysis, and financial planning. What interests you most?",
    "I'm your farming specialist! While I enjoy chatting, I'd love to help you with your farm. For example, I notice you have ${farmAnalysis.availablePlots} plots available - would you like advice on what to plant?",
  ];

  const emotionalResponses = [
    "I'm glad I could help! Let me know if you need any more farming advice.",
    "That's wonderful to hear! Your success is what matters most. What else would you like to know about your farm?",
    "Thank you! I enjoy helping farmers succeed. Is there anything else you'd like to explore?",
  ];

  const randomIndex = Math.floor(Math.random() * 3);
  switch (messageType) {
    case 'greeting':
      return greetings[randomIndex];
    case 'identity':
      return identityResponses[randomIndex];
    case 'emotional':
      return emotionalResponses[randomIndex];
    default:
      return null;
  }
}

// Enhanced farm state analyzer
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

// Main AI interaction function
export async function getFarmingAdvice(gameState, message, grid) {
  try {
    const messageType = classifyMessage(message);
    const farmAnalysis = analyzeFarmState(gameState, grid);
    
    // Handle non-farming messages with contextual responses
    const contextualResponse = getContextualResponse(messageType, farmAnalysis);
    if (contextualResponse) {
      return contextualResponse;
    }

    // For farming-related questions, use Bedrock with enhanced context
    const prompt = `
    You are a friendly and knowledgeable farming advisor AI in a farming simulation game.
    Current farm status:
    - Weather: ${gameState.weather}
    - Temperature: ${gameState.temperature}°F
    - Moisture: ${gameState.moisture}%
    - Money: $${gameState.money}
    - Planted crops: ${farmAnalysis.plantedCount}/36 plots
    - Ready to harvest: ${farmAnalysis.readyCount}
    - Crop diversity: ${farmAnalysis.diversity} types
    
    Player message: "${message}"
    
    Respond in a natural, conversational way while providing specific farming advice.
    Consider weather conditions, crop requirements, and financial situation in your response.
    `;

    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-v2",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        prompt,
        max_tokens: 300,
        temperature: 0.7,
        top_p: 0.9,
      })
    });

    const response = await bedrockClient.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    
    // Post-process the response for more natural conversation
    let aiResponse = result.completion || result.messages?.[0]?.content;
    aiResponse = aiResponse.replace(/\bAI\b/g, 'I')
                          .replace(/\bArtificial Intelligence\b/g, 'I')
                          .replace(/\bthe system\b/g, 'I');

    return aiResponse;

  } catch (error) {
    console.error('Error in getFarmingAdvice:', error);
    
    // Provide intelligent fallback responses
    return farmAnalysis.readyCount > 0
      ? "I notice you have crops ready to harvest! Would you like specific advice about maximizing your yields?"
      : "I'd be happy to help you optimize your farm. Would you like advice about what to plant in this weather?";
  }
}
