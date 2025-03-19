import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
  
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={`border rounded px-2 py-1 text-orange-700 focus:border-orange-400 focus:ring-orange-400 ${
              selectedDate === 'start' ? 'border-orange-500 border-2' : ''
            }`}
            onClick={() => setSelectedDate('start')}
          />
          
          <span className="mx-2 text-orange-700">to</span>
          
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={`border rounded px-2 py-1 text-orange-700 focus:border-orange-400 focus:ring-orange-400 ${
              selectedDate === 'end' ? 'border-orange-500 border-2' : ''
            }`}
            onClick={() => setSelectedDate('end')}
          />
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={() => handleDateChange('up')}
            className="p-1 bg-orange-200 text-orange-700 rounded hover:bg-orange-300"
            title="Increase selected date(s) by 1 day"
          >
            <ChevronUp size={18} />
          </button>
          <button 
            onClick={() => handleDateChange('down')}
            className="p-1 bg-orange-200 text-orange-700 rounded hover:bg-orange-300"
            title="Decrease selected date(s) by 1 day"
          >
            <ChevronDown size={18} />
          </button>
          <span className="text-sm text-orange-700 ml-1">
            {selectedDate === 'start' ? 'Adjusting start date' : 
             selectedDate === 'end' ? 'Adjusting end date' : 
             'Adjusting both dates'}
          </span>
        </div>
        
        <div>
          <button 
            onClick={() => setSelectedDate('both')}
            className={`px-2 py-1 rounded ${
              selectedDate === 'both' 
                ? 'bg-orange-500 text-white' 
                : 'bg-orange-200 text-orange-700 hover:bg-orange-300'
            }`}
            title="Adjust both dates together"
          >
            Both
          </button>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <button 
          onClick={() => setQuickRange(1)}
          className="px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
          title="Today"
        >
          Day
        </button>
        <button 
          onClick={() => setQuickRange(7)}
          className="px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
          title="Last 7 days"
        >
          Week
        </button>
        <button 
          onClick={() => setQuickRange(30)}
          className="px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
          title="Last 30 days"
        >
          Month
        </button>
        <button 
          onClick={() => setQuickRange(90)}
          className="px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
          title="Last 90 days"
        >
          Quarter
        </button>
        <button 
          onClick={() => setQuickRange(365)}
          className="px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
          title="Last 365 days"
        >
          Year
        </button>
      </div>
    </div>
  );
};

export default DateRangeControls;