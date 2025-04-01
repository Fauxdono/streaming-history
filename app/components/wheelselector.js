import React, { useState, useRef, useEffect } from 'react';

const WheelSelector = ({
  items = [],
  value,
  onChange,
  label,
  colorTheme = 'teal',
  displayFormat = (val) => val
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [momentum, setMomentum] = useState(0);
  const [lastTouchTime, setLastTouchTime] = useState(0);
  const [lastTouchY, setLastTouchY] = useState(0);
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  
  // Number of visible items above/below the selected item
  const visibleItems = 3;
  const itemHeight = 40; // Height in pixels
  
  // Calculate total height of the selector based on visible items
  const totalHeight = itemHeight * (visibleItems * 2 + 1);
  
  // Find the index of the currently selected value
  const selectedIndex = items.findIndex(item => item.toString() === value?.toString());
  
  // If no value is selected or item not found, default to first item if available
  useEffect(() => {
    if ((selectedIndex === -1 || value === undefined) && items.length > 0 && onChange) {
      onChange(items[0]);
    }
  }, [items, value, selectedIndex, onChange]);
  
  // Get color classes based on theme
  const getColors = () => {
    switch (colorTheme) {
      case 'pink':
        return {
          border: 'border-pink-300',
          highlight: 'bg-pink-100',
          text: 'text-pink-700',
          activeText: 'text-pink-800 font-bold',
          shadow: 'shadow-pink-200',
          indicator: 'bg-pink-200'
        };
      case 'purple':
        return {
          border: 'border-purple-300',
          highlight: 'bg-purple-100',
          text: 'text-purple-700',
          activeText: 'text-purple-800 font-bold',
          shadow: 'shadow-purple-200',
          indicator: 'bg-purple-200'
        };
      case 'blue':
        return {
          border: 'border-blue-300',
          highlight: 'bg-blue-100',
          text: 'text-blue-700',
          activeText: 'text-blue-800 font-bold',
          shadow: 'shadow-blue-200',
          indicator: 'bg-blue-200'
        };
      case 'teal':
      default:
        return {
          border: 'border-teal-300',
          highlight: 'bg-teal-100',
          text: 'text-teal-700',
          activeText: 'text-teal-800 font-bold',
          shadow: 'shadow-teal-200',
          indicator: 'bg-teal-200'
        };
    }
  };
  
  const colors = getColors();
  
  // Update the display items when selection changes
  const displayItems = () => {
    if (items.length === 0) return [];
    
    // If no valid selection, default to first item
    const effectiveIndex = selectedIndex !== -1 ? selectedIndex : 0;
    
    const result = [];
    
    // Add items before the selected one
    for (let i = effectiveIndex - visibleItems; i < effectiveIndex; i++) {
      const itemIndex = i < 0 ? items.length + i : i; // Handle wrapping
      result.push({
        value: items[itemIndex],
        displayValue: displayFormat(items[itemIndex]),
        index: itemIndex,
        offset: i - effectiveIndex
      });
    }
    
    // Add the selected item
    result.push({
      value: items[effectiveIndex],
      displayValue: displayFormat(items[effectiveIndex]),
      index: effectiveIndex,
      offset: 0,
      selected: true
    });
    
    // Add items after the selected one
    for (let i = effectiveIndex + 1; i <= effectiveIndex + visibleItems; i++) {
      const itemIndex = i >= items.length ? i - items.length : i; // Handle wrapping
      result.push({
        value: items[itemIndex],
        displayValue: displayFormat(items[itemIndex]),
        index: itemIndex,
        offset: i - effectiveIndex
      });
    }
    
    return result;
  };
  
  // Handle the start of a drag event
  const handleDragStart = (e) => {
    // Prevent default behavior to avoid page scrolling
    e.preventDefault();
    
    // Only start dragging on left mouse button or touch
    if (e.buttons === 1 || e.type === 'touchstart') {
      setIsDragging(true);
      const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
      setStartY(clientY);
      setLastTouchY(clientY);
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
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
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
    
    // Prevent default to stop page scrolling on touch
    e.preventDefault();
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
    if (newIndex < 0) newIndex = items.length - (Math.abs(newIndex) % items.length);
    if (newIndex >= items.length) newIndex = newIndex % items.length;
    
    // Call onChange if item changed
    if (newIndex !== selectedIndex && onChange) {
      onChange(items[newIndex]);
    }
    
    // Reset visual state
    setCurrentOffset(0);
    setMomentum(0);
    
    // Apply inertia animation if there's significant momentum
    if (Math.abs(momentum) > 5) {
      applyInertia();
    }
  };
  
  // Apply inertia animation
  const applyInertia = () => {
    let currentMomentum = momentum;
    let lastTimestamp = null;
    
    const animateInertia = (timestamp) => {
      if (!lastTimestamp) {
        lastTimestamp = timestamp;
        animationRef.current = requestAnimationFrame(animateInertia);
        return;
      }
      
      const delta = timestamp - lastTimestamp;
      lastTimestamp = timestamp;
      
      // Apply friction to slow down the momentum
      currentMomentum *= 0.95;
      
      // Stop the animation when momentum is very small
      if (Math.abs(currentMomentum) < 0.5) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
        return;
      }
      
      // Calculate how much to move
      const move = (currentMomentum * delta) / 100;
      
      // Determine if movement requires changing the selected item
      const totalMove = move / itemHeight;
      if (Math.abs(totalMove) > 0.5) {
        // Calculate new index based on direction
        const direction = currentMomentum > 0 ? -1 : 1;
        const newIndex = (selectedIndex + direction + items.length) % items.length;
        
        // Update selection and reset momentum for smoother transition
        if (onChange) {
          onChange(items[newIndex]);
        }
        currentMomentum *= 0.5; // Reduce momentum after each item change
      }
      
      // Continue animation
      animationRef.current = requestAnimationFrame(animateInertia);
    };
    
    // Start the animation
    animationRef.current = requestAnimationFrame(animateInertia);
  };
  
  // Clean up animations on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  // Handle wheel events for desktop
  const handleWheel = (e) => {
    e.preventDefault();
    
    // Determine direction
    const direction = e.deltaY > 0 ? 1 : -1;
    
    // Calculate new index
    let newIndex = selectedIndex + direction;
    
    // Ensure new index is within valid range with wrapping
    if (newIndex < 0) newIndex = items.length - 1;
    if (newIndex >= items.length) newIndex = 0;
    
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
  
  return (
    <div className="flex flex-col items-center">
      {label && <div className={`text-xs mb-1 ${colors.text}`}>{label}</div>}
      
      <div 
        ref={containerRef}
        className={`relative w-16 overflow-hidden rounded-lg ${colors.border} border ${colors.shadow} shadow select-none touch-manipulation`}
        style={{ height: `${totalHeight}px` }}
        onWheel={handleWheel}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        onMouseMove={handleDragMove}
        onTouchMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchEnd={handleDragEnd}
        onTouchCancel={handleDragEnd}
      >
        {/* Center selection indicator */}
        <div className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 h-${itemHeight}px pointer-events-none ${colors.highlight} border-y ${colors.border}`}></div>
        
        {/* Rendered items */}
        <div
          className="absolute left-0 right-0 top-0 bottom-0 flex flex-col items-center transition-transform"
          style={{
            transform: `translateY(${Math.floor(totalHeight / 2) + currentOffset}px)`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out'
          }}
        >
          {displayItems().map((item, idx) => (
            <div
              key={`wheel-item-${idx}`}
              className={`w-full flex items-center justify-center cursor-pointer transition-all duration-100
                ${item.selected ? colors.activeText : colors.text}
                ${item.selected ? 'text-base' : Math.abs(item.offset) === 1 ? 'text-sm opacity-70' : 'text-xs opacity-50'}`}
              style={{ 
                height: `${itemHeight}px`,
                transform: `translateY(${-item.offset * itemHeight}px)`,
              }}
              onClick={() => handleItemClick(item.index)}
            >
              {item.displayValue}
            </div>
          ))}
        </div>
        
        {/* Gradient fades for visual polish */}
        <div className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-white to-transparent pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
        
        {/* Simple arrow indicators */}
        <div className="absolute top-2 left-0 right-0 flex justify-center pointer-events-none">
          <svg className={`w-4 h-4 ${colors.text}`} viewBox="0 0 24 24">
            <path fill="currentColor" d="M7 14l5-5 5 5H7z"/>
          </svg>
        </div>
        <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
          <svg className={`w-4 h-4 ${colors.text}`} viewBox="0 0 24 24">
            <path fill="currentColor" d="M7 10l5 5 5-5H7z"/>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default WheelSelector;