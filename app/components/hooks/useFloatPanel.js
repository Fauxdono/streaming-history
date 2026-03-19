import { useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// useFloatPanel
//
// Manages all panel positioning state: floating vs pinned, drag-to-move,
// drag-to-resize (scale), orientation, expand/collapse, and screen detection.
//
// Returns everything the panel shell needs to render itself. The parent layout
// should use a ResizeObserver on the panel ref rather than consuming the old
// onWidthChange / onHeightChange callbacks — that approach is gone.
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  floating:    'yearSelectorFloating',
  position:    'yearSelectorFloatPos',
  orientation: 'yearSelectorFloatOrientation',
  scale:       'yearSelectorFloatScale',
};

const SCALE_MIN = 0.5;
const SCALE_MAX = 2.5;

function readStorage(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return JSON.parse(v);
  } catch { return fallback; }
}

function writeStorage(key, value) {
  if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(value));
}

function clampPos(pos) {
  if (typeof window === 'undefined') return pos;
  return {
    x: Math.max(0, Math.min(pos.x, window.innerWidth  - 120)),
    y: Math.max(0, Math.min(pos.y, window.innerHeight - 60)),
  };
}

function defaultFloatPos() {
  if (typeof window === 'undefined') return { x: 800, y: 100 };
  return { x: Math.max(0, window.innerWidth - 200), y: 100 };
}

