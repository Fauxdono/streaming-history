"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Mail, Check, Clock, Sparkles, BugIcon, ThumbsUp, ThumbsDown, Send, Shield } from 'lucide-react';
import { useTheme } from './themeprovider';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatDistanceToNow } from 'date-fns';

const UpdatesSection = ({ colorMode = 'minimal' }) => {
  const { isDarkMode } = useTheme();
  const isColorful = colorMode === 'colorful';

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
  const [showPINInput, setShowPINInput] = useState(null);
  const [adminPIN, setAdminPIN] = useState('');
  const [pinError, setPinError] = useState(null);
  const [completeNotes, setCompleteNotes] = useState('');

  // Planned Updates — derived from promoted suggestions
  const plannedUpdates = useMemo(() => posts.filter((p) => p.status === 'planned'), [posts]);

  // Past Updates — completed suggestions
  const pastUpdates = useMemo(() =>
    [...posts.filter((p) => p.status === 'completed')].sort((a, b) => {
      const aTime = a.completedAt?.toDate?.() || new Date(0);
      const bTime = b.completedAt?.toDate?.() || new Date(0);
      return bTime - aTime;
    }),
    [posts]
  );

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
        status: 'open',
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
      const post = posts.find((p) => p.id === postId);
      const updateData = { votes: newVotes };
      if (newVotes >= 10 && (!post?.status || post.status === 'open')) {
        updateData.status = 'planned';
      }
      await updateDoc(doc(db, 'suggestions', postId), updateData);
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

  const handlePromote = async (postId) => {
    if (adminPIN !== 'cake') {
      setPinError(postId);
      setTimeout(() => setPinError(null), 2000);
      return;
    }
    try {
      const post = posts.find((p) => p.id === postId);
      await updateDoc(doc(db, 'suggestions', postId), {
        votes: post?.votes || 0,
        status: 'planned',
      });
      setShowPINInput(null);
      setAdminPIN('');
    } catch (err) {
      console.error('Failed to promote:', err);
    }
  };

  const handleComplete = async (postId) => {
    if (adminPIN !== 'cake') {
      setPinError(postId);
      setTimeout(() => setPinError(null), 2000);
      return;
    }
    try {
      const post = posts.find((p) => p.id === postId);
      await updateDoc(doc(db, 'suggestions', postId), {
        status: 'completed',
        completedNotes: completeNotes.trim(),
        completedAt: serverTimestamp(),
        votes: post?.votes || 0,
      });
      setShowPINInput(null);
      setAdminPIN('');
      setCompleteNotes('');
    } catch (err) {
      console.error('Failed to complete:', err);
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

  // Color system for colorful/minimal modes
  const modeColors = isColorful ? {
    heading: isDarkMode ? 'text-violet-300' : 'text-violet-700',
    text: isDarkMode ? 'text-gray-300' : 'text-violet-600',
    muted: isDarkMode ? 'text-gray-400' : 'text-gray-500',
    cardBg: isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-violet-50 border-violet-200 hover:border-violet-300',
    inputBg: isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400',
    tabActive: isDarkMode ? 'text-violet-400 border-b-2 border-violet-400' : 'text-violet-600 border-b-2 border-violet-600',
    tabInactive: isDarkMode ? 'text-gray-400 hover:text-violet-300' : 'text-gray-500 hover:text-violet-700',
    tabBorder: isDarkMode ? 'border-gray-700' : '',
    buttonActive: isDarkMode ? 'bg-violet-600 text-white' : 'bg-violet-500 text-white',
    buttonInactive: isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
    sortBorder: 'border-gray-300 dark:border-gray-600',
    sortInactive: isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-50',
    submitActive: isDarkMode ? 'bg-violet-600 text-white hover:bg-violet-500' : 'bg-violet-500 text-white hover:bg-violet-600',
    submitDisabled: 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400',
    voteUpActive: isDarkMode ? 'bg-violet-900/40 text-violet-400' : 'bg-violet-100 text-violet-600',
    voteUpInactive: isDarkMode ? 'bg-gray-700 text-gray-400 hover:bg-violet-900/40 hover:text-violet-400' : 'bg-gray-100 text-gray-500 hover:bg-violet-100 hover:text-violet-600',
    voteDownActive: isDarkMode ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-600',
    voteDownInactive: isDarkMode ? 'bg-gray-700 text-gray-400 hover:bg-red-900/40 hover:text-red-400' : 'bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600',
    voteCount: isDarkMode ? 'bg-gray-700' : 'bg-gray-100',
    notesBox: isDarkMode ? 'bg-gray-700/50 text-gray-300' : 'bg-violet-100/50 text-violet-700',
    adminBtn: isDarkMode ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
    confirmBtn: isDarkMode ? 'bg-violet-700 text-violet-200 hover:bg-violet-600' : 'bg-violet-100 text-violet-700 hover:bg-violet-200',
    promoteConfirmBtn: isDarkMode ? 'bg-green-700 text-green-200 hover:bg-green-600' : 'bg-green-100 text-green-700 hover:bg-green-200',
    cancelBtn: isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700',
    plannedBadge: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    completedBadge: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  } : {
    heading: isDarkMode ? 'text-white' : 'text-black',
    text: isDarkMode ? 'text-white' : 'text-black',
    muted: isDarkMode ? 'text-gray-400' : 'text-gray-600',
    cardBg: isDarkMode ? 'bg-black border-[#4169E1] hover:border-[#4169E1]' : 'bg-white border-black hover:border-black',
    inputBg: isDarkMode ? 'bg-black border-[#4169E1] text-white placeholder-gray-500' : 'bg-white border-black text-black placeholder-gray-400',
    tabActive: isDarkMode ? 'text-white border-b-2 border-[#4169E1]' : 'text-black border-b-2 border-black',
    tabInactive: isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black',
    tabBorder: isDarkMode ? 'border-[#4169E1]' : 'border-black',
    buttonActive: isDarkMode ? 'bg-black text-white border border-[#4169E1] translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#4169E1]' : 'bg-white text-black border border-black translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_black]',
    buttonInactive: isDarkMode ? 'bg-black text-white border border-[#4169E1] hover:bg-gray-900 shadow-[2px_2px_0_0_#4169E1]' : 'bg-white text-black border border-black hover:bg-gray-100 shadow-[2px_2px_0_0_black]',
    sortBorder: isDarkMode ? 'border-[#4169E1]' : 'border-black',
    sortInactive: isDarkMode ? 'bg-black text-white border-r border-[#4169E1] hover:bg-gray-900' : 'bg-white text-black border-r border-black hover:bg-gray-100',
    submitActive: isDarkMode ? 'bg-black text-white border border-[#4169E1] hover:bg-gray-900 shadow-[2px_2px_0_0_#4169E1]' : 'bg-white text-black border border-black hover:bg-gray-100 shadow-[2px_2px_0_0_black]',
    submitDisabled: isDarkMode ? 'bg-gray-900 text-gray-600 cursor-not-allowed border border-gray-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-300',
    voteUpActive: isDarkMode ? 'bg-black text-[#4169E1] border border-[#4169E1] shadow-[inset_2px_2px_0_0_#4169E1]' : 'bg-white text-black border border-black shadow-[inset_2px_2px_0_0_black]',
    voteUpInactive: isDarkMode ? 'bg-black text-gray-400 border border-[#4169E1] hover:text-[#4169E1] shadow-[2px_2px_0_0_#4169E1]' : 'bg-white text-gray-500 border border-black hover:text-black shadow-[2px_2px_0_0_black]',
    voteDownActive: isDarkMode ? 'bg-black text-red-400 border border-[#4169E1] shadow-[inset_2px_2px_0_0_#4169E1]' : 'bg-white text-red-600 border border-black shadow-[inset_2px_2px_0_0_black]',
    voteDownInactive: isDarkMode ? 'bg-black text-gray-400 border border-[#4169E1] hover:text-red-400 shadow-[2px_2px_0_0_#4169E1]' : 'bg-white text-gray-500 border border-black hover:text-red-600 shadow-[2px_2px_0_0_black]',
    voteCount: isDarkMode ? 'bg-black' : 'bg-white',
    notesBox: isDarkMode ? 'bg-black border border-[#4169E1] text-white' : 'bg-white border border-black text-black',
    adminBtn: isDarkMode ? 'text-gray-500 hover:text-white hover:bg-gray-900' : 'text-gray-400 hover:text-black hover:bg-gray-100',
    confirmBtn: isDarkMode ? 'bg-black text-white border border-[#4169E1] hover:bg-gray-900' : 'bg-white text-black border border-black hover:bg-gray-100',
    promoteConfirmBtn: isDarkMode ? 'bg-black text-white border border-[#4169E1] hover:bg-gray-900' : 'bg-white text-black border border-black hover:bg-gray-100',
    cancelBtn: isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black',
    plannedBadge: isDarkMode ? 'border border-[#4169E1] text-white' : 'border border-black text-black',
    completedBadge: isDarkMode ? 'border border-[#4169E1] text-white' : 'border border-black text-black',
  };

  const tabClass = (tab) =>
    `px-4 py-2 font-medium ${activeTab === tab ? modeColors.tabActive : modeColors.tabInactive}`;

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
      <div className={`flex border-b mb-4 ${modeColors.tabBorder}`}>
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
          <h3 className={`font-bold text-lg ${modeColors.heading}`}>Past Updates</h3>
          {pastUpdates.length === 0 ? (
            <div className={`text-center py-8 ${modeColors.muted}`}>No completed updates yet.</div>
          ) : (
            pastUpdates.map((post) => (
              <div key={post.id} className={`p-4 rounded-lg border transition-colors ${modeColors.cardBg}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`font-medium text-sm ${modeColors.heading}`}>{post.username}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[post.category] || ''}`}>
                        {categoryLabels[post.category] || post.category}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${modeColors.completedBadge}`}>
                        Completed
                      </span>
                      {post.completedAt?.toDate && (
                        <span className={`text-xs ${modeColors.muted}`}>
                          {formatDistanceToNow(post.completedAt.toDate(), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${modeColors.text} whitespace-pre-wrap break-words`}>{post.text}</p>
                    {post.completedNotes && (
                      <div className={`mt-2 p-2 rounded text-sm ${modeColors.notesBox}`}>
                        <span className="font-medium">Notes:</span> {post.completedNotes}
                      </div>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 shrink-0 px-2 py-1.5 rounded-lg ${modeColors.voteCount}`}>
                    <ThumbsUp size={14} className={modeColors.muted} />
                    <span className={`text-xs font-medium ${modeColors.muted}`}>{post.votes || 0}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'planned-updates' && (
        <div className="space-y-4">
          <h3 className={`font-bold text-lg ${modeColors.heading}`}>Upcoming Features</h3>
          {plannedUpdates.length === 0 ? (
            <div className={`text-center py-8 ${modeColors.muted}`}>No planned updates yet. Suggestions with 10+ votes are automatically promoted!</div>
          ) : (
            plannedUpdates.map((post) => (
              <div key={post.id} className={`p-4 rounded-lg border transition-colors ${modeColors.cardBg}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`font-medium text-sm ${modeColors.heading}`}>{post.username}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[post.category] || ''}`}>
                        {categoryLabels[post.category] || post.category}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${modeColors.plannedBadge}`}>
                        Planned
                      </span>
                    </div>
                    <p className={`text-sm ${modeColors.text} whitespace-pre-wrap break-words`}>{post.text}</p>
                    {/* Admin complete UI */}
                    <div className="mt-2">
                      {showPINInput === `complete-${post.id}` ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            placeholder="Notes on what was implemented..."
                            value={completeNotes}
                            onChange={(e) => setCompleteNotes(e.target.value.slice(0, 500))}
                            rows={2}
                            className={`w-full px-2 py-1 rounded text-xs border resize-none ${modeColors.inputBg}`}
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="password"
                              placeholder="PIN"
                              value={adminPIN}
                              onChange={(e) => setAdminPIN(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleComplete(post.id);
                                if (e.key === 'Escape') { setShowPINInput(null); setAdminPIN(''); setCompleteNotes(''); }
                              }}
                              autoFocus
                              className={`w-20 px-2 py-1 rounded text-xs border ${modeColors.inputBg}`}
                            />
                            <button
                              onMouseDown={(e) => { e.preventDefault(); handleComplete(post.id); }}
                              className={`text-xs px-2 py-1 rounded ${modeColors.confirmBtn}`}
                            >
                              Confirm
                            </button>
                            <button
                              onMouseDown={(e) => { e.preventDefault(); setShowPINInput(null); setAdminPIN(''); setCompleteNotes(''); }}
                              className={`text-xs px-2 py-1 rounded ${modeColors.cancelBtn}`}
                            >
                              Cancel
                            </button>
                            {pinError === post.id && (
                              <span className="text-xs text-red-500">Wrong PIN</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setShowPINInput(`complete-${post.id}`); setAdminPIN(''); setCompleteNotes(''); setPinError(null); }}
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${modeColors.adminBtn}`}
                          title="Mark as completed"
                        >
                          <Check size={12} />
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 shrink-0 px-2 py-1.5 rounded-lg ${modeColors.voteCount}`}>
                    <ThumbsUp size={14} className={modeColors.muted} />
                    <span className={`text-xs font-medium ${modeColors.muted}`}>{post.votes || 0}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'community-suggestions' && (
        <div className="space-y-4">
          <h3 className={`font-bold text-lg ${modeColors.heading}`}>Community Suggestions</h3>

          {error && (
            <div className="p-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Sort & Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className={`flex rounded-lg overflow-hidden border ${modeColors.sortBorder}`}>
              <button
                onClick={() => setSortBy('newest')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  sortBy === 'newest' ? modeColors.buttonActive : modeColors.sortInactive
                }`}
              >
                Newest
              </button>
              <button
                onClick={() => setSortBy('most-voted')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  sortBy === 'most-voted' ? modeColors.buttonActive : modeColors.sortInactive
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
                    filterCategory === cat.value ? modeColors.buttonActive : modeColors.buttonInactive
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Post Form */}
          <form onSubmit={handleSubmit} className={`p-4 rounded-lg border ${modeColors.cardBg}`}>
            <div className="flex flex-wrap gap-3 mb-3">
              <input
                type="text"
                placeholder="Username (optional)"
                value={newPostUsername}
                onChange={(e) => setNewPostUsername(e.target.value.slice(0, 30))}
                className={`px-3 py-2 rounded-lg border text-sm w-40 ${modeColors.inputBg}`}
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
                      newPostCategory === cat.value ? modeColors.buttonActive : modeColors.buttonInactive
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
                className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${modeColors.inputBg}`}
              />
              <span className={`absolute bottom-2 right-2 text-xs ${modeColors.muted}`}>
                {newPostText.length}/500
              </span>
            </div>
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={!newPostText.trim() || submitting}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !newPostText.trim() || submitting ? modeColors.submitDisabled : modeColors.submitActive
                }`}
              >
                <Send size={14} />
                {submitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>

          {/* Post List */}
          {loading ? (
            <div className={`text-center py-8 ${modeColors.muted}`}>Loading suggestions...</div>
          ) : displayPosts.length === 0 ? (
            <div className={`text-center py-8 ${modeColors.muted}`}>
              {filterCategory !== 'all' ? 'No posts in this category yet.' : 'No suggestions yet. Be the first!'}
            </div>
          ) : (
            <div className="space-y-3">
              {displayPosts.map((post) => (
                <div key={post.id} className={`p-4 rounded-lg border transition-colors ${modeColors.cardBg}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`font-medium text-sm ${modeColors.heading}`}>{post.username}</span>
                        <span className={`text-xs ${modeColors.muted}`}>
                          {post.createdAt?.toDate
                            ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true })
                            : 'just now'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[post.category] || ''}`}>
                          {categoryLabels[post.category] || post.category}
                        </span>
                        {post.status === 'planned' && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${modeColors.plannedBadge}`}>
                            Planned
                          </span>
                        )}
                        {post.status === 'completed' && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${modeColors.completedBadge}`}>
                            Completed
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${modeColors.text} whitespace-pre-wrap break-words`}>{post.text}</p>
                      {/* Admin promote UI — hidden for planned and completed */}
                      {(!post.status || post.status === 'open') && (
                        <div className="mt-2">
                          {showPINInput === post.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="password"
                                placeholder="PIN"
                                value={showPINInput === post.id ? adminPIN : ''}
                                onChange={(e) => setAdminPIN(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handlePromote(post.id);
                                  if (e.key === 'Escape') { setShowPINInput(null); setAdminPIN(''); }
                                }}
                                onBlur={() => { setShowPINInput(null); setAdminPIN(''); }}
                                autoFocus
                                className={`w-20 px-2 py-1 rounded text-xs border ${modeColors.inputBg}`}
                              />
                              <button
                                onMouseDown={(e) => { e.preventDefault(); handlePromote(post.id); }}
                                className={`text-xs px-2 py-1 rounded ${modeColors.promoteConfirmBtn}`}
                              >
                                Confirm
                              </button>
                              {pinError === post.id && (
                                <span className="text-xs text-red-500">Wrong PIN</span>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => { setShowPINInput(post.id); setAdminPIN(''); setPinError(null); }}
                              className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${modeColors.adminBtn}`}
                              title="Promote to planned"
                            >
                              <Shield size={12} />
                              Promote
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleVote(post.id, post.votes, 'up')}
                        className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${
                          votedPosts[post.id] === 'up' ? modeColors.voteUpActive : modeColors.voteUpInactive
                        }`}
                        title={votedPosts[post.id] === 'up' ? 'Remove upvote' : 'Upvote'}
                      >
                        <ThumbsUp size={14} />
                      </button>
                      <span className={`text-xs font-medium min-w-[1.5rem] text-center ${modeColors.muted}`}>{post.votes || 0}</span>
                      <button
                        onClick={() => handleVote(post.id, post.votes, 'down')}
                        className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${
                          votedPosts[post.id] === 'down' ? modeColors.voteDownActive : modeColors.voteDownInactive
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
