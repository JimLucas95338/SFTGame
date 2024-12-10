import React, { useState, useEffect } from 'react';
import { Home, Sun, Cloud, Wind, Thermometer, Droplet, Activity, Leaf, MessageSquare } from 'lucide-react';

export default function SmartFarmGame() {
  const CROPS = {
  CORN: { 
    icon: '🌽', 
    growthTime: 3, 
    value: 100,     // Increased from 15
    cost: 25,      // New: separate planting cost
    waterNeeds: 60, // New: optimal moisture level
    tempRange: { min: 60, max: 85 } // New: optimal temperature range
  },
  WHEAT: { 
    icon: '🌾', 
    growthTime: 2, 
    value: 75,
    cost: 15,
    waterNeeds: 40,
    tempRange: { min: 55, max: 75 }
  },
  TOMATO: { 
    icon: '🍅', 
    growthTime: 4, 
    value: 150,
    cost: 35,
    waterNeeds: 75,
    tempRange: { min: 65, max: 90 }
  }
};

  const [gameState, setGameState] = useState({
    day: 1,
    money: 1000,
    weather: 'sunny',
    temperature: 75,
    moisture: 60,
    sensors: [],
  });

  const [grid, setGrid] = useState(
    Array(6).fill().map(() => Array(6).fill(null))
  );

  const [selectedCrop, setSelectedCrop] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showAdvisor, setShowAdvisor] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "I'm your farm advisor! How can I help?" }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const addNotification = (message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message }]);
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
      moisture: newWeather === 'rainy' ? 80 : 60,
    }));

    if (newTemp > 90) {
      addNotification('🌡️ High temperature alert! Consider watering crops.');
    }
  };

  const growCrops = () => {
    setGrid(prevGrid => {
      return prevGrid.map(row => 
        row.map(cell => {
          if (cell && cell.type) {
            const newGrowthStage = cell.growthStage + 1;
            if (newGrowthStage >= CROPS[cell.type].growthTime) {
              addNotification(`🌟 ${cell.type} is ready to harvest!`);
              return { ...cell, growthStage: newGrowthStage, ready: true };
            }
            return { ...cell, growthStage: newGrowthStage };
          }
          return cell;
        })
      );
    });
  };

  const advanceDay = () => {
    simulateWeatherChange();
    growCrops();
    setGameState(prev => ({
      ...prev,
      day: prev.day + 1,
    }));
  };

  const addSensor = (type) => {
    if (gameState.money >= 100) {
      setGameState(prev => ({
        ...prev,
        sensors: [...prev.sensors, { type, id: Date.now() }],
        money: prev.money - 100
      }));
      addNotification(`🎯 New ${type} sensor added!`);
    } else {
      addNotification('❌ Not enough money for sensor!');
    }
  };

  const plantCrop = (row, col) => {
    if (!selectedCrop) {
      addNotification('🌱 Select a crop first!');
      return;
    }
    if (gameState.money < 50) {
      addNotification('❌ Not enough money to plant!');
      return;
    }
    
    setGrid(prev => {
      const newGrid = [...prev.map(row => [...row])];
      newGrid[row][col] = {
        type: selectedCrop,
        growthStage: 0,
        ready: false
      };
      return newGrid;
    });
    
    setGameState(prev => ({
      ...prev,
      money: prev.money - 50
    }));
    addNotification(`🌱 Planted ${selectedCrop}!`);
  };

  const harvestCrop = (row, col) => {
    const crop = grid[row][col];
    if (crop && crop.ready) {
      const value = CROPS[crop.type].value;
      setGameState(prev => ({
        ...prev,
        money: prev.money + value
      }));
      setGrid(prev => {
        const newGrid = [...prev.map(row => [...row])];
        newGrid[row][col] = null;
        return newGrid;
      });
      addNotification(`💰 Harvested ${crop.type} for $${value}!`);
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
    
    const gameContext = {
      currentState: {
        day: gameState.day,
        weather: gameState.weather,
        temperature: gameState.temperature,
        moisture: gameState.moisture,
        money: gameState.money,
        sensorCount: gameState.sensors.length,
        cropsPlanted: grid.flat().filter(cell => cell !== null).length,
      }
    };

    // Mock advisor response based on context
    let response = "I'm analyzing your farm... ";
    if (message.toLowerCase().includes('weather')) {
      if (gameState.temperature > 90) {
        response += "The temperature is quite high. Consider adding extra irrigation.";
      } else if (gameState.weather === 'rainy') {
        response += "The rain will help your crops, but monitor for over-saturation.";
      }
    } else if (message.toLowerCase().includes('crop') || message.toLowerCase().includes('plant')) {
      response += "For best results, diversify your crops and monitor soil moisture levels.";
    } else if (message.toLowerCase().includes('money') || message.toLowerCase().includes('profit')) {
      response += `You currently have $${gameState.money}. Consider investing in sensors.`;
    } else {
      response += "How can I help you optimize your farm's performance?";
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setMessages(prev => [...prev, 
      { role: 'user', content: message },
      { role: 'assistant', content: response }
    ]);
    
    setIsTyping(false);
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
        <h2 className="text-xl font-bold text-gray-800 mb-4">Plant Crops ($50)</h2>
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
                    getAdvisorResponse(currentMessage);
                    setCurrentMessage('');
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

      {/* Notifications */}
      <div className="fixed top-6 right-6 flex flex-col gap-2 z-50">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className="bg-white shadow-lg rounded-lg p-4 animate-slideIn"
          >
            {notification.message}
          </div>
        ))}
      </div>
    </div>
  );
}
