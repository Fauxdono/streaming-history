import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import _ from 'lodash';
import { useTheme } from './themeprovider.js';

const DeviceUsageTable = ({ deviceData }) => {
  console.log('DeviceData received:', deviceData);
  
  // Get the current theme
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  if (!deviceData || Object.keys(deviceData).length === 0) {
    return <div className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>No device data available</div>;
  }

  const years = [...new Set(Object.values(deviceData).flatMap(devices => 
    Object.keys(devices)))].sort();
  const devices = Object.keys(deviceData);

  console.log('Years:', years);
  console.log('Devices:', devices);

  const chartData = years.map(year => {
    const yearData = { year };
    devices.forEach(device => {
      yearData[device] = deviceData[device]?.[year] || 0;
    });
    return yearData;
  });

  console.log('ChartData:', chartData);

  const colors = isDarkMode 
    ? ['#9a7ced', '#82e3cf', '#ffdc94', '#ff9f73', '#a4de6c', '#d0ed57', '#7bceff']
    : ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#a4de6c', '#d0ed57', '#83a6ed'];

  return (
    <div className="mt-6">
      <h3 className={`font-bold mb-4 ${
        isDarkMode ? 'text-purple-300' : 'text-purple-700'
      }`}>Device Usage by Year</h3>
      <div className="w-full h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip />
            <Legend />
            {devices.map((device, index) => (
              <Bar 
                key={device}
                dataKey={device}
                stackId="a"
                fill={colors[index % colors.length]}
                name={device}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DeviceUsageTable;