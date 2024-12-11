import React, { useState } from 'react';
import { Sun, Cloud, Wind, Thermometer, Droplet, Activity, Leaf, MessageSquare, DollarSign } from 'lucide-react';

function SmartFarmGame() {
  // Game Constants
  const CROPS = {
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

  // State Management
  const [gameState, setGameState] = useState({
    day: 1,
    money: 1000,
    weather: 'sunny',
    temperature: 75,
    moisture: 60,
    sensors: [],
    loans: 0,
    tempBonus: 1,
    moistureBonus: 1
  });

  const [grid, setGrid] = useState(
    Array(6).fill().map(() => Array(6).fill(null))
  );

  const [selectedCrop, setSelectedCrop] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showAdvisor, setShowAdvisor] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);

  // Utility Functions
  const calculateYield = (crop, weather, temp, moisture, tempBonus = 1, moistureBonus = 1) => {
    let yieldValue = 1.0;

    if (temp < crop.tempRange.min) {
      yieldValue *= 0.5 * tempBonus;
    } else if (temp > crop.tempRange.max) {
      yieldValue *= 0.7 * tempBonus;
    } else {
      yieldValue *= 1.2 * tempBonus;
    }

    if (weather === 'rainy' && moisture > crop.waterNeeds) {
      yieldValue *= 0.8 * moistureBonus;
    } else if (weather === 'sunny' && moisture < crop.waterNeeds) {
      yieldValue *= 0.7 * moistureBonus;
    } else {
      yieldValue *= 1.1 * moistureBonus;
    }

    return yieldValue;
  };

  const calculateLoanInterest = (loanAmount) => Math.round(loanAmount * 0.01);

  const getWeatherEffect = (weather, crop) => {
    switch (weather) {
      case 'sunny': return crop.waterNeeds > 60 ? 'Needs extra water' : 'Ideal conditions';
      case 'rainy': return crop.waterNeeds < 40 ? 'Risk of root rot' : 'Good growing weather';
      case 'windy': return 'Increased water evaporation';
      default: return 'Normal conditions';
    }
  };

  // Game Logic Functions
  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
  };

  const simulateWeatherChange = () => {
    const weathers = ['sunny', 'rainy', 'windy'];
    const newWeather = weathers[Math.floor(Math.random() * weathers.length)];
    const newTemp = Math.floor(Math.random() * (95 - 55) + 55);
    
    setGameState(prev => ({
      ...prev,
      weather: newWeather,
      temperature: newTemp,
      moisture: newWeather === 'rainy' ? 80 : 
                newWeather === 'windy' ? Math.max(prev.moisture - 20, 20) : 
                Math.max(prev.moisture - 10, 30)
    }));

    if (newTemp > 90) addNotification('🌡️ High temperature alert!', 'warning');
  };

  const growCrops = () => {
    setGrid(prevGrid => prevGrid.map(row => 
      row.map(cell => {
        if (!cell?.type) return cell;
        
        const newGrowthStage = cell.growthStage + 1;
        const crop = CROPS[cell.type];
        const yieldValue = calculateYield(
          crop,
          gameState.weather,
          gameState.temperature,
          gameState.moisture,
          gameState.tempBonus,
          gameState.moistureBonus
        );

        if (newGrowthStage >= crop.growthTime) {
          const effect = getWeatherEffect(gameState.weather, crop);
          addNotification(`🌟 ${cell.type} is ready to harvest! ${effect}`, 'success');
          return { ...cell, growthStage: newGrowthStage, ready: true, yieldValue };
        }
        
        return { ...cell, growthStage: newGrowthStage, yieldValue };
      })
    ));
  };

  const advanceDay = () => {
    if (gameState.loans > 0) {
      const interest = calculateLoanInterest(gameState.loans);
      setGameState(prev => ({
        ...prev,
        loans: prev.loans + interest
      }));
      addNotification(`💸 Loan interest: $${interest}`, 'warning');
    }

    simulateWeatherChange();
    growCrops();
    setGameState(prev => ({ ...prev, day: prev.day + 1 }));
  };

  const plantCrop = (row, col) => {
    if (!selectedCrop) {
      addNotification('🌱 Select a crop first!', 'warning');
      return;
    }
    
    const cropCost = CROPS[selectedCrop].cost;
    if (gameState.money < cropCost) {
      addNotification(`❌ Not enough money! Need $${cropCost}`, 'error');
      return;
    }
    
    setGrid(prev => {
      const newGrid = [...prev.map(row => [...row])];
      newGrid[row][col] = {
        type: selectedCrop,
        growthStage: 0,
        ready: false,
        yieldValue: 1.0
      };
      return newGrid;
    });
    
    setGameState(prev => ({ ...prev, money: prev.money - cropCost }));
    addNotification(`🌱 Planted ${selectedCrop}!`, 'success');
  };

  const harvestCrop = (row, col) => {
    const cell = grid[row][col];
    if (cell?.ready) {
      const crop = CROPS[cell.type];
      const finalValue = Math.round(crop.value * cell.yieldValue);
      
      setGameState(prev => ({ ...prev, money: prev.money + finalValue }));
      setGrid(prev => {
        const newGrid = [...prev.map(row => [...row])];
        newGrid[row][col] = null;
        return newGrid;
      });
      
      addNotification(`💰 Harvested ${cell.type} for $${finalValue}!`, 'success');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 p-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-green-800">Smart Farm</h1>
            <p className="text-green-600 text-lg">Day {gameState.day}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <DollarSign className="w-8 h-8 text-green-600 mx-auto" />
              <p className="font-mono text-lg">${gameState.money}</p>
            </div>
            <div className="text-center">
              <Thermometer className="w-8 h-8 text-red-500 mx-auto" />
              <p className="font-mono text-lg">{gameState.temperature}°F</p>
            </div>
            <div className="text-center">
              <Droplet className="w-8 h-8 text-blue-500 mx-auto" />
              <p className="font-mono text-lg">{gameState.moisture}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Grid */}
        <div className="lg:col-span-2">
          <div className="bg-white/80 backdrop-blur rounded-lg shadow-lg p-6">
            <div className="grid grid-cols-6 gap-3">
              {grid.map((row, i) => 
                row.map((cell, j) => (
                  <button
                    key={`${i}-${j}`}
                    onClick={() => cell?.ready ? harvestCrop(i, j) : plantCrop(i, j)}
                    className={`aspect-square rounded-xl flex items-center justify-center text-3xl relative transition-all duration-300 ${
                      cell 
                        ? cell.ready 
                          ? 'bg-yellow-100 hover:bg-yellow-200 shadow-inner'
                          : 'bg-green-100 hover:bg-green-200'
                        : 'bg-stone-100 hover:bg-stone-200'
                    }`}
                  >
                    {cell && (
                      <div className="relative">
                        <div className="text-4xl">{CROPS[cell.type].icon}</div>
                        {!cell.ready && (
                          <div className="w-8 h-1 bg-gray-200 rounded absolute -bottom-2 left-1/2 -translate-x-1/2">
                            <div 
                              className="h-full bg-green-500 rounded transition-all duration-300"
                              style={{ width: `${(cell.growthStage / CROPS[cell.type].growthTime) * 100}%` }}
                            />
                          </div>
                        )}
                        {cell.ready && (
                          <span className="absolute -top-1 -right-1 text-xl animate-bounce">✨</span>
                        )}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-6">
          {/* Crop Selection */}
          <div className="bg-white/80 backdrop-blur rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-bold text-green-800 mb-4">Select Crop</h2>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(CROPS).map(([cropType, crop]) => (
                <button
                  key={cropType}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    selectedCrop === cropType 
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-white hover:bg-gray-50 border border-gray-200'
                  }`}
                  onClick={() => setSelectedCrop(cropType)}
                >
                  <span className="text-2xl">{crop.icon}</span>
                  <div className="flex flex-col">
                    <span>{cropType}</span>
                    <span className="text-xs opacity-80">${crop.cost}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Weather */}
          <div className="bg-white/80 backdrop-blur rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-bold text-green-800 mb-4">Weather</h2>
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              {gameState.weather === 'sunny' && <Sun className="w-10 h-10 text-yellow-500" />}
              {gameState.weather === 'rainy' && <Cloud className="w-10 h-10 text-blue-500" />}
              {gameState.weather === 'windy' && <Wind className="w-10 h-10 text-gray-500" />}
              <div className="text-right">
                <p className="font-medium capitalize">{gameState.weather}</p>
                <p className="text-sm text-gray-600">Perfect for {Object.entries(CROPS)
                  .filter(([, crop]) => 
                    gameState.temperature >= crop.tempRange.min && 
                    gameState.temperature <= crop.tempRange.max
                  )
                  .map(([name]) => name)
                  .join(', ')}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button 
              className="flex-1 h-16 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2 text-lg transition-colors"
              onClick={advanceDay}
            >
              <Activity className="w-6 h-6" />
              Next Day
            </button>
            <button
              className="flex-1 h-16 border border-gray-200 hover:bg-gray-50 rounded-lg flex items-center justify-center gap-2 text-lg transition-colors"
              onClick={() => setShowAdvisor(true)}
            >
              <MessageSquare className="w-6 h-6" />
              Advisor
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 max-w-sm">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`animate-slideIn p-4 rounded-lg bg-white shadow-lg border-l-4 ${
              notification.type === 'error' ? 'border-red-500 bg-red-50' :
              notification.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
              notification.type === 'success' ? 'border-green-500 bg-green-50' :
              'border-blue-500 bg-blue-50'
            }`}
          >
            <div>
              <h4 className="font-bold capitalize">{notification.type}</h4>
              <p className="text-sm">{notification.message}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tutorial Modal */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Welcome to Smart Farm!</h2>
            <div className="space-y-4">
              <p className="flex items-center gap-2">
                <span className="text-xl">🌱</span>
                Plant crops according to weather conditions
              </p>
              <p className="flex items-center gap-2">
                <span className="text-xl">🌡️</span>
                Monitor temperature and moisture levels
              </p>
              <p className="flex items-center gap-2">
                <span className="text-xl">💰</span>
                Manage your money wisely
              </p>
              <p className="flex items-center gap-2">
                <span className="text-xl">⏱️</span>
                Different crops have different growth times
              </p>
              <p className="flex items-center gap-2">
                <span className="text-xl">🎯</span>
                Use the advisor for strategic guidance
              </p>
              <button 
                className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg mt-4 transition-colors"
                onClick={() => setShowTutorial(false)}
              >
                Start Farming!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advisor Modal */}
      {showAdvisor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Farm Advisor</h2>
              <button 
                onClick={() => setShowAdvisor(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="mt-4">
              <div className="bg-green-50 rounded-lg p-4 mb-4">
                <h3 className="font-medium mb-2">Current Conditions:</h3>
                <ul className="space-y-1 text-sm">
                  <li>Weather: {gameState.weather}</li>
                  <li>Temperature: {gameState.temperature}°F</li>
                  <li>Moisture: {gameState.moisture}%</li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="font-medium">Recommendations:</h3>
                {Object.entries(CROPS)
                  .filter(([, crop]) => 
                    gameState.temperature >= crop.tempRange.min && 
                    gameState.temperature <= crop.tempRange.max
                  )
                  .map(([name, crop]) => (
                    <div key={name} className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg">
                      <span className="text-2xl">{crop.icon}</span>
                      <div>
                        <p className="font-medium">{name}</p>
                        <p className="text-sm text-gray-600">{crop.description}</p>
                      </div>
                    </div>
                  ))
                }
                {Object.entries(CROPS)
                  .filter(([, crop]) => 
                    gameState.temperature >= crop.tempRange.min && 
                    gameState.temperature <= crop.tempRange.max
                  ).length === 0 && (
                    <p className="text-gray-600 italic">
                      Current conditions are challenging for most crops. Consider waiting for better weather.
                    </p>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SmartFarmGame;
