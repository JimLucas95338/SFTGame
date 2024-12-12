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
        system: "You are a friendly farming advisor who helps players make optimal decisions based on weather conditions and crop requirements.",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Current conditions:
                - Weather: ${gameState.weather}
                - Temperature: ${gameState.temperature}°F
                - Moisture: ${gameState.moisture}%
                - Money: $${gameState.money}
                - Day: ${gameState.day}

                Question: ${message}
                
                Please provide brief, practical farming advice based on these conditions.`
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    console.log('Bedrock request:', {
      modelId: command.input.modelId,
      region: bedrockClient.config.region
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    console.log('Bedrock response:', responseBody);

    if (responseBody.messages && responseBody.messages[0] && responseBody.messages[0].content) {
      // Extract text from content array
      return responseBody.messages[0].content[0].text;
    }

    return "How can I help you with your farming today?";

  } catch (error) {
    console.error('Bedrock error:', {
      name: error.name,
      message: error.message,
      code: error.code,
      metadata: error.$metadata
    });
    
    return "I'm having trouble connecting. Let me help you with current conditions instead.";
  }
}
