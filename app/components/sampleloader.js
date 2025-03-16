import React from 'react';
import { Download } from 'lucide-react';

const SampleDataLoader = ({ onSampleDataLoad }) => {
  // Sample data files to be "loaded" when button is clicked
  const handleLoadSampleData = async () => {
    try {
      // Simulate the loading of a pre-defined sample file
      const response = await fetch('/sample-spotify-data.json');
      const data = await response.json();
      
      // Create File objects that mimic user uploads
      const file = new File(
        [JSON.stringify(data)], 
        'sample-spotify-data.json', 
        { type: 'application/json' }
      );
      
      // Call the callback with the sample file
      onSampleDataLoad([file]);
    } catch (error) {
      console.error('Error loading sample data:', error);
      alert('Failed to load sample data. Please try again.');
    }
  };

  return (
    <div className="mt-4">
      <button
        onClick={handleLoadSampleData}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
      >
        <Download size={16} />
        Try with Sample Data
      </button>
      <p className="text-sm text-gray-600 mt-1">
        Want to test the app without uploading your own data? Click above to load sample streaming history.
      </p>
    </div>
  );
};

export default SampleDataLoader;
