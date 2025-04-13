import React, { useState } from 'react';
import { Mail, Check, Clock, Sparkles, BugIcon } from 'lucide-react';

const UpdatesSection = () => {

  // Suggestions/Problems - placeholder for future feature
  const [communitySuggestions, setCommunitySuggestions] = useState([
 ];
  // Past Updates - a log of changes and improvements
  const pastUpdates = [
    
  ];

  // Planned Updates - future improvements and features
  const plannedUpdates = [
  
    
  ]);

  // Contact information
  const contactEmail = "phionnancake@gmail.com";

  // Active tab state
  const [activeTab, setActiveTab] = useState('past-updates');

  const renderIcon = (type) => {
    switch(type) {
      case 'release': return <Check className="text-green-500" />;
      case 'feature': return <Sparkles className="text-blue-500" />;
      case 'bug-fix': return <BugIcon className="text-red-500" />;
      default: return <Clock className="text-gray-500" />;
    }
  };

  const renderPriorityBadge = (priority) => {
    switch(priority) {
      case 'high': 
        return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">High Priority</span>;
      case 'medium': 
        return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Medium Priority</span>;
      case 'low': 
        return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Low Priority</span>;
      default: 
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b mb-4">
        <button
          onClick={() => setActiveTab('past-updates')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'past-updates' 
              ? 'text-violet-600 border-b-2 border-violet-600' 
              : 'text-gray-500 hover:text-violet-700'
          }`}
        >
          Past Updates
        </button>
        <button
          onClick={() => setActiveTab('planned-updates')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'planned-updates' 
              ? 'text-violet-600 border-b-2 border-violet-600' 
              : 'text-gray-500 hover:text-violet-700'
          }`}
        >
          Planned Updates
        </button>
        <button
          onClick={() => setActiveTab('community-suggestions')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'community-suggestions' 
              ? 'text-violet-600 border-b-2 border-violet-600' 
              : 'text-gray-500 hover:text-violet-700'
          }`}
        >
          Community Suggestions
        </button>
      </div>

      {activeTab === 'past-updates' && (
        <div className="space-y-4">
          <h3 className="font-bold text-violet-700 text-lg">Version History</h3>
          {pastUpdates.map((update, index) => (
            <div 
              key={index} 
              className="bg-violet-50 p-4 rounded-lg border border-violet-200 hover:border-violet-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {renderIcon(update.type)}
                  <span className="font-medium text-violet-700">Version {update.version}</span>
                </div>
                <span className="text-sm text-violet-600">{update.date}</span>
              </div>
              <ul className="list-disc list-inside text-violet-600 space-y-1">
                {update.changes.map((change, changeIndex) => (
                  <li key={changeIndex}>{change}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'planned-updates' && (
        <div className="space-y-4">
          <h3 className="font-bold text-violet-700 text-lg">Upcoming Features</h3>
          {plannedUpdates.map((update, index) => (
            <div 
              key={index} 
              className="bg-violet-50 p-4 rounded-lg border border-violet-200 hover:border-violet-300 transition-colors"
            >
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-violet-700">{update.title}</h4>
                {renderPriorityBadge(update.priority)}
              </div>
              <p className="text-violet-600">{update.description}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'community-suggestions' && (
        <div className="space-y-4">
          <h3 className="font-bold text-violet-700 text-lg">Community Wishlist</h3>
          {communitySuggestions.map((suggestion) => (
            <div 
              key={suggestion.id} 
              className="bg-violet-50 p-4 rounded-lg border border-violet-200 hover:border-violet-300 transition-colors"
            >
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-violet-700">{suggestion.suggestion}</h4>
                <div className="flex items-center space-x-2">
                  <span className="text-violet-600">{suggestion.votes} votes</span>
                  <span 
                    className={`px-2 py-1 rounded-full text-xs ${
                      suggestion.status === 'under-review' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : suggestion.status === 'planned'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {suggestion.status === 'under-review' ? 'Under Review' : 'Planned'}
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          <div className="bg-violet-50 p-4 rounded-lg border border-violet-200">
            <h4 className="font-bold text-violet-700 mb-2 flex items-center">
              <Mail className="mr-2 text-violet-600" /> Have a Suggestion?
            </h4>
            <p className="text-violet-600 mb-3">
              We love hearing from our users! Share your ideas, feature requests, or report bugs.
            </p>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-violet-700">Contact:</span>
              <a 
                href={`mailto:${contactEmail}`} 
                className="text-violet-600 hover:text-violet-800 underline"
              >
                {contactEmail}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdatesSection;