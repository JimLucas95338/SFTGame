import React, { useState, useEffect } from 'react';
import { Home, Sun, Cloud, Wind, Thermometer, Droplet, Activity, Leaf, MessageSquare, AlertCircle, DollarSign } from 'lucide-react';
import { CROPS, calculateYield, calculateLoanInterest, calculateMaintenanceCost, getWeatherEffect, getAdvice } from '../utils/gameUtils';

export default function SmartFarmGame() {
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
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Welcome! I'll help you manage your farm. Try planting different crops based on the weather conditions!" }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);

  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
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

    if (newTemp > 90) {
      addNotification('🌡️ High temperature alert! Crops may suffer without proper care.', 'warning');
    }
  };

  const growCrops = () => {
    setGrid(prevGrid => {
      return prevGrid.map(row => 
        row.map(cell => {
          if (cell && cell.type) {
            const newGrowthStage = cell.growthStage + 1;
            const crop = CROPS[cell.type];
            
            // Calculate current growing conditions
            const yield = calculateYield(
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
              return { 
                ...cell, 
                growthStage: newGrowthStage, 
                ready: true,
                yield 
              };
            }
            return { 
              ...cell, 
              growthStage: newGrowthStage,
              yield 
            };
          }
          return cell;
        })
      );
    });
  };

  const getLoan = () => {
    const loanAmount = 500;
    setGameState(prev => ({
      ...prev,
      money: prev.money + loanAmount,
      loans: prev.loans + loanAmount
    }));
    addNotification(`🏦 Took a loan of $${loanAmount}. Daily interest: 1%`, 'info');
  };

  const payLoan = (amount) => {
    if (gameState.money >= amount) {
      setGameState(prev => ({
        ...prev,
        money: prev.money - amount,
        loans: Math.max(0, prev.loans - amount)
      }));
      addNotification(`💰 Paid $${amount} towards loan`, 'success');
    }
  };

  const advanceDay = () => {
    // Handle loans
    if (gameState.loans > 0) {
      const interest = calculateLoanInterest(gameState.loans);
      setGameState(prev => ({
        ...prev,
        loans: prev.loans + interest
      }));
      addNotification(`💸 Loan interest added: $${interest}`, 'warning');
    }

    // Handle sensor maintenance
    if (gameState.sensors.length > 0) {
      const difficulty = Math.floor(gameState.day / 10);
      const maintenanceCost = calculateMaintenanceCost(gameState.sensors.length, difficulty);
      setGameState(prev => ({
        ...prev,
        money: prev.money - maintenanceCost
      }));
      addNotification(`🔧 Sensor maintenance: $${maintenanceCost}`, 'info');
    }

    simulateWeatherChange();
    growCrops();

    // Check for bankruptcy
    if (gameState.money < -1000) {
      addNotification('🚨 Warning: High debt! Consider selling crops or taking a loan.', 'error');
    }

    setGameState(prev => ({
      ...prev,
      day: prev.day + 1
    }));
  };

  const addSensor = (type) => {
    if (gameState.money >= 100) {
      setGameState(prev => ({
        ...prev,
        sensors: [...prev.sensors, { type, id: Date.now() }],
        money: prev.money - 100,
        tempBonus: type === 'temperature' ? prev.tempBonus + 0.1 : prev.tempBonus,
        moistureBonus: type === 'moisture' ? prev.moistureBonus + 0.1 : prev.moistureBonus
      }));
      addNotification(`🎯 New ${type} sensor added! ${type === 'temperature' ? 'Temperature' : 'Moisture'} management improved by 10%`, 'success');
    } else {
      addNotification('❌ Not enough money for sensor!', 'error');
    }
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
        yield: 1.0
      };
      return newGrid;
    });
    
    setGameState(prev => ({
      ...prev,
      money: prev.money - cropCost
    }));
    
    const cropInfo = CROPS[selectedCrop];
    addNotification(`🌱 Planted ${selectedCrop}! ${cropInfo.description}`, 'success');
  };

  const harvestCrop = (row, col) => {
    const cell = grid[row][col];
    if (cell && cell.ready) {
      const crop = CROPS[cell.type];
      const finalValue = Math.round(crop.value * cell.yield);
      
      setGameState(prev => ({
        ...prev,
        money: prev.money + finalValue
      }));
      
      setGrid(prev => {
        const newGrid = [...prev.map(row => [...row])];
        newGrid[row][col] = null;
        return newGrid;
      });
      
      addNotification(
        `💰 Harvested ${cell.type} for $${finalValue}! (Yield: ${(cell.yield * 100).toFixed(0)}%)`,
        'success'
      );
    }
  };

  const getWeatherIcon = (weather) => {
    switch (weather) {
      case 'sunny':
        return <Sun className="text-yellow-500" size={24} />;
      case 'rainy':
        return <Cloud className="text-blue-500" size={24} />;
      case 'windy':
        return <Wind className="text-gray-500" size={24} />;
      default:
        return <Sun className="text-yellow-500" size={24} />;
    }
  };

  const getAdvisorResponse = async (message) => {
    setIsTyping(true);
    
    const advice = getAdvice(gameState, grid.flat().filter(cell => cell !== null));
    
    setMessages(prev => [...prev, 
      { role: 'user', content: message },
      { role: 'assistant', content: advice }
    ]);
    
    setIsTyping(false);
  };

  // ... Rest of the render code remains the same as before ...
  
  return (
    // ... Previous render code with the following additions ...
    
    {/* Add Loan Button when money is low */}
    {gameState.money < 100 && (
      <button
        onClick={getLoan}
        className="fixed bottom-20 right-6 bg-yellow-500 text-white p-4 rounded-full shadow-lg hover:bg-yellow-600 transition-colors"
      >
        <DollarSign size={24} />
      </button>
    )}

    {/* Pay Loan Button when there are loans */}
    {gameState.loans > 0 && (
      <div className="fixed bottom-6 left-6 bg-white rounded-lg shadow-lg p-4">
        <p className="text-sm mb-2">Outstanding Loan: ${gameState.loans}</p>
        <button
          onClick={() => payLoan(Math.min(gameState.money, gameState.loans))}
          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
        >
          Pay Loan
        </button>
      </div>
    )}
    
    {/* Tutorial Modal */}
    {showTutorial && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg w-full max-w-md p-6">
          <h3 className="text-xl font-bold mb-4">Welcome to Farm Simulator!</h3>
          <div className="space-y-2 mb-4">
            <p>🌱 Plant crops according to weather conditions</p>
            <p>📊 Use sensors to improve crop yields</p>
            <p>💰 Manage your money and take loans if needed</p>
            <p>🌡️ Monitor temperature and moisture levels</p>
            <p>⏱️ Each crop has different growth times and needs</p>
            <p>💸 Watch out for loan interest and maintenance costs!</p>
          </div>
          <button
            onClick={() => setShowTutorial(false)}
            className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
          >
            Start Farming!
          </button>
        </div>
      </div>
    )}

    {/* Stats Panel */}
    <div className="fixed top-6 left-6 bg-white rounded-lg shadow-lg p-4">
      <div className="space-y-2">
        <p className="text-sm text-gray-600">Temperature Bonus: +{((gameState.tempBonus - 1) * 100).toFixed(0)}%</p>
        <p className="text-sm text-gray-600">Moisture Bonus: +{((gameState.moistureBonus - 1) * 100).toFixed(0)}%</p>
        {gameState.loans > 0 && (
          <p className="text-sm text-red-600">Loans: ${gameState.loans}</p>
        )}
      </div>
    </div>

    {/* Crop Info Modal */}
    {selectedCrop && (
      <div className="fixed bottom-20 left-6 bg-white rounded-lg shadow-lg p-4 max-w-xs">
        <h4 className="font-bold">{selectedCrop}</h4>
        <p className="text-sm text-gray-600">{CROPS[selectedCrop].description}</p>
        <div className="mt-2 space-y-1 text-sm">
          <p>Cost: ${CROPS[selectedCrop].cost}</p>
          <p>Growth Time: {CROPS[selectedCrop].growthTime} days</p>
          <p>Water Needs: {CROPS[selectedCrop].waterNeeds}%</p>
          <p>Temp Range: {CROPS[selectedCrop].tempRange.min}°F - {CROPS[selectedCrop].tempRange.max}°F</p>
        </div>
      </div>
    )}

    {/* Weather Info */}
    <div className="fixed top-6 right-24 bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center gap-2">
        {getWeatherIcon(gameState.weather)}
        <div>
          <p className="text-sm font-bold">{gameState.weather.charAt(0).toUpperCase() + gameState.weather.slice(1)}</p>
          <p className="text-xs text-gray-600">Moisture: {gameState.moisture}%</p>
        </div>
      </div>
    </div>

    {/* Notifications with different styles based on type */}
    <div className="fixed top-24 right-6 flex flex-col gap-2 z-50">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`bg-white shadow-lg rounded-lg p-4 animate-slideIn ${
            notification.type === 'error' ? 'border-l-4 border-red-500' :
            notification.type === 'warning' ? 'border-l-4 border-yellow-500' :
            notification.type === 'success' ? 'border-l-4 border-green-500' :
            'border-l-4 border-blue-500'
          }`}
        >
          {notification.message}
        </div>
      ))}
    </div>
  </div>
  );
}






            
