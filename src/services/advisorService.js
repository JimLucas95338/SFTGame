export const getAdvice = (gameState, message, grid) => {
  const lowerMessage = message.toLowerCase();
  const context = analyzeFarmState(gameState, grid);
  
  // Plant advice
  if (lowerMessage.includes('plant')) {
    return getPlantingAdvice(context);
  }
  
  // Weather advice
  if (lowerMessage.includes('weather')) {
    return getWeatherAdvice(context);
  }
  
  // Sensor advice
  if (lowerMessage.includes('sensor') || lowerMessage.includes('upgrade')) {
    return getSensorAdvice(context);
  }
  
  // Harvest advice
  if (lowerMessage.includes('harvest') || lowerMessage.includes('ready')) {
    return getHarvestAdvice(context);
  }
  
  // Money advice
  if (lowerMessage.includes('money') || lowerMessage.includes('loan')) {
    return getFinancialAdvice(context);
  }
  
  // General advice
  return getGeneralAdvice(context);
};

function analyzeFarmState(gameState, grid) {
  const crops = grid.flat().filter(cell => cell !== null);
  const readyCrops = crops.filter(crop => crop.ready);
  const suitability = analyzeCropSuitability(
    gameState.weather,
    gameState.temperature,
    gameState.moisture
  );
  
  return {
    gameState,
    crops,
    readyCrops,
    suitability,
    bestCrop: Object.entries(suitability)
      .sort(([,a], [,b]) => b - a)[0][0]
  };
}

function getPlantingAdvice(context) {
  const { gameState, suitability, bestCrop } = context;
  
  if (gameState.money < 25) {
    return "You need more money before planting. Consider taking a small loan or waiting for current crops to mature.";
  }
  
  const recommendations = Object.entries(suitability)
    .filter(([,score]) => score > 0.8)
    .map(([crop]) => crop);
    
  if (recommendations.length === 0) {
    return "Current conditions aren't ideal for any crops. Consider waiting for better weather.";
  }
  
  return `With current conditions, ${bestCrop} would grow best. ${
    recommendations.length > 1 
      ? `You could also plant ${recommendations.slice(1).join(' or ')}.`
      : ''
  } Make sure to monitor the weather!`;
}

function getWeatherAdvice(context) {
  const { gameState, crops } = context;
  
  let advice = `Current weather is ${gameState.weather} at ${gameState.temperature}°F with ${gameState.moisture}% moisture. `;
  
  if (gameState.temperature > 85) {
    advice += "High temperatures may stress crops. Consider adding moisture sensors.";
  } else if (gameState.temperature < 55) {
    advice += "Cold temperatures will slow growth. Wheat is most cold-resistant.";
  } else {
    advice += "Temperature is ideal for most crops.";
  }
  
  if (crops.length > 0) {
    const atRisk = crops.filter(crop => {
      const cropData = CROPS[crop.type];
      return gameState.temperature < cropData.tempRange.min || 
             gameState.temperature > cropData.tempRange.max;
    });
    
    if (atRisk.length > 0) {
      advice += ` Warning: ${atRisk.length} crop(s) are at risk from current temperatures.`;
    }
  }
  
  return advice;
}

function getSensorAdvice(context) {
  const { gameState } = context;
  
  if (gameState.sensors.length === 0) {
    return `Sensors cost $100 each but improve crop yields. ${
      gameState.money >= 100 
        ? 'You can afford a sensor - temperature sensors are recommended first.'
        : 'Save up money to buy your first sensor.'
    }`;
  }
  
  const bonus = ((gameState.tempBonus + gameState.moistureBonus - 2) * 50).toFixed(0);
  return `Your ${gameState.sensors.length} sensor(s) provide a ${bonus}% yield bonus. ${
    gameState.money >= 100 
      ? 'You can afford another sensor to improve yields further!'
      : 'Keep saving for more sensors to maximize yields.'
  }`;
}

function getHarvestAdvice(context) {
  const { readyCrops, crops } = context;
  
  if (readyCrops.length === 0) {
    if (crops.length === 0) {
      return "No crops planted yet. Start by planting crops suitable for current weather.";
    }
    return `No crops ready yet. ${crops.length} crop(s) still growing.`;
  }
  
  return `${readyCrops.length} crop(s) ready to harvest! Total value: $${
    readyCrops.reduce((sum, crop) => sum + Math.round(CROPS[crop.type].value * crop.yieldValue), 0)
  }`;
}

function getFinancialAdvice(context) {
  const { gameState, readyCrops } = context;
  
  if (gameState.money < 100) {
    if (readyCrops.length > 0) {
      return "Low on funds. Harvest your ready crops for quick income.";
    }
    return "Consider taking a loan to invest in crops or sensors.";
  }
  
  if (gameState.loans > 0) {
    return `You have $${gameState.loans} in loans. Pay these off when possible to avoid interest.`;
  }
  
  return `You have $${gameState.money}. Consider investing in ${
    gameState.sensors.length < 2 ? 'sensors' : 'new crops'
  }.`;
}

function getGeneralAdvice(context) {
  const { gameState, crops, readyCrops } = context;
  
  if (crops.length === 0) {
    return "Start by planting crops suitable for current weather conditions.";
  }
  
  let advice = `You have ${crops.length} crop(s) growing`;
  if (readyCrops.length > 0) {
    advice += ` and ${readyCrops.length} ready to harvest`;
  }
  advice += ". ";
  
  if (gameState.sensors.length === 0) {
    advice += "Consider investing in sensors to improve yields.";
  } else {
    advice += "Keep monitoring weather conditions for optimal growth.";
  }
  
  return advice;
}
