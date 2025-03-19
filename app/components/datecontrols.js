import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronUp, Plus, Minus, Calendar } from 'lucide-react';

// This is the modified date range component that will be used in CustomTrackRankings
const DateRangeControls = ({ 
  startDate, 
  endDate, 
  setStartDate, 
  setEndDate, 
  setQuickRange 
}) => {
  
  // Function to adjust a date by a given number of days
  const adjustDate = (date, days) => {
    if (!date) return null;
    
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };
  
  return (
    <div className="flex flex-wrap gap-4 items-center">
      <div className="flex items-center">
        <div className="flex items-center gap-1 text-orange-700">
          <div className="flex flex-col">
            <button 
              onClick={() => setStartDate(adjustDate(startDate, 1))}
              className="p-1 text-orange-700 hover:bg-orange-100 rounded"
              title="Move start date forward (1 day later)"
            >
              <ChevronUp size={16} />
            </button>
            <button 
              onClick={() => setStartDate(adjustDate(startDate, -1))}
              className="p-1 text-orange-700 hover:bg-orange-100 rounded"
              title="Move start date back (1 day earlier)"
            >
              <ChevronDown size={16} />
            </button>
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded px-2 py-1 text-orange-700 focus:border-orange-400 focus:ring-orange-400"
          />
        </div>
        
        <span className="mx-2 text-orange-700">to</span>
        
        <div className="flex items-center gap-1 text-orange-700">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded px-2 py-1 text-orange-700 focus:border-orange-400 focus:ring-orange-400"
          />
          <div className="flex flex-col">
            <button 
              onClick={() => setEndDate(adjustDate(endDate, 1))}
              className="p-1 text-orange-700 hover:bg-orange-100 rounded"
              title="Move end date forward (1 day later)"
            >
              <ChevronUp size={16} />
            </button>
            <button 
              onClick={() => setEndDate(adjustDate(endDate, -1))}
              className="p-1 text-orange-700 hover:bg-orange-100 rounded"
              title="Move end date back (1 day earlier)"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-1">
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
      
      {/* Additional date range adjustments */}
      <div className="flex flex-wrap gap-1">
        <button 
          onClick={() => {
            setStartDate(adjustDate(startDate, -1));
            setEndDate(adjustDate(endDate, -1));
          }}
          className="px-2 py-1 bg-orange-200 text-orange-700 rounded hover:bg-orange-300 flex items-center"
          title="Move entire range back by 1 day"
        >
          <Minus size={14} className="mr-1" />1d
        </button>
        <button 
          onClick={() => {
            setStartDate(adjustDate(startDate, 1));
            setEndDate(adjustDate(endDate, 1));
          }}
          className="px-2 py-1 bg-orange-200 text-orange-700 rounded hover:bg-orange-300 flex items-center"
          title="Move entire range forward by 1 day"
        >
          <Plus size={14} className="mr-1" />1d
        </button>
        <button 
          onClick={() => {
            setStartDate(adjustDate(startDate, -7));
            setEndDate(adjustDate(endDate, -7));
          }}
          className="px-2 py-1 bg-orange-200 text-orange-700 rounded hover:bg-orange-300 flex items-center"
          title="Move entire range back by 1 week"
        >
          <Minus size={14} className="mr-1" />1w
        </button>
        <button 
          onClick={() => {
            setStartDate(adjustDate(startDate, 7));
            setEndDate(adjustDate(endDate, 7));
          }}
          className="px-2 py-1 bg-orange-200 text-orange-700 rounded hover:bg-orange-300 flex items-center"
          title="Move entire range forward by 1 week"
        >
          <Plus size={14} className="mr-1" />1w
        </button>
      </div>
    </div>
  );
};

export default DateRangeControls;