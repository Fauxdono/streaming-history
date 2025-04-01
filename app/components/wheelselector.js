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
  const [scrollOffset, setScrollOffset] = useState(0);
  const containerRef = useRef(null);
  const itemHeight = 36; // Height of each item in pixels
  
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
          shadow: 'shadow-pink-200',
          slider: 'bg-pink-200/50'
        };
      case 'purple':
        return {
          border: 'border-purple-300',
          highlight: 'bg-purple-100',
          text: 'text-purple-700',
          activeText: 'text-purple-800 font-bold',
          shadow: 'shadow-purple-200',
          slider: 'bg-purple-200/50'
        };
      case 'blue':
        return {
          border: 'border-blue-300',
          highlight: 'bg-blue-100',
          text: 'text-blue-700',
          activeText: 'text-blue-800 font-bold',
          shadow: 'shadow-blue-200',
          slider: 'bg-blue-200/50'
        };
      case 'teal':
      default:
        return {
          border: 'border-teal-300',
          highlight: 'bg-teal-100',
          text: 'text-teal-700',
          activeText: 'text-teal-800 font-bold',
          shadow: 'shadow-teal-200',
          slider: 'bg-teal-200/50'
        };
    }
  };
  
  const colors = getColors();
  
  // Calculate the display items (visible in wheel)
  const displayItems = () => {
    if (selectedIndex === -1 || items.length === 0) {
      return [{value: 'Select', index: -1}, {value: 'Option', index: -1}, {value: 'Value', index: -1}];
    }
    
    const visibleItems = [];
    
    // Item above the selected one
    const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1;
    visibleItems.push({
      value: displayFormat(items[prevIndex]),
      index: prevIndex
    });
    
    // Selected item
    visibleItems.push({
      value: displayFormat(items[selectedIndex]),
      index: selectedIndex,
      selected: true
    });
    
    // Item below the selected one
    const nextIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0;
    visibleItems.push({
      value: displayFormat(items[nextIndex]),
      index: nextIndex
    });
    
    return visibleItems;
  };
  
  // Handle start of drag/scroll
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartY(e.clientY || (e.touches && e.touches[0].clientY) || 0);
    e.preventDefault();
  };
  
  // Handle drag motion
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    const deltaY = clientY - startY;
    
    setScrollOffset(deltaY);
    e.preventDefault();
  };
  
  // Handle end of drag/scroll
  const handleMouseUp = (e) => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // Determine direction and snap to next item
    if (Math.abs(scrollOffset) > 10) { // threshold for registering a change
      const direction = scrollOffset > 0 ? -1 : 1; // positive offset = scroll down
      
      let newIndex = selectedIndex + direction;
      
      // Handle wrap-around
      if (newIndex < 0) newIndex = items.length - 1;
      if (newIndex >= items.length) newIndex = 0;
      
      // Call the onChange handler with the new value
      if (onChange && items[newIndex] !== undefined) {
        onChange(items[newIndex]);
      }
    }
    
    // Reset scroll offset
    setScrollOffset(0);
    e.preventDefault();
  };
  
  // Add and remove event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, startY, scrollOffset]);
  
  // Handle scroll wheel events
  const handleWheel = (e) => {
    e.preventDefault();
    
    const direction = e.deltaY > 0 ? 1 : -1; // positive deltaY = scroll down
    
    let newIndex = selectedIndex + direction;
    
    // Handle wrap-around
    if (newIndex < 0) newIndex = items.length - 1;
    if (newIndex >= items.length) newIndex = 0;
    
    // Call the onChange handler with the new value
    if (onChange && items[newIndex] !== undefined) {
      onChange(items[newIndex]);
    }
  };
  
  // Click handler for items
  const handleItemClick = (index) => {
    if (onChange && items[index] !== undefined) {
      onChange(items[index]);
    }
  };
  
  const visibleItems = displayItems();
  
  return (
    <div className="flex flex-col items-center">
      {label && <div className={`text-xs mb-1 ${colors.text}`}>{label}</div>}
      
      <div 
        ref={containerRef}
        className={`relative h-28 w-16 overflow-hidden rounded ${colors.border} border ${colors.shadow} shadow`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        style={{ touchAction: 'none' }}
      >
        {/* Highlight for the selected item */}
        <div 
          className={`absolute left-0 right-0 h-12 top-1/2 -translate-y-1/2 ${colors.highlight} pointer-events-none`}
        ></div>
        
        {/* Items container */}
        <div 
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-transform"
          style={{
            transform: `translateY(${scrollOffset}px)`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out'
          }}
        >
          {visibleItems.map((item, idx) => (
            <div
              key={`wheel-item-${idx}`}
              className={`h-12 w-full flex items-center justify-center cursor-pointer 
                ${item.selected ? colors.activeText : colors.text} 
                ${item.selected ? 'text-base' : 'text-sm opacity-70'}`}
              onClick={() => handleItemClick(item.index)}
            >
              {item.value}
            </div>
          ))}
        </div>
        
        {/* Top and bottom gradients for scroll effect */}
        <div className={`absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white to-transparent pointer-events-none`}></div>
        <div className={`absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none`}></div>
        
        {/* Arrows for visual affordance */}
        <div className="absolute top-1 left-0 right-0 flex justify-center pointer-events-none">
          <svg className={`w-4 h-4 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </div>
        <div className="absolute bottom-1 left-0 right-0 flex justify-center pointer-events-none">
          <svg className={`w-4 h-4 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default WheelSelector;