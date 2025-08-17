import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from './themeprovider.js'; // Add theme import if not passed as prop

const StreamingByYear = ({ rawPlayData = [], formatDuration, isDarkMode: propIsDarkMode }) => {
  // Use the theme if not explicitly passed as prop
  const { theme } = useTheme();
  const isDarkMode = propIsDarkMode !== undefined ? propIsDarkMode : theme === 'dark';
  
  // Service colors with dark mode variants
  const serviceColors = useMemo(() => ({
    'spotify': isDarkMode ? '#1ED760' : '#1DB954',
    'apple_music': isDarkMode ? '#FF6B6B' : '#FC3C44',
    'youtube_music': isDarkMode ? '#FF4B4B' : '#FF0000',
    'deezer': isDarkMode ? '#D9B3FF' : '#00C7F2',
    'soundcloud': isDarkMode ? '#FF8C54' : '#FF5500',
    'tidal': isDarkMode ? '#CCCCCC' : '#000000',
    'cake': isDarkMode ? '#FFB5DA' : '#FF69B4',
    'unknown': isDarkMode ? '#888888' : '#AAAAAA'
  }), [isDarkMode]);

  // Stroke color for pie charts
  const getStrokeColor = isDarkMode ? '#9CA3AF' : '#6B7280';

  // Custom pie chart label renderer
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null; // Hide labels for slices less than 5%
    
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
    
    return (
      <text 
        x={x} 
        y={y} 
        fill={getStrokeColor}
        style={{ fill: getStrokeColor }}
        textAnchor="middle" 
        dominantBaseline="central"
        fontSize="11px"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Process raw data to get usage by service
  const serviceData = useMemo(() => {
    if (!rawPlayData || rawPlayData.length === 0) {
      return { total: [], byYear: {} };
    }
    
    // Track total plays and time by service
    const serviceStats = {};
    const yearlyServiceStats = {};
    
    // Process each entry
    rawPlayData.forEach(entry => {
      if (entry.ms_played < 30000) return; // Skip very short plays
      
      try {
        // Get service from source or infer from platform
        let service = entry.source || 'unknown';
        if (service === 'unknown' && entry.platform) {
          if (entry.platform.toLowerCase().includes('spotify')) service = 'spotify';
          else if (entry.platform.toLowerCase().includes('apple')) service = 'apple_music';
          else if (entry.platform.toLowerCase().includes('youtube')) service = 'youtube_music';
        }
        
        // Initialize service stats if needed
        if (!serviceStats[service]) {
          serviceStats[service] = {
            service,
            count: 0,
            totalMs: 0,
            color: serviceColors[service] || serviceColors.unknown
          };
        }
        
        // Update service stats
        serviceStats[service].count += 1;
        serviceStats[service].totalMs += entry.ms_played;
        
        // Update yearly stats
        const date = new Date(entry.ts);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear().toString();
          
          // Initialize year if needed
          if (!yearlyServiceStats[year]) {
            yearlyServiceStats[year] = {};
          }
          
          // Initialize service for this year
          if (!yearlyServiceStats[year][service]) {
            yearlyServiceStats[year][service] = {
              service,
              count: 0,
              totalMs: 0,
              year,
              color: serviceColors[service] || serviceColors.unknown
            };
          }
          
          // Update yearly service stats
          yearlyServiceStats[year][service].count += 1;
          yearlyServiceStats[year][service].totalMs += entry.ms_played;
        }
      } catch (err) {
        // Skip entries with errors
      }
    });
    
    // Convert to arrays for charts
    const totalServiceData = Object.values(serviceStats)
      .filter(s => s.count > 0)
      .sort((a, b) => b.totalMs - a.totalMs);
    
    // Calculate total listening time for percentages
    const totalListeningTime = totalServiceData.reduce((sum, service) => sum + service.totalMs, 0);
    totalServiceData.forEach(service => {
      service.percentage = Math.round((service.totalMs / totalListeningTime) * 100);
    });
    
    // Process yearly data
    const yearlyData = {};
    Object.keys(yearlyServiceStats).forEach(year => {
      yearlyData[year] = Object.values(yearlyServiceStats[year])
        .filter(s => s.count > 0)
        .sort((a, b) => b.totalMs - a.totalMs);
      
      // Calculate yearly percentages
      const yearTotal = yearlyData[year].reduce((sum, service) => sum + service.totalMs, 0);
      yearlyData[year].forEach(service => {
        service.percentage = Math.round((service.totalMs / yearTotal) * 100);
      });
    });
    
    return { total: totalServiceData, byYear: yearlyData };
  }, [rawPlayData, serviceColors]);

  // Get available years
  const availableYears = useMemo(() => {
    return Object.keys(serviceData.byYear).sort((a, b) => b - a);
  }, [serviceData.byYear]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className={`text-lg font-bold mb-2 ${
          isDarkMode ? 'text-purple-300' : 'text-purple-700'
        }`}>Streaming Services</h3>
        <p className={`mb-4 ${
          isDarkMode ? 'text-purple-400' : 'text-purple-600'
        }`}>How do you distribute your listening across services?</p>
        
        {serviceData.total.length === 0 ? (
          <div className={`p-4 rounded border text-center ${
            isDarkMode ? 'bg-gray-800 border-gray-700 text-purple-400' : 'bg-purple-50 border-purple-100 text-purple-600'
          }`}>
            No service data available
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className={`font-medium mb-2 ${
                isDarkMode ? 'text-purple-300' : 'text-purple-700'
              }`}>Usage by Service</h4>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={serviceData.total}
                      dataKey="totalMs"
                      nameKey="service"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      labelLine={false}
                      label={renderCustomizedLabel}
                      stroke={getStrokeColor}
                      strokeWidth={1}
                    >
                      {serviceData.total.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => {
                        if (name === 'totalMs') return formatDuration(value);
                        return value;
                      }}
                      labelFormatter={(service) => {
                        return service.charAt(0).toUpperCase() + service.slice(1).replace('_', ' ');
                      }}
                    />
                    <Legend 
                      formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1).replace('_', ' ')}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div>
              <h4 className={`font-medium mb-2 ${
                isDarkMode ? 'text-purple-300' : 'text-purple-700'
              }`}>Service Stats</h4>
              <div className="space-y-3 max-h-72 overflow-y-auto p-1">
                {serviceData.total.map((service, index) => (
                  <div key={index} className={`p-3 rounded border ${
                    isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-purple-50 border-purple-100'
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: service.color }}></div>
                      <h5 className={`font-bold capitalize ${
                        isDarkMode ? 'text-purple-300' : 'text-purple-700'
                      }`}>
                        {service.service.replace('_', ' ')}
                      </h5>
                    </div>
                    <div className={`text-sm mt-1 ${
                      isDarkMode ? 'text-purple-400' : 'text-purple-600'
                    }`}>
                      <div>Plays: {service.count}</div>
                      <div>Listening Time: {formatDuration(service.totalMs)}</div>
                      <div>Share: {service.percentage}% of total</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {availableYears.length > 0 && (
        <div>
          <h3 className={`text-lg font-bold mb-2 ${
            isDarkMode ? 'text-purple-300' : 'text-purple-700'
          }`}>Services by Year</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableYears.map(year => (
              <div key={year} className={`p-4 rounded border ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-purple-50 border-purple-100'
              }`}>
                <h4 className={`font-bold mb-2 ${
                  isDarkMode ? 'text-purple-300' : 'text-purple-700'
                }`}>{year}</h4>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={serviceData.byYear[year]}
                        dataKey="totalMs"
                        nameKey="service"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        labelLine={false}
                        label={renderCustomizedLabel}
                        stroke={getStrokeColor}
                        strokeWidth={1}
                      >
                        {serviceData.byYear[year].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => {
                          if (name === 'totalMs') return formatDuration(value);
                          return value;
                        }}
                        labelFormatter={(service) => {
                          return service.charAt(0).toUpperCase() + service.slice(1).replace('_', ' ');
                        }}
                      />
                      <Legend 
                        formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1).replace('_', ' ')}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamingByYear;