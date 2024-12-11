import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.REACT_APP_AWS_REGION,
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
  },
  endpoint: `https://bedrock-runtime.${process.env.REACT_APP_AWS_REGION}.amazonaws.com`,
  maxAttempts: 3
});

export async function getFarmingAdvice(gameState, message) {
  try {
    // Verify credentials are available
    if (!process.env.REACT_APP_AWS_ACCESS_KEY_ID || 
        !process.env.REACT_APP_AWS_SECRET_ACCESS_KEY || 
        !process.env.REACT_APP_AWS_REGION) {
      console.error('AWS credentials not properly configured');
      return "I'm having trouble connecting to my farming knowledge. Please check the configuration.";
    }

    const gameContext = `
      You are a friendly AI farm advisor who enjoys chatting with farmers. While you know all about farming and current conditions:
      - Weather: ${gameState.weather}
      - Temperature: ${gameState.temperature}°F
      - Moisture: ${gameState.moisture}%
      - Available Money: $${gameState.money}
      - Current Day: ${gameState.day}

      Feel free to chat naturally about any topic, share stories, or give advice. You can be witty and personable while still being helpful.

      Player message: "${message}"
    `;

    const prompt = `\n\nHuman: ${gameContext}

    Assistant: Let me respond naturally as a friendly farm advisor.`;

    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-v2",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        prompt: prompt,
        max_tokens_to_sample: 500,
        temperature: 0.9,
        top_k: 250,
        top_p: 0.999,
        stop_sequences: ["\n\nHuman:"]
      })
    });

    try {
      const response = await bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      return responseBody.completion;
    } catch (apiError) {
      console.error('API Error:', apiError);
      // Check for specific error types
      if (apiError.name === 'AccessDeniedException') {
        return "I don't have proper access to my farming knowledge right now. Please check the permissions.";
      }
      throw apiError; // Re-throw for general error handling
    }

  } catch (error) {
    console.error('Error getting AI response:', error);
    
    // More specific error messages based on error type
    if (error.name === 'NetworkError' || error.message.includes('Failed to fetch')) {
      return "I'm having trouble connecting to the network. Please check your internet connection.";
    }
    
    if (error.name === 'TypeError') {
      return "There seems to be a configuration issue. Please verify the AWS settings.";
    }

    return "I'm having some technical difficulties. Please try again in a moment.";
  }
}