// ---------------------------------------------------------------------------
export function useFloatPanel({
  initialPosition = 'right',
  startMinimized  = false,
} = {}) {

  // ---- Screen ---------------------------------------------------------------
  const [screen, setScreen] = useState({ isMobile: false, isLandscape: false });

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isTouch      = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isLandscape  = w > h;
      const isMobile     = w < 640 || (isTouch && h < 500);
      setScreen({ isMobile, isLandscape });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  const { isMobile, isLandscape } = screen;

  // ---- Floating panel state (persisted) -------------------------------------
  const [isFloating, _setIsFloating] = useState(() =>
    isMobile ? false : readStorage(STORAGE_KEYS.floating, true)
  );

  const [floatPos, _setFloatPos] = useState(() =>
    readStorage(STORAGE_KEYS.position, null) ?? defaultFloatPos()
  );

  const [floatOrientation, _setFloatOrientation] = useState(() =>
    readStorage(STORAGE_KEYS.orientation, 'vertical')
  );

  const [floatScale, _setFloatScale] = useState(() =>
    readStorage(STORAGE_KEYS.scale, 1)
  );

  // Wrap setters to keep localStorage in sync
  const setIsFloating = useCallback((v) => {
    const next = typeof v === 'function' ? v(isFloating) : v;
    _setIsFloating(next);
    writeStorage(STORAGE_KEYS.floating, next);
  }, [isFloating]);

  const setFloatPos = useCallback((v) => {
    _setFloatPos(prev => {
      const next = typeof v === 'function' ? v(prev) : v;
      writeStorage(STORAGE_KEYS.position, next);
      return next;
    });
  }, []);

  const setFloatOrientation = useCallback((v) => {
    _setFloatOrientation(v);
    writeStorage(STORAGE_KEYS.orientation, v);
  }, []);

  const setFloatScale = useCallback((v) => {
    _setFloatScale(prev => {
      const next = typeof v === 'function' ? v(prev) : v;
      writeStorage(STORAGE_KEYS.scale, next);
      return next;
    });
  }, []);

  // ---- Pinned position & expand ---------------------------------------------
  const [currentPosition, setCurrentPosition] = useState(initialPosition);
  const [expanded, setExpanded] = useState(!startMinimized);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Force expanded when floating
  useEffect(() => { if (isFloating) setExpanded(true); }, [isFloating]);

  // Mobile: force un-float
  useEffect(() => { if (isMobile) _setIsFloating(false); }, [isMobile]);

  // Mobile landscape: move to bottom, restore on portrait
  const portraitPositionRef = useRef(null);
  useEffect(() => {
    if (!isMobile) return;
    if (isLandscape) {
      portraitPositionRef.current = currentPosition;
      setCurrentPosition('bottom');
    } else {
      setCurrentPosition(portraitPositionRef.current ?? 'right');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLandscape, isMobile]);

  // Clamp float position when it might be off-screen
  useEffect(() => {
    if (!isMobile && isFloating) setFloatPos(prev => clampPos(prev));
  }, [isMobile, isFloating, setFloatPos]);

  useEffect(() => {
    if (isMobile || !isFloating) return;
    const onResize = () => setFloatPos(prev => clampPos(prev));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isMobile, isFloating, setFloatPos]);

  // ---- Derived --------------------------------------------------------------
  const desktopFloating = !isMobile && isFloating;

  const isHorizontal = desktopFloating
    ? floatOrientation === 'horizontal'
    : currentPosition === 'top' || currentPosition === 'bottom';

  // Force expanded when horizontal on desktop (can't collapse a top/bottom bar)
  useEffect(() => { if (isHorizontal && !isMobile) setExpanded(true); }, [isHorizontal, isMobile]);

  // ---- Actions --------------------------------------------------------------
  const toggleExpanded = useCallback(() => {
    if (isFloating) return;
    if (isHorizontal && !isMobile) return; // horizontal desktop is always open
    setExpanded(prev => !prev);
  }, [isFloating, isHorizontal, isMobile]);

  // Cycle: right → bottom → left → top → right
  const CYCLE = { right: 'bottom', bottom: 'left', left: 'top', top: 'right' };

  const togglePosition = useCallback(() => {
    const next = CYCLE[currentPosition] ?? 'right';
    setCurrentPosition(next);

    if (isMobile) {
      setIsTransitioning(false);
    } else {
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [currentPosition, isMobile]);

  // Remember last pinned position per axis so we can restore on un-float
  const lastHorizontalPos = useRef('top');
  const lastVerticalPos   = useRef('right');

  const toggleFloating = useCallback(() => {
    if (isFloating) {
      // Float → pinned: restore axis-appropriate position
      const restoreTo = floatOrientation === 'horizontal'
        ? lastHorizontalPos.current
        : lastVerticalPos.current;
      setCurrentPosition(restoreTo);
    } else {
      // Pinned → float: remember current position by axis
      if (currentPosition === 'top' || currentPosition === 'bottom') {
        lastHorizontalPos.current = currentPosition;
      } else {
        lastVerticalPos.current = currentPosition;
      }
      setFloatOrientation(isHorizontal ? 'horizontal' : 'vertical');
    }
    setIsFloating(prev => !prev);
  }, [isFloating, currentPosition, floatOrientation, isHorizontal, setIsFloating, setFloatOrientation]);

  const toggleOrientation = useCallback(() => {
    const next = floatOrientation === 'vertical' ? 'horizontal' : 'vertical';
    setFloatOrientation(next);
  }, [floatOrientation, setFloatOrientation]);

  // ---- Drag to move ---------------------------------------------------------
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const handleDragStart = useCallback((e) => {
    if (!desktopFloating) return;
    e.preventDefault();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    isDraggingRef.current = true;
    dragOffsetRef.current = { x: cx - floatPos.x, y: cy - floatPos.y };

    const onMove = (me) => {
      if (!isDraggingRef.current) return;
      const mx = me.touches ? me.touches[0].clientX : me.clientX;
      const my = me.touches ? me.touches[0].clientY : me.clientY;
      setFloatPos(clampPos({ x: mx - dragOffsetRef.current.x, y: my - dragOffsetRef.current.y }));
    };
    const onEnd = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }, [desktopFloating, floatPos, setFloatPos]);

  // ---- Drag to resize (scale) -----------------------------------------------
  const isResizingRef  = useRef(false);
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, scale: 1 });

  const handleResizeStart = useCallback((e) => {
    if (!desktopFloating) return;
    e.preventDefault();
    e.stopPropagation();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    isResizingRef.current = true;
    resizeStartRef.current = { mouseX: cx, mouseY: cy, scale: floatScale };

    const onMove = (me) => {
      if (!isResizingRef.current) return;
      const mx = me.touches ? me.touches[0].clientX : me.clientX;
      const my = me.touches ? me.touches[0].clientY : me.clientY;
      const dx    = mx - resizeStartRef.current.mouseX;
      const dy    = my - resizeStartRef.current.mouseY;
      const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      const next  = Math.min(SCALE_MAX, Math.max(SCALE_MIN, resizeStartRef.current.scale + delta / 200));
      setFloatScale(next);
    };
    const onEnd = () => {
      isResizingRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }, [desktopFloating, floatScale, setFloatScale]);

  // ---- Public API -----------------------------------------------------------
  return {
    // state
    isMobile,
    isLandscape,
    isFloating,
    desktopFloating,
    floatPos,
    floatOrientation,
    floatScale,
    currentPosition,
    expanded,
    isTransitioning,
    isHorizontal,

    // actions
    toggleExpanded,
    togglePosition,
    toggleFloating,
    toggleOrientation,
    setCurrentPosition,

    // drag / resize handlers (attach to DOM elements)
    handleDragStart,
    handleResizeStart,
  };
}
