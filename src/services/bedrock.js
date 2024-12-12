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
    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        system: `You are a knowledgeable farming advisor in a farming simulation game. 
        Available crops:
        - CORN: Needs 60-85°F, 60% moisture, costs $25, sells for $100
        - WHEAT: Needs 55-75°F, 40% moisture, costs $15, sells for $75
        - TOMATO: Needs 65-90°F, 75% moisture, costs $35, sells for $150
        
        Be specific about crop recommendations based on current weather, temperature, and moisture conditions. 
        Consider the player's money when giving advice. Keep responses brief but informative.`,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Current farm conditions:
                - Weather: ${gameState.weather}
                - Temperature: ${gameState.temperature}°F
                - Moisture: ${gameState.moisture}%
                - Available Money: $${gameState.money}
                - Day: ${gameState.day}

                Player asks: ${message}
                
                Provide specific farming advice considering current weather conditions, costs, and potential profits.`
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

    if (responseBody.messages && responseBody.messages[0] && responseBody.messages[0].content) {
      return responseBody.messages[0].content[0].text;
    }

    return `Based on current conditions (${gameState.weather}, ${gameState.temperature}°F), 
            I recommend focusing on ${
              gameState.temperature > 85 ? 'heat-resistant crops like TOMATO' :
              gameState.temperature < 55 ? 'cold-resistant crops like WHEAT' :
              'balanced crops like CORN'
            }.`;

  } catch (error) {
    console.error('Bedrock error:', error);
    
    // Provide meaningful fallback advice based on conditions
    const fallbackAdvice = () => {
      const conditions = [];
      if (gameState.temperature > 85) conditions.push("It's quite hot");
      if (gameState.temperature < 55) conditions.push("It's quite cold");
      if (gameState.moisture > 70) conditions.push("soil is very moist");
      if (gameState.moisture < 40) conditions.push("soil is dry");
      
      return conditions.length > 0 
        ? `Note that ${conditions.join(' and ')}. Consider this when choosing crops.`
        : "Conditions are moderate. Any crop should grow well.";
    };

    return fallbackAdvice();
  }
}
