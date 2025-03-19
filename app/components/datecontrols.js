import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Check } from 'lucide-react';

// This is the modified date range component that will be used in CustomTrackRankings
const DateRangeControls = ({ 
  startDate, 
  endDate, 
  setStartDate, 
  setEndDate, 
  setQuickRange 
}) => {
  // State to track which date is selected for arrow adjustments
  const [selectedDate, setSelectedDate] = useState('both'); // 'start', 'end', or 'both'
  
  // Function to adjust a date by a given number of days
  const adjustDate = (date, days) => {
    if (!date) return null;
    
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };
  
  // Function to handle up/down arrow clicks based on selected date
  const handleDateChange = (direction) => {
    const days = direction === 'up' ? 1 : -1;
    
    if (selectedDate === 'start' || selectedDate === 'both') {
      setStartDate(adjustDate(startDate, days));
    }
    
    if (selectedDate === 'end' || selectedDate === 'both') {
      setEndDate(adjustDate(endDate, days));
    }
  };

  // Handle quick range selection with integrated arrow functionality
  const handleQuickRangeWithArrows = (days, direction) => {
    if (direction) {
      // If a direction is provided, adjust the selected quick range
      const adjustmentFactor = direction === 'up' ? 1 : -1;
      
      // Adjust based on the type of range
      let adjustmentAmount;
      switch (days) {
        case 1: // Day
          adjustmentAmount = 1; // +/- 1 day
          break;
        case 7: // Week
          adjustmentAmount = 7; // +/- 1 week
          break;
        case 30: // Month
          adjustmentAmount = 30; // +/- 1 month (approximately)
          break;
        case 90: // Quarter
          adjustmentAmount = 90; // +/- 1 quarter (approximately)
          break;
        case 365: // Year
          adjustmentAmount = 365; // +/- 1 year
          break;
        default:
          adjustmentAmount = 1;
      }
      
      // Apply the adjustment
      if (selectedDate === 'start' || selectedDate === 'both') {
        setStartDate(adjustDate(startDate, adjustmentAmount * adjustmentFactor));
      }
      
      if (selectedDate === 'end' || selectedDate === 'both') {
        setEndDate(adjustDate(endDate, adjustmentAmount * adjustmentFactor));
      }
    } else {
      // If no direction, just set the quick range normally
      setQuickRange(days);
    }
  };
  
  return (
    <div className="space-y-3">
      <div className="flex items-start space-x-4">
        <div className="flex flex-col items-center">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded px-2 py-1 text-orange-700 focus:border-orange-400 focus:ring-orange-400 mb-2"
            onClick={() => setSelectedDate('start')}
          />
          <div className="w-6 h-6 flex items-center justify-center">
            {selectedDate === 'start' || selectedDate === 'both' ? (
              <div className="w-6 h-6 bg-teal-100 rounded flex items-center justify-center">
                <Check size={16} className="text-teal-500" />
              </div>
            ) : (
              <div className="w-6 h-6 bg-white rounded border border-gray-300"></div>
            )}
          </div>
        </div>
        
        <div className="flex items-center pt-1">
          <span className="text-orange-700">to</span>
        </div>
        
        <div className="flex flex-col items-center">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded px-2 py-1 text-orange-700 focus:border-orange-400 focus:ring-orange-400 mb-2"
            onClick={() => setSelectedDate('end')}
          />
          <div className="w-6 h-6 flex items-center justify-center">
            {selectedDate === 'end' || selectedDate === 'both' ? (
              <div className="w-6 h-6 bg-teal-100 rounded flex items-center justify-center">
                <Check size={16} className="text-teal-500" />
              </div>
            ) : (
              <div className="w-6 h-6 bg-white rounded border border-gray-300"></div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col pt-1 ml-4">
          <button 
            onClick={() => handleDateChange('up')}
            className="p-1 text-orange-700 hover:bg-orange-100 rounded"
            title="Increase selected date(s)"
          >
            <ChevronUp size={20} />
          </button>
          <button 
            onClick={() => handleDateChange('down')}
            className="p-1 text-orange-700 hover:bg-orange-100 rounded"
            title="Decrease selected date(s)"
          >
            <ChevronDown size={20} />
          </button>
        </div>
        
        <div className="flex flex-col items-center justify-center pt-1 ml-auto">
          <button
            onClick={() => setSelectedDate('both')}
            className={`px-4 py-1 rounded ${
              selectedDate === 'both' 
                ? 'bg-orange-500 text-white' 
                : 'bg-orange-200 text-orange-700 hover:bg-orange-300'
            }`}
          >
            Both
          </button>
        </div>
      </div>
      
      <div className="flex space-x-4">
        {/* Quick range buttons with integrated up/down arrows */}
        <div className="flex flex-col items-center">
          <button 
            onClick={() => handleQuickRangeWithArrows(1)}
            className="w-20 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
          >
            Day
          </button>
          <div className="flex mt-1">
            <button 
              onClick={() => handleQuickRangeWithArrows(1, 'up')}
              className="p-1 text-orange-700 hover:bg-orange-100 rounded"
            >
              <ChevronUp size={16} />
            </button>
            <button 
              onClick={() => handleQuickRangeWithArrows(1, 'down')}
              className="p-1 text-orange-700 hover:bg-orange-100 rounded"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
        
        <div className="flex flex-col items-center">
          <button 
            onClick={() => handleQuickRangeWithArrows(7)}
            className="w-20 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
          >
            Week
          </button>
          <div className="flex mt-1">
            <button 
              onClick={() => handleQuickRangeWithArrows(7, 'up')}
              className="p-1 text-orange-700 hover:bg-orange-100 rounded"
            >
              <ChevronUp size={16} />
            </button>
            <button 
              onClick={() => handleQuickRangeWithArrows(7, 'down')}
              className="p-1 text-orange-700 hover:bg-orange-100 rounded"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
        
        <div className="flex flex-col items-center">
          <button 
            onClick={() => handleQuickRangeWithArrows(30)}
            className="w-20 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
          >
            Month
          </button>
          <div className="flex mt-1">
            <button 
              onClick={() => handleQuickRangeWithArrows(30, 'up')}
              className="p-1 text-orange-700 hover:bg-orange-100 rounded"
            >
              <ChevronUp size={16} />
            </button>
            <button 
              onClick={() => handleQuickRangeWithArrows(30, 'down')}
              className="p-1 text-orange-700 hover:bg-orange-100 rounded"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
        
        <div className="flex flex-col items-center">
          <button 
            onClick={() => handleQuickRangeWithArrows(90)}
            className="w-20 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
          >
            Quarter
          </button>
          <div className="flex mt-1">
            <button 
              onClick={() => handleQuickRangeWithArrows(90, 'up')}
              className="p-1 text-orange-700 hover:bg-orange-100 rounded"
            >
              <ChevronUp size={16} />
            </button>
            <button 
              onClick={() => handleQuickRangeWithArrows(90, 'down')}
              className="p-1 text-orange-700 hover:bg-orange-100 rounded"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
        
        <div className="flex flex-col items-center">
          <button 
            onClick={() => handleQuickRangeWithArrows(365)}
            className="w-20 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
          >
            Year
          </button>
          <div className="flex mt-1">
            <button 
              onClick={() => handleQuickRangeWithArrows(365, 'up')}
              className="p-1 text-orange-700 hover:bg-orange-100 rounded"
            >
              <ChevronUp size={16} />
            </button>
            <button 
              onClick={() => handleQuickRangeWithArrows(365, 'down')}
              className="p-1 text-orange-700 hover:bg-orange-100 rounded"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateRangeControls;