import React, { useState } from 'react';
import { Home, Sun, Cloud, Wind, Thermometer, Droplet, Activity, Leaf, MessageSquare, DollarSign } from 'lucide-react';
import { CROPS, calculateYield, calculateLoanInterest, calculateMaintenanceCost, getWeatherEffect } from '../utils/gameUtils';
import { getAdvice } from '../services/advisorService';

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
    { role: 'assistant', content: "Welcome! I'm your farm advisor. What would you like to know about your farm?" }
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
              return { 
                ...cell, 
                growthStage: newGrowthStage, 
                ready: true,
                yieldValue 
              };
            }
            return { 
              ...cell, 
              growthStage: newGrowthStage,
              yieldValue 
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

    setGameState(prev => ({
      ...prev,
      day: prev.day + 1
    }));

    // Check for bankruptcy
    if (gameState.money < -1000) {
      addNotification('🚨 Warning: High debt! Consider selling crops or taking a loan.', 'error');
    }
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
        yieldValue: 1.0
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
      const finalValue = Math.round(crop.value * cell.yieldValue);
      
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
        `💰 Harvested ${cell.type} for $${finalValue}! (Yield: ${(cell.yieldValue * 100).toFixed(0)}%)`,
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

  const handleAdvisorMessage = async (message) => {
    setIsTyping(true);
    try {
      const advice = getAdvice(gameState, message, grid);
      setMessages(prev => [...prev, 
        { role: 'user', content: message },
        { role: 'assistant', content: advice }
      ]);
    } catch (error) {
      console.error('Error getting advice:', error);
      setMessages(prev => [...prev, 
        { role: 'user', content: message },
        { role: 'assistant', content: "I'm having trouble analyzing the farm right now. Please try again." }
      ]);
    }
    setIsTyping(false);
    setCurrentMessage('');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Farm Simulator</h1>
            <p className="text-lg text-gray-600">Day: {gameState.day}</p>
            <p className="text-lg text-gray-600">Money: ${gameState.money}</p>
          </div>
          <div className="flex items-center gap-4">
            {getWeatherIcon(gameState.weather)}
            <div className="flex items-center gap-2">
              <Thermometer className="text-red-500" />
              <span className="text-lg">{gameState.temperature}°F</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tools Section */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Tools</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => addSensor('temperature')}
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Thermometer size={18} />
            Add Temperature Sensor ($100)
          </button>
          <button
            onClick={() => addSensor('moisture')}
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Droplet size={18} />
            Add Moisture Sensor ($100)
          </button>
        </div>
      </div>

      {/* Plant Crops Section */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Plant Crops</h2>
        <div className="flex gap-3">
          {Object.keys(CROPS).map(crop => (
            <button
              key={crop}
              onClick={() => setSelectedCrop(crop)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                selectedCrop === crop 
                  ? 'bg-green-500 text-white'
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
              }`}
            >
              <Leaf size={18} />
              {crop}
            </button>
          ))}
        </div>
      </div>

      {/* Farm Grid */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="grid grid-cols-6 gap-2">
          {grid.map((row, i) => 
            row.map((cell, j) => (
              <div
                key={`${i}-${j}`}
                onClick={() => cell?.ready ? harvestCrop(i, j) : plantCrop(i, j)}
                className={`aspect-square rounded-lg flex items-center justify-center text-2xl cursor-pointer transition-colors ${
                  cell 
                    ? cell.ready 
                      ? 'bg-yellow-200 hover:bg-yellow-300'
                      : 'bg-green-200 hover:bg-green-300'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {cell && (
                  <div className="relative">
                    {CROPS[cell.type].icon}
                    {cell.ready && (
                      <span className="absolute -top-2 -right-2 text-sm">✨</span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-between">
        <button
          onClick={advanceDay}
          className="flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
        >
          <Activity size={20} />
          Next Day
        </button>
      </div>

      {/* Farm Advisor Button */}
      <button
        onClick={() => setShowAdvisor(true)}
        className="fixed bottom-6 right-6 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 transition-colors"
      >
        <MessageSquare size={24} />
      </button>

      {/* Advisor Modal */}
      {showAdvisor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">Farm Advisor</h3>
              <button
                onClick={() => setShowAdvisor(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="h-96 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === 'user'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-3">
                    Thinking...
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (currentMessage.trim()) {
                    handleAdvisorMessage(currentMessage);
                  }
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={currentMessage}
                  onChange={e => setCurrentMessage(e.target.value)}
                  placeholder="Ask for farming advice..."
                  className="flex-1 border rounded-lg px-4 py-2"
                />
                <button
                  type="submit"
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
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

      {/* Loan Button */}
      {gameState.money < 100 && (
        <button
          onClick={getLoan}
          className="fixed bottom-20 right-6 bg-yellow-500 text-white p-4 rounded-full shadow-lg hover:bg-yellow-600 transition-colors"
        >
          <DollarSign size={24} />
        </button>
      )}

      {/* Pay Loan Button */}
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

      {/* Notifications */}
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
