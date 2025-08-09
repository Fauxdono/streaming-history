import React, { useState, useRef, useEffect } from 'react';

const WheelSelector = ({
  items = [],
  value,
  onChange,
  label,
  colorTheme = 'teal',
  displayFormat = (val) => val
}) => {
  // Check if we're in dark mode by looking at the document
  const isDarkMode = typeof window !== 'undefined' && 
    (document.documentElement.classList.contains('dark') || 
     document.body.classList.contains('dark') ||
     window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [momentum, setMomentum] = useState(0);
  const [lastTouchTime, setLastTouchTime] = useState(0);
  const [lastTouchY, setLastTouchY] = useState(0);
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  
  // Smaller control with fewer visible items
  const itemHeight = 28; // Height in pixels
  const totalHeight = itemHeight * 3; // Show 3 items total (selected + one above + one below)
  
  // Find the index of the currently selected value
  const selectedIndex = items.findIndex(item => item.toString() === value?.toString());
  
  // Get color classes based on theme
  const getColors = () => {
    switch (colorTheme) {
      case 'pink':
        return {
          border: 'border-pink-300',
          highlight: 'bg-pink-100',
          text: 'text-pink-700',
          activeText: 'text-pink-800 font-bold',
          shadow: 'shadow-pink-200'
        };
      case 'purple':
        return {
          border: 'border-purple-300',
          highlight: 'bg-purple-100',
          text: 'text-purple-700',
          activeText: 'text-purple-800 font-bold',
          shadow: 'shadow-purple-200'
        };
      case 'blue':
        return {
          border: 'border-blue-300',
          highlight: 'bg-blue-100',
          text: 'text-blue-700',
          activeText: 'text-blue-800 font-bold',
          shadow: 'shadow-blue-200'
        };
      case 'teal':
      default:
        return {
          border: 'border-teal-300',
          highlight: 'bg-teal-100',
          text: 'text-teal-700',
          activeText: 'text-teal-800 font-bold',
          shadow: 'shadow-teal-200'
        };
      case 'orange':
        return {
          border: 'border-orange-300',
          highlight: 'bg-orange-100',
          text: 'text-orange-700',
          activeText: 'text-orange-800 font-bold',
          shadow: 'shadow-orange-200'
        };
   case 'indigo':
        return {
          border: 'border-indigo-300',
          highlight: 'bg-indigo-100',
          text: 'text-indigo-700',
          activeText: 'text-indigo-800 font-bold',
          shadow: 'shadow-indigo-200'
        };
   case 'green':
        return {
          border: 'border-green-300',
          highlight: 'bg-green-100',
          text: 'text-green-700',
          activeText: 'text-green-800 font-bold',
          shadow: 'shadow-green-200'
        };
    }
  };
  
  const colors = getColors();
  
  // If no value is selected or item not found, default to first item if available
  useEffect(() => {
    if ((selectedIndex === -1 || value === undefined) && items.length > 0 && onChange) {
      onChange(items[0]);
    }
  }, [items, value, selectedIndex, onChange]);
  
  // Handle the start of a drag event
  const handleDragStart = (e) => {
    if (e.type === 'touchstart') {
      const clientY = e.touches[0].clientY;
      setStartY(clientY);
      setLastTouchY(clientY);
      setLastTouchTime(Date.now());
      setIsDragging(true);
      setMomentum(0);
      
      // Cancel any ongoing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    } else if (e.buttons === 1) { // Mouse down
      e.preventDefault();
      setIsDragging(true);
      setStartY(e.clientY);
      setLastTouchY(e.clientY);
      setLastTouchTime(Date.now());
      setMomentum(0);
      
      // Cancel any ongoing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }
  };
  
  // Handle drag movement
  const handleDragMove = (e) => {
    if (!isDragging) return;
    
    // Calculate current Y position
    let clientY;
    if (e.type === 'touchmove') {
      clientY = e.touches[0].clientY;
    } else {
      clientY = e.clientY;
    }
    
    const deltaY = clientY - startY;
    
    // Calculate momentum
    const now = Date.now();
    const timeDelta = now - lastTouchTime;
    if (timeDelta > 0) {
      const velocity = (clientY - lastTouchY) / timeDelta;
      setMomentum(velocity * 100); // Scale for better UX
    }
    
    // Update position references
    setLastTouchY(clientY);
    setLastTouchTime(now);
    
    // Update the visual offset
    setCurrentOffset(deltaY);
  };
  
  // Handle end of dragging
  const handleDragEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // Calculate how many items to move
    const offsetInItems = Math.round((currentOffset + momentum) / itemHeight);
    
    // Prevent moving beyond boundaries
    let newIndex = selectedIndex - offsetInItems;
    
    // Ensure new index is within valid range with wrapping
    while (newIndex < 0) newIndex += items.length;
    newIndex = newIndex % items.length;
    
    // Call onChange if item changed
    if (newIndex !== selectedIndex && onChange) {
      onChange(items[newIndex]);
    }
    
    // Reset visual state
    setCurrentOffset(0);
    setMomentum(0);
  };
  
  // Handle wheel events for desktop
  const handleWheel = (e) => {
    e.preventDefault();
    
    // Determine direction
    const direction = e.deltaY > 0 ? 1 : -1;
    
    // Calculate new index
    let newIndex = selectedIndex + direction;
    
    // Ensure new index is within valid range with wrapping
    while (newIndex < 0) newIndex += items.length;
    newIndex = newIndex % items.length;
    
    // Call onChange
    if (onChange) {
      onChange(items[newIndex]);
    }
  };
  
  // Handle click on an item
  const handleItemClick = (index) => {
    if (onChange && index !== selectedIndex) {
      onChange(items[index]);
    }
  };
  
  // Get the items to display (previous, current, next)
  const getDisplayItems = () => {
    if (items.length === 0) return [];
    if (selectedIndex === -1) return [items[0]];
    
    const prevIndex = (selectedIndex - 1 + items.length) % items.length;
    const nextIndex = (selectedIndex + 1) % items.length;
    
    return [
      { value: items[prevIndex], index: prevIndex, position: 'prev' },
      { value: items[selectedIndex], index: selectedIndex, position: 'current' },
      { value: items[nextIndex], index: nextIndex, position: 'next' }
    ];
  };

  // This is the key fix: prevent touchmove events from scrolling the page
  useEffect(() => {
    const wheelContainer = containerRef.current;
    if (!wheelContainer) return;
    
    // Function to prevent default on touch move, but only when inside our component
    const preventScrollOnTouch = (e) => {
      if (isDragging) {
        e.preventDefault();
      }
    };
    
    // Add the event listener with passive: false to allow preventDefault
    wheelContainer.addEventListener('touchmove', preventScrollOnTouch, { passive: false });
    
    return () => {
      wheelContainer.removeEventListener('touchmove', preventScrollOnTouch);
    };
  }, [isDragging]);
  
  return (
    <div className="flex flex-col items-center">
      {label && <div className={`text-xs mb-1 ${colors.text}`}>{label}</div>}
      
      <div 
        ref={containerRef}
        className={`relative w-24 overflow-hidden rounded-lg ${colors.border} border ${colors.shadow} shadow select-none`}
        style={{ height: `${totalHeight}px` }}
        onWheel={handleWheel}
      >
        {/* Selection box with lower z-index to stay behind text */}
        <div 
          className={`absolute left-1 right-1 top-1/2 -translate-y-1/2 h-${itemHeight}px ${colors.highlight} border-2 ${colors.border} rounded-md pointer-events-none`}
          style={{ 
            height: `${itemHeight}px`,
            boxShadow: `0 0 2px rgba(0,0,0,0.1) inset`,
            zIndex: 5 
          }}
        ></div>
        
        <div 
          className="absolute inset-0"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          onMouseMove={handleDragMove}
          onTouchMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchEnd={handleDragEnd}
          onTouchCancel={handleDragEnd}
        >
          {getDisplayItems().map((item) => (
            <div
              key={`item-${item.index}`}
              className={`absolute left-0 right-0 flex items-center justify-center cursor-pointer transition-transform ${
                item.position === 'current' ? colors.activeText : colors.text
              } ${
                item.position === 'current' ? 'text-sm font-bold z-10' : 'text-xs opacity-70'
              }`}
              style={{
                height: `${itemHeight}px`,
                top: item.position === 'prev' ? 0 : 
                     item.position === 'current' ? `${itemHeight}px` : 
                     `${itemHeight * 2}px`,
                transform: isDragging ? `translateY(${
                  item.position === 'prev' ? currentOffset : 
                  item.position === 'current' ? currentOffset : 
                  currentOffset}px)` : 'none',
                transition: isDragging ? 'none' : 'transform 0.2s ease-out'
              }}
              onClick={() => handleItemClick(item.index)}
            >
              {displayFormat(item.value)}
            </div>
          ))}
        </div>
        
        {/* Gradient fades for visual polish - dark mode aware */}
        <div className={`absolute top-0 left-0 right-0 h-1/3 pointer-events-none ${
          isDarkMode 
            ? 'bg-gradient-to-b from-gray-800 to-transparent'
            : 'bg-gradient-to-b from-white to-transparent'
        }`}></div>
        <div className={`absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none ${
          isDarkMode 
            ? 'bg-gradient-to-t from-gray-800 to-transparent'
            : 'bg-gradient-to-t from-white to-transparent'
        }`}></div>
        
        {/* Arrows */}
        <div className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none">
          <svg className={`w-3 h-3 ${colors.text}`} viewBox="0 0 24 24">
            <path fill="currentColor" d="M7 14l5-5 5 5H7z"/>
          </svg>
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex justify-center pointer-events-none">
          <svg className={`w-3 h-3 ${colors.text}`} viewBox="0 0 24 24">
            <path fill="currentColor" d="M7 10l5 5 5-5H7z"/>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default WheelSelector;