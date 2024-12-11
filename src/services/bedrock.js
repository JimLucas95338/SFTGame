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
        max_tokens_to_sample: 500,  // Increased for longer responses
        temperature: 0.9,  // Higher temperature for more creative responses
        top_k: 250,
        top_p: 0.999,
        stop_sequences: ["\n\nHuman:"]
      })
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    return responseBody.completion;

  } catch (error) {
    console.error('Error getting AI response:', error);
    return "I seem to be having trouble connecting at the moment. Want to try asking me something else?";
  }
}
