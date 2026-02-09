import React, { useState } from 'react';
import { Heart, Coffee } from 'lucide-react';
import { Card, CardContent } from './ui/Card';

const SupportOptions = ({ className = "", colorMode = "minimal" }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [activePlatform, setActivePlatform] = useState('ko-fi');

  const isColorful = colorMode === 'colorful';

  const accounts = {
    'ko-fi': 'fauxdono',
    'buymeacoffee': 'fauxdono'
  };

  const renderPlatformContent = () => {
    switch (activePlatform) {
      case 'ko-fi':
        return (
          <div className="text-center space-y-3">
            <div className="text-blue-500 font-medium">Ko-fi</div>
            <a
              href={`https://ko-fi.com/${accounts['ko-fi']}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Coffee className="inline mr-2" size={16} />
              Buy me a coffee
            </a>
          </div>
        );
      case 'buymeacoffee':
        return (
          <div className="text-center space-y-3">
            <div className="text-yellow-700 font-medium">Buy Me A Coffee</div>
            <a
              href={`https://www.buymeacoffee.com/${accounts['buymeacoffee']}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
            >
              <Coffee className="inline mr-2" size={16} />
              Buy me a coffee
            </a>
          </div>
        );
      default:
        return null;
    }
  };

  // Color classes based on mode
  const cardBg = isColorful
    ? 'bg-indigo-100 dark:bg-indigo-900 border-indigo-300 dark:border-indigo-700'
    : '';
  const textPrimary = isColorful
    ? 'text-indigo-700 dark:text-indigo-300'
    : 'text-black dark:text-white';
  const textSecondary = isColorful
    ? 'text-indigo-600 dark:text-indigo-400'
    : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white';
  const contentBg = isColorful
    ? 'bg-indigo-50 dark:bg-indigo-800 border-indigo-200 dark:border-indigo-600'
    : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700';
  const footerText = isColorful
    ? 'text-indigo-600 dark:text-indigo-400'
    : 'text-gray-600 dark:text-gray-400';
  const pillActive = isColorful
    ? 'bg-indigo-500 text-white'
    : 'bg-black dark:bg-white text-white dark:text-black';
  const pillInactive = isColorful
    ? 'bg-indigo-200 dark:bg-indigo-700 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-300 dark:hover:bg-indigo-600'
    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700';

  return (
    <Card className={`w-full ${cardBg} ${className}`}>
      <CardContent className="p-1">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className={`text-xs ${textPrimary}`}>no ads, just vibes</span>
            {!showOptions && <span className="text-red-500">❤️</span>}
          </div>
          <button
            onClick={() => setShowOptions(!showOptions)}
            className={`text-xs ${textSecondary}`}
          >
            {showOptions ? "Hide" : "Support"}
          </button>
        </div>
      </CardContent>

      {showOptions && (
        <CardContent>
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {['ko-fi', 'buymeacoffee'].map(platform => (
              <button
                key={platform}
                onClick={() => setActivePlatform(platform)}
                className={`px-3 py-1 rounded-full text-sm ${
                  activePlatform === platform
                    ? pillActive
                    : pillInactive
                }`}
              >
                {platform}
              </button>
            ))}
          </div>

          <div className={`p-4 border rounded-lg ${contentBg}`}>
            {renderPlatformContent()}
          </div>

          <div className={`mt-4 text-xs text-center ${footerText}`}>
            Love Yourz💖
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default SupportOptions;