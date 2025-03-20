import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const StreamingByYear = ({ rawPlayData = [], formatDuration }) => {
  const [selectedYear, setSelectedYear] = useState('all');
  
  // Analyze streaming service usage by year
  const serviceData = useMemo(() => {
    // Group plays by year and service
    const servicesByYear = {};
    let allServices = new Set();
    
    rawPlayData.forEach(entry => {
      if (entry.ms_played >= 30000) { // Only count meaningful plays
        const date = new Date(entry.ts);
        const year = date.getFullYear();
        const service = entry.source || 'unknown';
        
        // Add to set of all services
        allServices.add(service);
        
        // Initialize year if not exists
        if (!servicesByYear[year]) {
          servicesByYear[year] = {};
        }
        
        // Initialize service counter for this year
        if (!servicesByYear[year][service]) {
          servicesByYear[year][service] = {
            count: 0,
            totalMs: 0
          };
        }
        
        // Increment counters
        servicesByYear[year][service].count += 1;
        servicesByYear[year][service].totalMs += entry.ms_played;
      }
    });
    
    // Get array of all services for consistent ordering and colors
    const servicesArray = Array.from(allServices).sort();
    
    // Standard colors for services
    const serviceColors = {
      spotify: '#1DB954',
      apple_music: '#FC3C44',
      youtube_music: '#FF0000',
      tidal: '#000000',
      deezer: '#9B4DEE',  // Changed to purple
      unknown: '#666666'
    };
    
    // Assign colors to each service
    const serviceColorMap = {};
    servicesArray.forEach((service, index) => {
      serviceColorMap[service] = serviceColors[service] || 
        `hsl(${(index * 137) % 360}, 70%, 50%)`; // Generate colors if not in standard map
    });
    
    // Calculate total plays for each year
    const yearTotals = {};
    Object.entries(servicesByYear).forEach(([year, services]) => {
      yearTotals[year] = {
        totalPlays: Object.values(services).reduce((sum, data) => sum + data.count, 0),
        totalTime: Object.values(services).reduce((sum, data) => sum + data.totalMs, 0)
      };
    });
    
    // Format for bar chart - all years
    const barChartData = Object.entries(servicesByYear)
      .map(([year, services]) => {
        const result = { year };
        
        // Add all services (even those with zero plays in this year)
        servicesArray.forEach(service => {
          result[service] = services[service]?.count || 0;
          result[`${service}_time`] = services[service]?.totalMs || 0;
        });
        
        return result;
      })
      .sort((a, b) => a.year - b.year);
    
    return {
      servicesByYear,
      servicesArray,
      serviceColorMap,
      yearTotals,
      barChartData,
      years: Object.keys(servicesByYear).sort()
    };
  }, [rawPlayData]);
  
  // Get detailed data for selected year
  const selectedYearData = useMemo(() => {
    if (selectedYear === 'all' || !serviceData.servicesByYear[selectedYear]) {
      return {
        services: serviceData.servicesArray.map(service => {
          let totalCount = 0;
          let totalTime = 0;
          
          Object.values(serviceData.servicesByYear).forEach(yearData => {
            if (yearData[service]) {
              totalCount += yearData[service].count;
              totalTime += yearData[service].totalMs;
            }
          });
          
          return {
            name: service,
            count: totalCount,
            totalMs: totalTime,
            color: serviceData.serviceColorMap[service]
          };
        }),
        totalPlays: serviceData.servicesArray.reduce((sum, service) => {
          let serviceTotal = 0;
          Object.values(serviceData.servicesByYear).forEach(yearData => {
            if (yearData[service]) {
              serviceTotal += yearData[service].count;
            }
          });
          return sum + serviceTotal;
        }, 0),
        totalTime: serviceData.servicesArray.reduce((sum, service) => {
          let serviceTotal = 0;
          Object.values(serviceData.servicesByYear).forEach(yearData => {
            if (yearData[service]) {
              serviceTotal += yearData[service].totalMs;
            }
          });
          return sum + serviceTotal;
        }, 0)
      };
    }
    
    // Data for specific year
    return {
      services: serviceData.servicesArray.map(service => ({
        name: service,
        count: serviceData.servicesByYear[selectedYear][service]?.count || 0,
        totalMs: serviceData.servicesByYear[selectedYear][service]?.totalMs || 0,
        color: serviceData.serviceColorMap[service]
      })).sort((a, b) => b.count - a.count),
      totalPlays: serviceData.yearTotals[selectedYear].totalPlays,
      totalTime: serviceData.yearTotals[selectedYear].totalTime
    };
  }, [serviceData, selectedYear]);
  
  // Format a service name for display
  const formatServiceName = (service) => {
    // Convert snake_case to Title Case 
    return service
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-purple-700 mb-2">Streaming Services Usage by Year</h3>
        <p className="text-purple-600 mb-4">Track your usage of different streaming platforms over time</p>
        
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={serviceData.barChartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => {
                  // If it's a time value (name ends with _time), format as duration
                  if (name.endsWith('_time')) {
                    return [formatDuration(value), `${formatServiceName(name.replace('_time', ''))} Time`];
                  }
                  return [value, `${formatServiceName(name)} Plays`];
                }}
              />
              <Legend formatter={(value) => {
                // Only show the service names in the legend (not the _time variants)
                return value.endsWith('_time') ? null : formatServiceName(value);
              }} />
              
              {serviceData.servicesArray.map(service => (
                <Bar 
                  key={service} 
                  dataKey={service} 
                  fill={serviceData.serviceColorMap[service]} 
                  name={service}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-purple-700">Service Breakdown</h3>
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(e.target.value)}
          className="px-3 py-1 rounded border border-purple-300 bg-purple-700 text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
        >
          <option value="all">All Years</option>
          {serviceData.years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="p-4 bg-purple-50 rounded shadow-sm">
          <h4 className="font-semibold text-purple-700 mb-2">
            {selectedYear === 'all' ? 'All-Time' : selectedYear} Summary
          </h4>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-purple-600">Total Plays:</span>
              <span className="font-medium text-purple-800">{selectedYearData.totalPlays}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-600">Total Time:</span>
              <span className="font-medium text-purple-800">{formatDuration(selectedYearData.totalTime)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {selectedYearData.services
          .filter(service => service.count > 0) // Only show services with plays
          .map(service => (
            <div 
              key={service.name}
              className="p-3 rounded border border-purple-200 bg-white"
              style={{ borderLeftWidth: '4px', borderLeftColor: service.color }}
            >
              <div className="font-bold text-purple-800">
                {formatServiceName(service.name)}
              </div>
              <div className="text-sm text-purple-600">
                <div className="flex justify-between">
                  <span>Plays:</span>
                  <span className="font-medium">{service.count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time:</span>
                  <span className="font-medium">{formatDuration(service.totalMs)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Percentage:</span>
                  <span className="font-medium">
                    {Math.round((service.count / selectedYearData.totalPlays) * 100)}% of plays
                  </span>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default StreamingByYear;
