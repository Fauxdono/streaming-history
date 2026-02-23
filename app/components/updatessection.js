"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Mail, Check, Clock, Sparkles, BugIcon, ThumbsUp, ThumbsDown, Send } from 'lucide-react';
import { useTheme } from './themeprovider';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatDistanceToNow } from 'date-fns';

const UpdatesSection = () => {
  const { isDarkMode } = useTheme();

  // Past Updates
  const pastUpdates = [];

  // Planned Updates
  const plannedUpdates = [];

  // Contact information
  const contactEmail = "phionnancake@gmail.com";

  // Active tab state
  const [activeTab, setActiveTab] = useState('community-suggestions');

  // Community Suggestions state
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  const [filterCategory, setFilterCategory] = useState('all');
  const [newPostText, setNewPostText] = useState('');
  const [newPostUsername, setNewPostUsername] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('feature-request');
  const [submitting, setSubmitting] = useState(false);
  const [votedPosts, setVotedPosts] = useState({});
  const [error, setError] = useState(null);

  // Load saved username and voted posts from localStorage
  useEffect(() => {
    try {
      const savedUsername = localStorage.getItem('suggestion_username');
      if (savedUsername) setNewPostUsername(savedUsername);
      const saved = JSON.parse(localStorage.getItem('voted_posts') || '{}');
      // Migrate from old array format
      if (Array.isArray(saved)) {
        const migrated = {};
        saved.forEach((id) => { migrated[id] = 'up'; });
        setVotedPosts(migrated);
        localStorage.setItem('voted_posts', JSON.stringify(migrated));
      } else {
        setVotedPosts(saved);
      }
    } catch {}
  }, []);

  // Firestore real-time listener
  useEffect(() => {
    const q = query(collection(db, 'suggestions'), orderBy('createdAt', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPosts(data);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error('Firestore listener error:', err);
      setError('Failed to load suggestions: ' + err.message);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Sorted and filtered posts
  const displayPosts = useMemo(() => {
    let filtered = posts;
    if (filterCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === filterCategory);
    }
    if (sortBy === 'most-voted') {
      filtered = [...filtered].sort((a, b) => (b.votes || 0) - (a.votes || 0));
    }
    return filtered;
  }, [posts, sortBy, filterCategory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = newPostText.trim();
    const username = newPostUsername.trim() || 'Anonymous';
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'suggestions'), {
        text,
        username,
        category: newPostCategory,
        votes: 0,
        createdAt: serverTimestamp(),
      });
      localStorage.setItem('suggestion_username', username);
      setNewPostText('');
    } catch (err) {
      console.error('Failed to submit:', err);
      setError('Failed to post: ' + err.message);
    }
    setSubmitting(false);
  };

  const handleVote = async (postId, currentVotes, direction) => {
    const existing = votedPosts[postId]; // 'up', 'down', or undefined
    try {
      let delta = 0;
      let newDirection = null;
      if (existing === direction) {
        // Undo: clicking the same button again
        delta = direction === 'up' ? -1 : 1;
        newDirection = null;
      } else if (existing) {
        // Switch: was up, now down (or vice versa) — swing by 2
        delta = direction === 'up' ? 2 : -2;
        newDirection = direction;
      } else {
        // Fresh vote
        delta = direction === 'up' ? 1 : -1;
        newDirection = direction;
      }
      const newVotes = (currentVotes || 0) + delta;
      await updateDoc(doc(db, 'suggestions', postId), { votes: newVotes });
      const updated = { ...votedPosts };
      if (newDirection) {
        updated[postId] = newDirection;
      } else {
        delete updated[postId];
      }
      setVotedPosts(updated);
      localStorage.setItem('voted_posts', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  };

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'feature-request', label: 'Feature' },
    { value: 'bug-report', label: 'Bug' },
    { value: 'general', label: 'General' },
    { value: 'random', label: 'Random' },
  ];

  const categoryColors = {
    'feature-request': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    'bug-report': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    'general': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    'random': 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  };

  const categoryLabels = { 'feature-request': 'Feature', 'bug-report': 'Bug', 'general': 'General', 'random': 'Random' };

  // Shared style helpers
  const tabClass = (tab) =>
    `px-4 py-2 font-medium ${
      activeTab === tab
        ? isDarkMode
          ? 'text-violet-400 border-b-2 border-violet-400'
          : 'text-violet-600 border-b-2 border-violet-600'
        : isDarkMode
        ? 'text-gray-400 hover:text-violet-300'
        : 'text-gray-500 hover:text-violet-700'
    }`;

  const headingColor = isDarkMode ? 'text-violet-300' : 'text-violet-700';
  const cardBg = isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-violet-50 border-violet-200 hover:border-violet-300';
  const textColor = isDarkMode ? 'text-gray-300' : 'text-violet-600';
  const mutedText = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  const renderIcon = (type) => {
    switch (type) {
      case 'release': return <Check className="text-green-500" />;
      case 'feature': return <Sparkles className="text-blue-500" />;
      case 'bug-fix': return <BugIcon className="text-red-500" />;
      default: return <Clock className="text-gray-500" />;
    }
  };

  const renderPriorityBadge = (priority) => {
    switch (priority) {
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
      <div className={`flex border-b mb-4 ${isDarkMode ? 'border-gray-700' : ''}`}>
        <button onClick={() => setActiveTab('community-suggestions')} className={tabClass('community-suggestions')}>
          Suggestions/Bugs
        </button>
        <button onClick={() => setActiveTab('past-updates')} className={tabClass('past-updates')}>
          Past Updates
        </button>
        <button onClick={() => setActiveTab('planned-updates')} className={tabClass('planned-updates')}>
          Planned Updates
        </button>
      </div>

      {activeTab === 'past-updates' && (
        <div className="space-y-4">
          <h3 className={`font-bold text-lg ${headingColor}`}>Version History</h3>
          {pastUpdates.map((update, index) => (
            <div key={index} className={`p-4 rounded-lg border transition-colors ${cardBg}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {renderIcon(update.type)}
                  <span className={`font-medium ${headingColor}`}>Version {update.version}</span>
                </div>
                <span className={`text-sm ${textColor}`}>{update.date}</span>
              </div>
              <ul className={`list-disc list-inside space-y-1 ${textColor}`}>
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
          <h3 className={`font-bold text-lg ${headingColor}`}>Upcoming Features</h3>
          {plannedUpdates.map((update, index) => (
            <div key={index} className={`p-4 rounded-lg border transition-colors ${cardBg}`}>
              <div className="flex justify-between items-center mb-2">
                <h4 className={`font-bold ${headingColor}`}>{update.title}</h4>
                {renderPriorityBadge(update.priority)}
              </div>
              <p className={textColor}>{update.description}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'community-suggestions' && (
        <div className="space-y-4">
          <h3 className={`font-bold text-lg ${headingColor}`}>Community Suggestions</h3>

          {error && (
            <div className="p-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Sort & Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
              <button
                onClick={() => setSortBy('newest')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  sortBy === 'newest'
                    ? isDarkMode ? 'bg-violet-600 text-white' : 'bg-violet-500 text-white'
                    : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Newest
              </button>
              <button
                onClick={() => setSortBy('most-voted')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  sortBy === 'most-voted'
                    ? isDarkMode ? 'bg-violet-600 text-white' : 'bg-violet-500 text-white'
                    : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Most Voted
              </button>
            </div>
            <div className="flex gap-1.5 ml-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setFilterCategory(cat.value)}
                  className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
                    filterCategory === cat.value
                      ? isDarkMode ? 'bg-violet-600 text-white' : 'bg-violet-500 text-white'
                      : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Post Form */}
          <form onSubmit={handleSubmit} className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-violet-50 border-violet-200'}`}>
            <div className="flex flex-wrap gap-3 mb-3">
              <input
                type="text"
                placeholder="Username (optional)"
                value={newPostUsername}
                onChange={(e) => setNewPostUsername(e.target.value.slice(0, 30))}
                className={`px-3 py-2 rounded-lg border text-sm w-40 ${
                  isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
                }`}
              />
              <div className="flex gap-1.5 items-center">
                {[
                  { value: 'feature-request', label: 'Feature' },
                  { value: 'bug-report', label: 'Bug' },
                  { value: 'general', label: 'General' },
                  { value: 'random', label: 'Random' },
                ].map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setNewPostCategory(cat.value)}
                    className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
                      newPostCategory === cat.value
                        ? isDarkMode ? 'bg-violet-600 text-white' : 'bg-violet-500 text-white'
                        : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <textarea
                placeholder="Share a suggestion or report a bug..."
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value.slice(0, 500))}
                rows={3}
                className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${
                  isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
                }`}
              />
              <span className={`absolute bottom-2 right-2 text-xs ${mutedText}`}>
                {newPostText.length}/500
              </span>
            </div>
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={!newPostText.trim() || submitting}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !newPostText.trim() || submitting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
                    : isDarkMode
                    ? 'bg-violet-600 text-white hover:bg-violet-500'
                    : 'bg-violet-500 text-white hover:bg-violet-600'
                }`}
              >
                <Send size={14} />
                {submitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>

          {/* Post List */}
          {loading ? (
            <div className={`text-center py-8 ${mutedText}`}>Loading suggestions...</div>
          ) : displayPosts.length === 0 ? (
            <div className={`text-center py-8 ${mutedText}`}>
              {filterCategory !== 'all' ? 'No posts in this category yet.' : 'No suggestions yet. Be the first!'}
            </div>
          ) : (
            <div className="space-y-3">
              {displayPosts.map((post) => (
                <div key={post.id} className={`p-4 rounded-lg border transition-colors ${cardBg}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`font-medium text-sm ${headingColor}`}>{post.username}</span>
                        <span className={`text-xs ${mutedText}`}>
                          {post.createdAt?.toDate
                            ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true })
                            : 'just now'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[post.category] || ''}`}>
                          {categoryLabels[post.category] || post.category}
                        </span>
                      </div>
                      <p className={`text-sm ${textColor} whitespace-pre-wrap break-words`}>{post.text}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleVote(post.id, post.votes, 'up')}
                        className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${
                          votedPosts[post.id] === 'up'
                            ? isDarkMode ? 'bg-violet-900/40 text-violet-400' : 'bg-violet-100 text-violet-600'
                            : isDarkMode ? 'bg-gray-700 text-gray-400 hover:bg-violet-900/40 hover:text-violet-400' : 'bg-gray-100 text-gray-500 hover:bg-violet-100 hover:text-violet-600'
                        }`}
                        title={votedPosts[post.id] === 'up' ? 'Remove upvote' : 'Upvote'}
                      >
                        <ThumbsUp size={14} />
                      </button>
                      <span className={`text-xs font-medium min-w-[1.5rem] text-center ${mutedText}`}>{post.votes || 0}</span>
                      <button
                        onClick={() => handleVote(post.id, post.votes, 'down')}
                        className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${
                          votedPosts[post.id] === 'down'
                            ? isDarkMode ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-600'
                            : isDarkMode ? 'bg-gray-700 text-gray-400 hover:bg-red-900/40 hover:text-red-400' : 'bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600'
                        }`}
                        title={votedPosts[post.id] === 'down' ? 'Remove downvote' : 'Downvote'}
                      >
                        <ThumbsDown size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UpdatesSection;
