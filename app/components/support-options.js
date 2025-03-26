import React, { useState } from 'react';
import { Heart, Coffee, CreditCard, DollarSign, Copy, Check, MoreHorizontal } from 'lucide-react';

const SupportOptions = ({ className = "" }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [activePlatform, setActivePlatform] = useState('ko-fi');
  const [copied, setCopied] = useState(false);

  const accounts = {
    'ko-fi': 'fauxdono',
    'buymeacoffee': 'fauxdono', 
    'paypal': 'youremail@example.com',
    'venmo': '@your-username',
    'crypto': 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
      case 'paypal':
        return (
          <div className="text-center space-y-3">
            <div className="text-blue-700 font-medium">Send via PayPal</div>
            <div className="flex items-center justify-center space-x-2">
              <code className="px-2 py-1 bg-gray-100 rounded text-blue-700">{accounts['paypal']}</code>
              <button 
                onClick={() => copyToClipboard(accounts['paypal'])}
                className="p-1 text-gray-500 hover:text-blue-500"
                title="Copy email"
              >
                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              </button>
            </div>
            <a 
              href={`https://paypal.me/${accounts['paypal'].split('@')[0]}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <DollarSign className="inline mr-2" size={16} />
              PayPal.me
            </a>
          </div>
        );
      case 'venmo':
        return (
          <div className="text-center space-y-3">
            <div className="text-blue-500 font-medium">Send via Venmo</div>
            <div className="flex items-center justify-center space-x-2">
              <code className="px-2 py-1 bg-gray-100 rounded text-blue-700">{accounts['venmo']}</code>
              <button 
                onClick={() => copyToClipboard(accounts['venmo'])}
                className="p-1 text-gray-500 hover:text-blue-500"
                title="Copy username"
              >
                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        );
      case 'crypto':
        return (
          <div className="text-center space-y-3">
            <div className="text-purple-700 font-medium">Bitcoin Address</div>
            <div className="flex items-center justify-center space-x-2">
              <code className="px-2 py-1 bg-gray-100 rounded text-xs sm:text-sm text-purple-700 truncate max-w-[250px]">
                {accounts['crypto']}
              </code>
              <button 
                onClick={() => copyToClipboard(accounts['crypto'])}
                className="p-1 text-gray-500 hover:text-purple-500"
                title="Copy address"
              >
                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <div className="relative group">
        <button 
          onClick={() => setShowOptions(!showOptions)}
          className="p-2 bg-gradient-to-br from-pink-300 to-purple-400 text-white rounded-full shadow-lg hover:animate-pulse transition-all"
          title={showOptions ? "Close support options" : "Support this project"}
        >
          {showOptions ? <MoreHorizontal /> : <Heart fill="currentColor" />}
        </button>

        {showOptions && (
          <div className="absolute bottom-full right-0 mb-2 w-72 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 space-y-3 origin-bottom-right">
            <div className="text-sm text-gray-600 italic">
              "No ads, just vibes" - Support the dream 🚀
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {['ko-fi', 'buymeacoffee', 'paypal', 'venmo', 'crypto'].map(platform => (
                <button
                  key={platform}
                  onClick={() => setActivePlatform(platform)}
                  className={`px-3 py-1 rounded-full text-xs ${
                    activePlatform === platform 
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {platform}
                </button>
              ))}
            </div>

            <div className="border-t pt-3">
              {renderPlatformContent()}
            </div>

            <div className="text-xs text-center text-gray-500">
              Keeping it 100% indie and ad-free 💖
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportOptions;