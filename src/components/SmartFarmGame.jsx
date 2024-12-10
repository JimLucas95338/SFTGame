import React, { useState, useEffect } from 'react';
import { Home, Sun, Cloud, Wind, Thermometer, Droplet, Activity, Leaf, MessageSquare } from 'lucide-react';

export default function SmartFarmGamePreview() {
  const CROPS = {
    CORN: { icon: '🌽', growthTime: 3, value: 15 },
    WHEAT: { icon: '🌾', growthTime: 2, value: 10 },
    TOMATO: { icon: '🍅', growthTime: 4, value: 20 },
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
  const [messages, setMessages] = useState([]);
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
    const gameContext = `
      Current farm state:
      - Day: ${gameState.day}
      - Weather: ${gameState.weather}
      - Temperature: ${gameState.temperature}°F
      - Moisture: ${gameState.moisture}%
      - Money: $${gameState.money}
      - Sensors: ${gameState.sensors.length}
      - Crops planted: ${grid.flat().filter(cell => cell !== null).length}
    `;

    await new Promise(resolve => setTimeout(resolve, 1000));

    let response = "I'm your farm advisor! ";
    if (message.toLowerCase().includes('weather')) {
      if (gameState.temperature > 90) {
        response += "The temperature is quite high. Consider adding extra irrigation to protect your crops.";
      } else if (gameState.weather === 'rainy') {
        response += "The rain will help your crops, but monitor for over-saturation.";
      }
    } else if (message.toLowerCase().includes('crop') || message.toLowerCase().includes('plant')) {
      response += "For best results, diversify your crops and monitor soil moisture levels with sensors.";
    } else if (message.toLowerCase().includes('money') || message.toLowerCase().includes('profit')) {
      response += `You currently have $${gameState.money}. Consider investing in sensors to optimize crop yields.`;
    }

    setMessages(prev => [...prev, 
      { role: 'user', content: message },
      { role: 'assistant', content: response }
    ]);
    setIsTyping(false);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto relative min-h-screen">
      <div className="mb-6 flex justify-between items-center bg-green-100 p-4 rounded-lg">
        <div>
          <div className="flex items-center gap-2">
            <Home className="text-green-800" size={24} />
            <h2 className="text-2xl font-bold text-green-800">Farm Simulator</h2>
          </div>
          <p className="text-green-600">Day: {gameState.day}</p>
          <p className="text-green-600">Money: ${gameState.money}</p>
        </div>
        <div className="flex gap-4 items-center">
          {getWeatherIcon(gameState.weather)}
          <div className="flex items-center gap-1">
            <Thermometer className="text-red-500" size={24} />
            <span className="text-lg">{gameState.temperature}°F</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-bold mb-2">Tools</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => addSensor('temperature')}
              className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 flex items-center gap-1"
            >
              <Thermometer size={16} />
              Add Temperature Sensor ($100)
            </button>
            <button
              onClick={() => addSensor('moisture')}
              className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 flex items-center gap-1"
            >
              <Droplet size={16} />
              Add Moisture Sensor ($100)
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-bold mb-2">Plant Crops ($50)</h3>
          <div className="flex gap-2">
            {Object.keys(CROPS).map(crop => (
              <button
                key={crop}
                onClick={() => setSelectedCrop(crop)}
                className={`px-3 py-1 rounded flex items-center gap-1 ${
                  selectedCrop === crop 
                    ? 'bg-green-500 text-white' 
                    : 'bg-green-100 hover:bg-green-200'
                }`}
              >
                <Leaf size={16} />
                {crop}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-1 mb-6">
        {grid.map((row, i) => 
          row.map((cell, j) => (
            <div
              key={`${i}-${j}`}
              className={`aspect-square ${
                cell ? 'bg-green-300' : 'bg-green-100'
              } hover:bg-green-200 cursor-pointer border border-green-300 flex items-center justify-center text-2xl`}
              onClick={() => cell?.ready ? harvestCrop(i, j) : plantCrop(i, j)}
            >
              {cell && (
                <div className="relative">
                  {CROPS[cell.type].icon}
                  {cell.ready && <span className="absolute -top-2 -right-2 text-sm">✨</span>}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={advanceDay}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center gap-2"
        >
          <Activity size={18} />
          Next Day
        </button>
      </div>

      <button
        onClick={() => setShowAdvisor(true)}
        className="fixed bottom-4 right-4 bg-green-500 text-white p-3 rounded-full shadow-lg hover:bg-green-600 z-40"
      >
        <MessageSquare size={24} />
      </button>

      {showAdvisor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-96 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold">Farm Advisor</h3>
              <button
                onClick={() => setShowAdvisor(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === 'user'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 rounded-lg p-3">
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
                  className="flex-1 border rounded-lg px-3 py-2"
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

      <div className="fixed top-4 right-4 flex flex-col gap-2 z-50 pointer-events-none">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className="bg-white shadow-lg rounded-lg p-3 opacity-90 hover:opacity-100 transition-opacity pointer-events-auto"
            style={{
              animation: `
                slideIn 0.2s ease-out,
                slideOut 0.2s ease-in 2.8s
              `,
            }}
          >
            {notification.message}
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 0.9;
          }
        }

        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 0.9;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
