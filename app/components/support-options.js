import React, { useState } from 'react';
import { Heart, Coffee, CreditCard, DollarSign, Copy, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';

const SupportOptions = ({ className = "" }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [activePlatform, setActivePlatform] = useState('ko-fi');
  const [copied, setCopied] = useState(false);

  const accounts = {
    'ko-fi': 'yourusername',
    'buymeacoffee': 'yourusername', 
    'paypal': 'youremail@example.com',
    'venmo': '@your-username',
    'crypto': 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' // Example BTC address
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
            <div className="text-blue-500 font-medium">Support my work on Ko-fi</div>
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
            <div className="text-yellow-700 font-medium">Support on Buy Me A Coffee</div>
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
    <Card className={`w-full bg-gradient-to-r from-blue-50 to-purple-50 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center">
          <span className="text-purple-600">i will never succumb to ads</span>
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="flex items-center space-x-1 text-sm font-normal text-purple-500 hover:text-purple-700"
          >
            <Heart size={16} className="text-red-500" />
            <span>{showOptions ? "Hide Options" : "support options"}</span>
          </button>
        </CardTitle>
      </CardHeader>
      
      {showOptions && (
        <CardContent>
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            <button
              onClick={() => setActivePlatform('ko-fi')}
              className={`px-3 py-1 rounded-full text-sm ${
                activePlatform === 'ko-fi' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              Ko-fi
            </button>
            <button
              onClick={() => setActivePlatform('buymeacoffee')}
              className={`px-3 py-1 rounded-full text-sm ${
                activePlatform === 'buymeacoffee' 
                  ? 'bg-yellow-500 text-white' 
                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              }`}
            >
              Buy Me A Coffee
            </button>
            <button
              onClick={() => setActivePlatform('paypal')}
              className={`px-3 py-1 rounded-full text-sm ${
                activePlatform === 'paypal' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              PayPal
            </button>
            <button
              onClick={() => setActivePlatform('venmo')}
              className={`px-3 py-1 rounded-full text-sm ${
                activePlatform === 'venmo' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              Venmo
            </button>
            <button
              onClick={() => setActivePlatform('crypto')}
              className={`px-3 py-1 rounded-full text-sm ${
                activePlatform === 'crypto' 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              }`}
            >
              Crypto
            </button>
          </div>
          
          <div className="p-4 border border-gray-200 rounded-lg bg-white">
            {renderPlatformContent()}
          </div>
          
          <div className="mt-4 text-sm text-center text-gray-600">
            Your support helps keep this project running ad-free and enables new features!
          </div>
        </CardContent>
      )}
      {!showOptions && (
        <CardContent className="pt-0">
          <div className="text-sm text-center text-gray-600">
            ❤️
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default SupportOptions;