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
  
  // Smaller control with fewer visible items
  const itemHeight = 21; // Height in pixels (10% bigger: 19 * 1.1 ≈ 21)
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
          shadow: 'shadow-pink-200',
          background: 'bg-white',
          gradientLight: 'bg-gradient-to-b from-pink-50 to-transparent dark:from-transparent',
          gradientDark: 'bg-gradient-to-b from-pink-900 to-transparent',
          gradientLightBottom: 'bg-gradient-to-t from-pink-50 to-transparent dark:from-transparent',
          gradientDarkBottom: 'bg-gradient-to-t from-pink-900 to-transparent'
        };
      case 'purple':
        return {
          border: 'border-purple-300',
          highlight: 'bg-purple-100',
          text: 'text-purple-700',
          activeText: 'text-purple-800 font-bold',
          shadow: 'shadow-purple-200',
          background: 'bg-white',
          gradientLight: 'bg-gradient-to-b from-purple-50 to-transparent dark:from-transparent',
          gradientDark: 'bg-gradient-to-b from-purple-900 to-transparent',
          gradientLightBottom: 'bg-gradient-to-t from-purple-50 to-transparent dark:from-transparent',
          gradientDarkBottom: 'bg-gradient-to-t from-purple-900 to-transparent'
        };
      case 'blue':
        return {
          border: 'border-blue-300 dark:border-blue-700',
          highlight: 'bg-blue-100 dark:bg-blue-900',
          text: 'text-blue-700 dark:text-blue-300',
          activeText: 'text-blue-800 font-bold dark:text-blue-200',
          shadow: 'shadow-blue-200 dark:shadow-blue-900',
          background: 'bg-white dark:bg-black',
          gradientLight: 'bg-gradient-to-b from-blue-50 to-transparent dark:from-transparent',
          gradientDark: 'bg-gradient-to-b from-blue-900 to-transparent',
          gradientLightBottom: 'bg-gradient-to-t from-blue-50 to-transparent dark:from-transparent',
          gradientDarkBottom: 'bg-gradient-to-t from-blue-900 to-transparent'
        };
      case 'teal':
      default:
        return {
          border: 'border-teal-300',
          highlight: 'bg-teal-100',
          text: 'text-teal-700',
          activeText: 'text-teal-800 font-bold',
          shadow: 'shadow-teal-200',
          background: 'bg-white',
          gradientLight: 'bg-gradient-to-b from-teal-50 to-transparent dark:from-transparent',
          gradientDark: 'bg-gradient-to-b from-teal-900 to-transparent',
          gradientLightBottom: 'bg-gradient-to-t from-teal-50 to-transparent dark:from-transparent',
          gradientDarkBottom: 'bg-gradient-to-t from-teal-900 to-transparent'
        };
      case 'orange':
        return {
          border: 'border-orange-300',
          highlight: 'bg-orange-100',
          text: 'text-orange-700',
          activeText: 'text-orange-800 font-bold',
          shadow: 'shadow-orange-200',
          background: 'bg-white',
          gradientLight: 'bg-gradient-to-b from-orange-50 to-transparent dark:from-transparent',
          gradientDark: 'bg-gradient-to-b from-orange-900 to-transparent',
          gradientLightBottom: 'bg-gradient-to-t from-orange-50 to-transparent dark:from-transparent',
          gradientDarkBottom: 'bg-gradient-to-t from-orange-900 to-transparent'
        };
   case 'indigo':
        return {
          border: 'border-indigo-300',
          highlight: 'bg-indigo-100',
          text: 'text-indigo-700',
          activeText: 'text-indigo-800 font-bold',
          shadow: 'shadow-indigo-200',
          background: 'bg-white',
          gradientLight: 'bg-gradient-to-b from-indigo-50 to-transparent dark:from-transparent',
          gradientDark: 'bg-gradient-to-b from-indigo-900 to-transparent',
          gradientLightBottom: 'bg-gradient-to-t from-indigo-50 to-transparent dark:from-transparent',
          gradientDarkBottom: 'bg-gradient-to-t from-indigo-900 to-transparent'
        };
   case 'green':
        return {
          border: 'border-green-300 dark:border-green-700',
          highlight: 'bg-green-100 dark:bg-green-900',
          text: 'text-green-700 dark:text-green-300',
          activeText: 'text-green-800 font-bold dark:text-green-200',
          shadow: 'shadow-green-200 dark:shadow-green-900',
          background: 'bg-white dark:bg-black',
          gradientLight: 'bg-gradient-to-b from-green-50 to-transparent dark:from-transparent',
          gradientDark: 'bg-gradient-to-b from-green-900 to-transparent',
          gradientLightBottom: 'bg-gradient-to-t from-green-50 to-transparent dark:from-transparent',
          gradientDarkBottom: 'bg-gradient-to-t from-green-900 to-transparent'
        };
      case 'red':
        return {
          border: 'border-red-300',
          highlight: 'bg-red-100',
          text: 'text-red-700',
          activeText: 'text-red-800 font-bold',
          shadow: 'shadow-red-200',
          background: 'bg-white',
          gradientLight: 'bg-gradient-to-b from-red-50 to-transparent dark:from-transparent',
          gradientDark: 'bg-gradient-to-b from-red-900 to-transparent',
          gradientLightBottom: 'bg-gradient-to-t from-red-50 to-transparent dark:from-transparent',
          gradientDarkBottom: 'bg-gradient-to-t from-red-900 to-transparent'
        };
      case 'yellow':
        return {
          border: 'border-yellow-300',
          highlight: 'bg-yellow-100',
          text: 'text-yellow-700',
          activeText: 'text-yellow-800 font-bold',
          shadow: 'shadow-yellow-200',
          background: 'bg-white',
          gradientLight: 'bg-gradient-to-b from-yellow-50 to-transparent dark:from-transparent',
          gradientDark: 'bg-gradient-to-b from-yellow-900 to-transparent',
          gradientLightBottom: 'bg-gradient-to-t from-yellow-50 to-transparent dark:from-transparent',
          gradientDarkBottom: 'bg-gradient-to-t from-yellow-900 to-transparent'
        };
      case 'amber':
        return {
          border: 'border-amber-300 dark:border-amber-700',
          highlight: 'bg-amber-100 dark:bg-amber-900',
          text: 'text-amber-700 dark:text-amber-300',
          activeText: 'text-amber-800 font-bold dark:text-amber-200',
          shadow: 'shadow-amber-200 dark:shadow-amber-900',
          background: 'bg-white dark:bg-black',
          gradientLight: 'bg-gradient-to-b from-amber-50 to-transparent dark:from-transparent',
          gradientDark: 'bg-gradient-to-b from-amber-900 to-transparent',
          gradientLightBottom: 'bg-gradient-to-t from-amber-50 to-transparent dark:from-transparent',
          gradientDarkBottom: 'bg-gradient-to-t from-amber-900 to-transparent'
        };
      case 'cyan':
        return {
          border: 'border-cyan-300',
          highlight: 'bg-cyan-100',
          text: 'text-cyan-700',
          activeText: 'text-cyan-800 font-bold',
          shadow: 'shadow-cyan-200',
          background: 'bg-white',
          gradientLight: 'bg-gradient-to-b from-cyan-50 to-transparent dark:from-transparent',
          gradientDark: 'bg-gradient-to-b from-cyan-900 to-transparent',
          gradientLightBottom: 'bg-gradient-to-t from-cyan-50 to-transparent dark:from-transparent',
          gradientDarkBottom: 'bg-gradient-to-t from-cyan-900 to-transparent'
        };
      case 'emerald':
        return {
          border: 'border-emerald-300',
          highlight: 'bg-emerald-100',
          text: 'text-emerald-700',
          activeText: 'text-emerald-800 font-bold',
          shadow: 'shadow-emerald-200',
          background: 'bg-white',
          gradientLight: 'bg-gradient-to-b from-emerald-50 to-transparent dark:from-transparent',
          gradientDark: 'bg-gradient-to-b from-emerald-900 to-transparent',
          gradientLightBottom: 'bg-gradient-to-t from-emerald-50 to-transparent dark:from-transparent',
          gradientDarkBottom: 'bg-gradient-to-t from-emerald-900 to-transparent'
        };
      case 'fuchsia':
        return {
          border: 'border-fuchsia-300',
          highlight: 'bg-fuchsia-100',
          text: 'text-fuchsia-700',
          activeText: 'text-fuchsia-800 font-bold',
          shadow: 'shadow-fuchsia-200',
          background: 'bg-white',
          gradientLight: 'bg-gradient-to-b from-fuchsia-50 to-transparent dark:from-transparent',
          gradientDark: 'bg-gradient-to-b from-fuchsia-900 to-transparent',
          gradientLightBottom: 'bg-gradient-to-t from-fuchsia-50 to-transparent dark:from-transparent',
          gradientDarkBottom: 'bg-gradient-to-t from-fuchsia-900 to-transparent'
        };
      case 'violet':
        return {
          border: 'border-violet-300',
          highlight: 'bg-violet-100',
          text: 'text-violet-700',
          activeText: 'text-violet-800 font-bold',
          shadow: 'shadow-violet-200',
          background: 'bg-white',
          gradientLight: 'bg-gradient-to-b from-violet-50 to-transparent dark:from-transparent',
          gradientDark: 'bg-gradient-to-b from-violet-900 to-transparent',
          gradientLightBottom: 'bg-gradient-to-t from-violet-50 to-transparent dark:from-transparent',
          gradientDarkBottom: 'bg-gradient-to-t from-violet-900 to-transparent'
        };
      case 'rose':
        return {
          border: 'border-rose-300',
          highlight: 'bg-rose-100',
          text: 'text-rose-700',
          activeText: 'text-rose-800 font-bold',
          shadow: 'shadow-rose-200',
          background: 'bg-white',
          gradientLight: 'bg-gradient-to-b from-rose-50 to-transparent dark:from-transparent',
          gradientDark: 'bg-gradient-to-b from-rose-900 to-transparent',
          gradientLightBottom: 'bg-gradient-to-t from-rose-50 to-transparent dark:from-transparent',
          gradientDarkBottom: 'bg-gradient-to-t from-rose-900 to-transparent'
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
        className={`relative w-20 overflow-hidden rounded-lg ${colors.border} border ${colors.shadow} shadow select-none`}
        style={{ height: `${totalHeight}px` }}
        onWheel={handleWheel}
      >
        {/* Selection box with lower z-index to stay behind text */}
        <div 
          className={`absolute left-1 right-1 top-1/2 -translate-y-1/2 ${colors.highlight} border-2 ${colors.border} rounded-md pointer-events-none`}
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
        
        {/* Gradient fades for visual polish - using theme colors */}
        <div className={`absolute top-0 left-0 right-0 h-1/3 pointer-events-none ${colors.gradientLight}`}></div>
        <div className={`absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none ${colors.gradientLightBottom}`}></div>
        
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