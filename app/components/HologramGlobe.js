'use client';
import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { geoOrthographic, geoPath, geoGraticule } from 'd3-geo';
import geoData from 'react-svg-worldmap/dist/countries.geo.js';

// Convert react-svg-worldmap geo data to standard GeoJSON (runs once)
const worldGeoJSON = {
  type: "FeatureCollection",
  features: (geoData.default || geoData).features.map(f => ({
    type: "Feature",
    properties: { name: f.N, iso: f.I },
    geometry: { type: "MultiPolygon", coordinates: f.C }
  }))
};

const HologramGlobe = ({ locationData = [], onCountryClick, isDarkMode, isColorful, colors }) => {
  const svgRef = useRef(null);
  const [rotation, setRotation] = useState([-20, -20, 0]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [rotationStart, setRotationStart] = useState(null);
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const idleTimer = useRef(null);
  const animFrame = useRef(null);
  const isIdle = useRef(true);

  const size = 500;
  const center = size / 2;
  const globeRadius = size * 0.45;

  // Build lookup for play counts
  const playCountMap = useMemo(() => {
    const map = {};
    let max = 0;
    locationData.forEach(d => {
      map[d.code?.toLowerCase()] = d.value;
      if (d.value > max) max = d.value;
    });
    return { map, max };
  }, [locationData]);

  // Color scheme based on theme
  const theme = useMemo(() => {
    if (isColorful && isDarkMode) return {
      glow: '#fde047', glowRgb: '253,224,71', grid: '#a16207', gridOpacity: 0.3,
      border: '#fde047', countryBase: '#854d0e', countryFill: '#fde047',
      ocean: '#1a0f00', outline: '#fde047', scanline: '#fde047', bg: 'transparent',
      hoverGlow: '#facc15', tooltipBg: '#1F2937', tooltipText: '#ffffff'
    };
    if (isColorful && !isDarkMode) return {
      glow: '#854d0e', glowRgb: '133,77,14', grid: '#92400e', gridOpacity: 0.35,
      border: '#854d0e', countryBase: '#fef3c7', countryFill: '#78350f',
      ocean: '#fef9c3', outline: '#854d0e', scanline: '#854d0e', bg: 'transparent',
      hoverGlow: '#92400e', tooltipBg: '#ffffff', tooltipText: '#000000'
    };
    if (!isColorful && isDarkMode) return {
      glow: '#00ffcc', glowRgb: '0,255,204', grid: '#00ffcc', gridOpacity: 0.2,
      border: '#00ffcc', countryBase: '#0a1a15', countryFill: '#00ffcc',
      ocean: '#000000', outline: '#00ffcc', scanline: '#00ffcc', bg: 'transparent',
      hoverGlow: '#00ffee', tooltipBg: '#1F2937', tooltipText: '#ffffff'
    };
    // minimal light
    return {
      glow: '#000000', glowRgb: '0,0,0', grid: '#000000', gridOpacity: 0.2,
      border: '#000000', countryBase: '#f0f0f0', countryFill: '#000000',
      ocean: '#ffffff', outline: '#000000', scanline: '#000000', bg: 'transparent',
      hoverGlow: '#333333', tooltipBg: '#ffffff', tooltipText: '#000000'
    };
  }, [isDarkMode, isColorful]);

  // Projection and path generator
  const { projection, pathGen, graticule } = useMemo(() => {
    const proj = geoOrthographic()
      .translate([center, center])
      .scale(globeRadius)
      .rotate(rotation)
      .clipAngle(90);
    const path = geoPath().projection(proj);
    const grat = geoGraticule().step([15, 15]);
    return { projection: proj, pathGen: path, graticule: grat };
  }, [rotation, center, globeRadius]);

  // Country paths with fill colors
  const countryPaths = useMemo(() => {
    return worldGeoJSON.features.map(feature => {
      const iso = feature.properties.iso?.toLowerCase();
      const value = playCountMap.map[iso] || 0;
      const d = pathGen(feature.geometry);
      if (!d) return null;

      const intensity = playCountMap.max > 0 ? value / playCountMap.max : 0;
      let fill;
      if (value > 0) {
        const alpha = 0.2 + intensity * 0.7;
        fill = theme.countryFill;
        // Use opacity to show intensity
        return { iso, name: feature.properties.name, d, fill, opacity: alpha, value, hasData: true };
      }
      return { iso, name: feature.properties.name, d, fill: theme.countryBase, opacity: isDarkMode ? 0.4 : 0.3, value: 0, hasData: false };
    }).filter(Boolean);
  }, [pathGen, playCountMap, theme, isDarkMode]);

  // Auto-rotate when idle
  useEffect(() => {
    if (isDragging) {
      isIdle.current = false;
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
      return;
    }

    // Start idle timer
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      isIdle.current = true;
    }, 2000);

    let lastTime = null;
    const animate = (time) => {
      if (!isIdle.current) {
        animFrame.current = requestAnimationFrame(animate);
        return;
      }
      if (lastTime !== null) {
        const delta = (time - lastTime) / 1000;
        setRotation(prev => [prev[0] + delta * 8, prev[1], prev[2]]);
      }
      lastTime = time;
      animFrame.current = requestAnimationFrame(animate);
    };
    animFrame.current = requestAnimationFrame(animate);

    return () => {
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
      clearTimeout(idleTimer.current);
    };
  }, [isDragging]);

  // Drag handlers
  const getPointerPos = useCallback((e) => {
    if (e.touches) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerDown = useCallback((e) => {
    const pos = getPointerPos(e);
    setIsDragging(true);
    setDragStart(pos);
    setRotationStart(rotation);
    isIdle.current = false;
  }, [rotation, getPointerPos]);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging || !dragStart || !rotationStart) return;
    const pos = getPointerPos(e);
    const dx = pos.x - dragStart.x;
    const dy = pos.y - dragStart.y;
    const sensitivity = 0.3;
    setRotation([
      rotationStart[0] + dx * sensitivity,
      Math.max(-60, Math.min(60, rotationStart[1] - dy * sensitivity)),
      rotationStart[2]
    ]);
  }, [isDragging, dragStart, rotationStart, getPointerPos]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
    setRotationStart(null);
  }, []);

  // Attach global move/up listeners while dragging
  useEffect(() => {
    if (!isDragging) return;
    const move = (e) => { e.preventDefault(); handlePointerMove(e); };
    const up = () => handlePointerUp();
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const handleCountryClick = useCallback((country) => {
    if (!country.hasData || !onCountryClick) return;
    onCountryClick({ countryCode: country.iso, countryName: country.name });
  }, [onCountryClick]);

  const handleCountryHover = useCallback((country, e) => {
    setHoveredCountry(country?.iso || null);
    if (country && e) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        setTooltip({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top - 10,
          name: country.name,
          value: country.value
        });
      }
    } else {
      setTooltip(null);
    }
  }, []);

  // Scanline pattern
  const scanlines = useMemo(() => {
    const lines = [];
    for (let y = 0; y < size; y += 3) {
      lines.push(y);
    }
    return lines;
  }, [size]);

  // Generate unique filter ID to avoid conflicts
  const filterId = useMemo(() => 'hologram-glow', []);

  return (
    <div className="relative w-full flex justify-center" style={{ touchAction: 'none' }}>
      <style>{`
        @keyframes hologramFlicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.96; }
        }
        .hologram-globe { animation: hologramFlicker 0.5s ease-in-out infinite; }
      `}</style>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${size} ${size}`}
        className="hologram-globe w-full max-w-[600px]"
        style={{ cursor: isDragging ? 'grabbing' : 'grab', background: theme.bg }}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
      >
        <defs>
          {/* Glow filter */}
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Clip to globe */}
          <clipPath id="globe-clip">
            <circle cx={center} cy={center} r={globeRadius} />
          </clipPath>
        </defs>

        {/* Ocean / globe background */}
        <circle
          cx={center} cy={center} r={globeRadius}
          fill={theme.ocean}
          stroke={theme.outline}
          strokeWidth={1.5}
          filter={`url(#${filterId})`}
        />

        {/* Globe content clipped to sphere */}
        <g clipPath="url(#globe-clip)">
          {/* Graticule grid lines */}
          <path
            d={pathGen(graticule())}
            fill="none"
            stroke={theme.grid}
            strokeWidth={0.5}
            strokeOpacity={theme.gridOpacity}
          />

          {/* Country shapes */}
          {countryPaths.map(country => (
            <path
              key={country.iso}
              d={country.d}
              fill={country.fill}
              fillOpacity={hoveredCountry === country.iso ? Math.min(country.opacity + 0.3, 1) : country.opacity}
              stroke={theme.border}
              strokeWidth={hoveredCountry === country.iso ? 1.2 : 0.5}
              strokeOpacity={hoveredCountry === country.iso ? 0.9 : 0.4}
              style={{
                cursor: country.hasData ? 'pointer' : 'default',
                transition: 'fill-opacity 0.15s, stroke-width 0.15s',
                filter: hoveredCountry === country.iso && country.hasData ? `url(#${filterId})` : 'none'
              }}
              onClick={(e) => { e.stopPropagation(); handleCountryClick(country); }}
              onMouseEnter={(e) => handleCountryHover(country, e)}
              onMouseMove={(e) => handleCountryHover(country, e)}
              onMouseLeave={() => handleCountryHover(null)}
            />
          ))}

          {/* Scanline overlay */}
          <g opacity={isDarkMode ? 0.08 : 0.05} pointerEvents="none">
            {scanlines.map(y => (
              <line key={y} x1={0} y1={y} x2={size} y2={y} stroke={theme.scanline} strokeWidth={0.5} />
            ))}
          </g>
        </g>

        {/* Globe outline ring with glow */}
        <circle
          cx={center} cy={center} r={globeRadius}
          fill="none"
          stroke={theme.outline}
          strokeWidth={1.5}
          filter={`url(#${filterId})`}
          opacity={0.8}
        />
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none px-2 py-1 rounded text-xs font-bold shadow-lg"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            backgroundColor: theme.tooltipBg,
            color: theme.tooltipText,
            border: `1px solid ${theme.glow}`,
            boxShadow: `0 0 8px ${theme.glow}40`,
            zIndex: 10
          }}
        >
          {tooltip.name}{tooltip.value > 0 ? ` — ${tooltip.value.toLocaleString()} plays` : ''}
        </div>
      )}
    </div>
  );
};

export default HologramGlobe;
