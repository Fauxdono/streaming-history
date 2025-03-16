import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import StreamingByYear from './streaming-by-year.js';

const ListeningPatterns = ({ rawPlayData = [], formatDuration }) => {
  const [activeTab, setActiveTab] = useState('timeOfDay');
  
  // Time of day analysis
  const timeOfDayData = useMemo(() => {
    const hours = Array(24).fill(0).map((_, i) => ({
      hour: i,
      count: 0,
      totalMs: 0,
      label: `${i}:00`,
      displayHour: i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`
    }));
    
    const hourlyData = [...hours];
    
    rawPlayData.forEach(entry => {
      if (entry.ms_played >= 30000) { // Only count plays of at least 30 seconds
        const date = new Date(entry.ts);
        const hour = date.getHours();
        
        hourlyData[hour].count += 1;
        hourlyData[hour].totalMs += entry.ms_played;
      }
    });
    
    // Group into time periods for better visualization
    const timePeriods = [
      { name: 'Morning (5-11)', count: 0, totalMs: 0, color: '#8884d8' },
      { name: 'Afternoon (12-16)', count: 0, totalMs: 0, color: '#82ca9d' },
      { name: 'Evening (17-21)', count: 0, totalMs: 0, color: '#ffc658' },
      { name: 'Night (22-4)', count: 0, totalMs: 0, color: '#4B9CD3' }
    ];
    
    hourlyData.forEach((hour) => {
      if (hour.hour >= 5 && hour.hour <= 11) {
        timePeriods[0].count += hour.count;
        timePeriods[0].totalMs += hour.totalMs;
      } else if (hour.hour >= 12 && hour.hour <= 16) {
        timePeriods[1].count += hour.count;
        timePeriods[1].totalMs += hour.totalMs;
      } else if (hour.hour >= 17 && hour.hour <= 21) {
        timePeriods[2].count += hour.count;
        timePeriods[2].totalMs += hour.totalMs;
      } else {
        timePeriods[3].count += hour.count;
        timePeriods[3].totalMs += hour.totalMs;
      }
    });
    
    return { hourly: hourlyData, periods: timePeriods };
  }, [rawPlayData]);

  // Day of week analysis
  const dayOfWeekData = useMemo(() => {
    const days = [
      { name: 'Sunday', shortName: 'Sun', dayNum: 0, count: 0, totalMs: 0, color: '#FF8042' },
      { name: 'Monday', shortName: 'Mon', dayNum: 1, count: 0, totalMs: 0, color: '#00C49F' },
      { name: 'Tuesday', shortName: 'Tue', dayNum: 2, count: 0, totalMs: 0, color: '#FFBB28' },
      { name: 'Wednesday', shortName: 'Wed', dayNum: 3, count: 0, totalMs: 0, color: '#FF8042' },
      { name: 'Thursday', shortName: 'Thu', dayNum: 4, count: 0, totalMs: 0, color: '#0088FE' },
      { name: 'Friday', shortName: 'Fri', dayNum: 5, count: 0, totalMs: 0, color: '#8884d8' },
      { name: 'Saturday', shortName: 'Sat', dayNum: 6, count: 0, totalMs: 0, color: '#82ca9d' }
    ];
    
    rawPlayData.forEach(entry => {
      if (entry.ms_played >= 30000) {
        const date = new Date(entry.ts);
        const day = date.getDay();
        
        days[day].count += 1;
        days[day].totalMs += entry.ms_played;
      }
    });
    
    // Calculate average time per day
    const totalDays = {};
    
    rawPlayData.forEach(entry => {
      if (entry.ms_played >= 30000) {
        const date = new Date(entry.ts);
        const day = date.getDay();
        const dateString = date.toISOString().split('T')[0];
        
        if (!totalDays[day]) {
          totalDays[day] = new Set();
        }
        
        totalDays[day].add(dateString);
      }
    });
    
    days.forEach((day, index) => {
      const uniqueDayCount = totalDays[index] ? totalDays[index].size : 0;
      day.avgPerDay = uniqueDayCount > 0 ? day.count / uniqueDayCount : 0;
    });
    
    return days;
  }, [rawPlayData]);
  
  // Monthly/seasonal analysis
  const monthlyData = useMemo(() => {
    const months = [
      { name: 'January', shortName: 'Jan', monthNum: 0, count: 0, totalMs: 0, color: '#8884d8' },
      { name: 'February', shortName: 'Feb', monthNum: 1, count: 0, totalMs: 0, color: '#8884d8' },
      { name: 'March', shortName: 'Mar', monthNum: 2, count: 0, totalMs: 0, color: '#8884d8' },
      { name: 'April', shortName: 'Apr', monthNum: 3, count: 0, totalMs: 0, color: '#82ca9d' },
      { name: 'May', shortName: 'May', monthNum: 4, count: 0, totalMs: 0, color: '#82ca9d' },
      { name: 'June', shortName: 'Jun', monthNum: 5, count: 0, totalMs: 0, color: '#82ca9d' },
      { name: 'July', shortName: 'Jul', monthNum: 6, count: 0, totalMs: 0, color: '#ffc658' },
      { name: 'August', shortName: 'Aug', monthNum: 7, count: 0, totalMs: 0, color: '#ffc658' },
      { name: 'September', shortName: 'Sep', monthNum: 8, count: 0, totalMs: 0, color: '#ffc658' },
      { name: 'October', shortName: 'Oct', monthNum: 9, count: 0, totalMs: 0, color: '#4B9CD3' },
      { name: 'November', shortName: 'Nov', monthNum: 10, count: 0, totalMs: 0, color: '#4B9CD3' },
      { name: 'December', shortName: 'Dec', monthNum: 11, count: 0, totalMs: 0, color: '#4B9CD3' }
    ];
    
    // Group months into seasons
    const seasons = [
      { name: 'Spring (Mar-May)', count: 0, totalMs: 0, color: '#82ca9d' },
      { name: 'Summer (Jun-Aug)', count: 0, totalMs: 0, color: '#ffc658' },
      { name: 'Fall (Sep-Nov)', count: 0, totalMs: 0, color: '#FF8042' },
      { name: 'Winter (Dec-Feb)', count: 0, totalMs: 0, color: '#4B9CD3' }
    ];
    
    rawPlayData.forEach(entry => {
      if (entry.ms_played >= 30000) {
        const date = new Date(entry.ts);
        const month = date.getMonth();
        
        months[month].count += 1;
        months[month].totalMs += entry.ms_played;
        
        // Add to seasons
        if (month >= 2 && month <= 4) {
          seasons[0].count += 1;
          seasons[0].totalMs += entry.ms_played;
        } else if (month >= 5 && month <= 7) {
          seasons[1].count += 1;
          seasons[1].totalMs += entry.ms_played;
        } else if (month >= 8 && month <= 10) {
          seasons[2].count += 1;
          seasons[2].totalMs += entry.ms_played;
        } else {
          seasons[3].count += 1;
          seasons[3].totalMs += entry.ms_played;
        }
      }
    });
    
    return { months, seasons };
  }, [rawPlayData]);

  const TabButton = ({ id, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 font-medium ${
        activeTab === id
          ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600'
          : 'bg-purple-200 text-purple-600 hover:bg-purple-300'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b">
        <TabButton id="timeOfDay" label="Time of Day" />
        <TabButton id="dayOfWeek" label="Day of Week" />
        <TabButton id="seasonal" label="Seasonal" />
        <TabButton id="streaming" label="Streaming Services" />
      </div>

      {activeTab === 'timeOfDay' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-purple-700 mb-2">Listening by Time of Day</h3>
            <p className="text-purple-600 mb-4">When do you listen to music the most?</p>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={timeOfDayData.hourly}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="displayHour" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => {
                      return name === 'totalMs' ? formatDuration(value) : value;
                    }}
                    labelFormatter={(value) => `Hour: ${value}`}
                  />
                  <Legend />
                  <Bar name="Number of Plays" dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-bold text-purple-700 mb-2">Time Periods</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={timeOfDayData.periods}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {timeOfDayData.periods.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => value} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="flex flex-col justify-center">
              <h3 className="text-lg font-bold text-purple-700 mb-2">Time Period Stats</h3>
              <ul className="space-y-2">
                {timeOfDayData.periods.map((period, index) => (
                  <li key={index} className="p-2 bg-purple-50 rounded">
                    <span className="font-bold" style={{ color: period.color }}>{period.name}:</span>
                    <div className="ml-2 text-purple-400">
                      <div>{period.count} plays</div>
                      <div>{formatDuration(period.totalMs)} listening time</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'dayOfWeek' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-purple-700 mb-2">Listening by Day of Week</h3>
            <p className="text-purple-600 mb-4">Which days do you stream music the most?</p>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dayOfWeekData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="shortName" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'totalMs') return formatDuration(value);
                      if (name === 'avgPerDay') return value.toFixed(1);
                      return value;
                    }}
                  />
                  <Legend />
                  <Bar name="Number of Plays" dataKey="count" fill="#8884d8" />
                  <Bar name="Average per Day" dataKey="avgPerDay" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-bold text-purple-700 mb-2">Day of Week Stats</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {dayOfWeekData.map((day, index) => (
                <div key={index} className="p-3 bg-purple-50 rounded border border-purple-100">
                  <h4 className="font-bold text-purple-700">{day.name}</h4>
                  <div className="text-sm text-purple-600">
                    <div>Total Plays: {day.count}</div>
                    <div>Listening Time: {formatDuration(day.totalMs)}</div>
                    <div>Avg. Plays Per Day: {day.avgPerDay.toFixed(1)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'seasonal' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-purple-700 mb-2">Listening by Month</h3>
            <p className="text-purple-600 mb-4">How does your listening change throughout the year?</p>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyData.months}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="shortName" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => {
                      return name === 'totalMs' ? formatDuration(value) : value;
                    }}
                  />
                  <Legend />
                  <Bar name="Number of Plays" dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-bold text-purple-700 mb-2">Seasonal Listening</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={monthlyData.seasons}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {monthlyData.seasons.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => value} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="flex flex-col justify-center">
              <h3 className="text-lg font-bold text-purple-700 mb-2">Seasonal Stats</h3>
              <ul className="space-y-2">
                {monthlyData.seasons.map((season, index) => (
                  <li key={index} className="p-2 bg-purple-50 rounded">
                    <span className="font-bold" style={{ color: season.color }}>{season.name}:</span>
                    <div className="ml-2 text-purple-400">
                      <div>{season.count} plays</div>
                      <div>{formatDuration(season.totalMs)} listening time</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
)}
{activeTab === 'streaming' && (
  <StreamingByYear 
    rawPlayData={rawPlayData} 
    formatDuration={formatDuration} 
  />
)}
     
    </div>
  );
};

export default ListeningPatterns;