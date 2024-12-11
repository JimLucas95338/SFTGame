export const CROPS = {
  CORN: { 
    icon: '🌽', 
    growthTime: 3, 
    value: 100,
    cost: 25,
    waterNeeds: 60,
    tempRange: { min: 60, max: 85 },
    description: 'Hardy crop, moderate water needs'
  },
  WHEAT: { 
    icon: '🌾', 
    growthTime: 2, 
    value: 75,
    cost: 15,
    waterNeeds: 40,
    tempRange: { min: 55, max: 75 },
    description: 'Fast-growing, drought-resistant'
  },
  TOMATO: { 
    icon: '🍅', 
    growthTime: 4, 
    value: 150,
    cost: 35,
    waterNeeds: 75,
    tempRange: { min: 65, max: 90 },
    description: 'High value, needs lots of water'
  }
};

export const calculateYield = (crop, weather, temp, moisture, tempBonus = 1, moistureBonus = 1) => {
  let yieldValue = 1.0;

  // Temperature effects
  if (temp < crop.tempRange.min) {
    yieldValue *= 0.5 * tempBonus;
  } else if (temp > crop.tempRange.max) {
    yieldValue *= 0.7 * tempBonus;
  } else {
    yieldValue *= 1.2 * tempBonus;
  }

  // Weather and moisture effects
  if (weather === 'rainy' && moisture > crop.waterNeeds) {
    yieldValue *= 0.8 * moistureBonus;
  } else if (weather === 'sunny' && moisture < crop.waterNeeds) {
    yieldValue *= 0.7 * moistureBonus;
  } else {
    yieldValue *= 1.1 * moistureBonus;
  }

  return yieldValue;
};

export const calculateLoanInterest = (loanAmount) => {
  return Math.round(loanAmount * 0.01);
};

export const calculateMaintenanceCost = (sensorCount, difficulty) => {
  return Math.round(sensorCount * 10 * (1 + difficulty * 0.1));
};

export const getWeatherEffect = (weather, crop) => {
  switch (weather) {
    case 'sunny':
      return crop.waterNeeds > 60 ? 'Needs extra water' : 'Ideal conditions';
    case 'rainy':
      return crop.waterNeeds < 40 ? 'Risk of root rot' : 'Good growing weather';
    case 'windy':
      return 'Increased water evaporation';
    default:
      return 'Normal conditions';
  }
};

export const getAdvice = (gameState, crops) => {
  let advice = [];
  
  // Financial advice
  if (gameState.money < 100) {
    advice.push("Low on funds! Consider harvesting mature crops or taking a small loan.");
  }
  
  // Weather advice
  if (gameState.temperature > 85) {
    advice.push("High temperatures! Water-loving crops will need extra care.");
  } else if (gameState.temperature < 55) {
    advice.push("Cold weather! Only cold-resistant crops will thrive.");
  }
  
  // Sensor advice
  if (gameState.sensors.length < 2 && gameState.money > 200) {
    advice.push("Installing sensors will improve crop yields through better monitoring.");
  }
  
  // Loan advice
  if (gameState.loans > 0) {
    advice.push(`Outstanding loans: $${gameState.loans}. Each day adds 1% interest.`);
  }
  
  return advice.join(' ');
};
