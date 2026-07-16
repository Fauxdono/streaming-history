'use client';
import React from 'react';

// Compact "Show Top N" control for the mobile toolbars: a number input with
// the native spinner hidden (its arrows overlap the digits at this size) plus
// ▲/▼ buttons stepping ±10, clamped to [1, max]. Colors come from the host
// page via inputClass/buttonClass so every tab keeps its own accent; the key
// remounts the uncontrolled input so arrow changes show up.
export default function TopNStepper({ value, setValue, max = 500, inputClass = '', buttonClass = '' }) {
  const clamp = (v) => Math.min(max, Math.max(1, v));
  return (
    <>
      <input
        key={value}
        type="number"
        inputMode="numeric"
        min="1"
        max={max}
        defaultValue={value}
        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
        onBlur={(e) => { const v = parseInt(e.target.value); if (v >= 1 && v <= max) setValue(v); else e.target.value = value; }}
        className={`w-9 border rounded px-1 py-1 text-xs text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${inputClass}`}
      />
      {[['▲', 10], ['▼', -10]].map(([glyph, delta]) => (
        <button
          key={glyph}
          onClick={() => setValue(c => clamp((parseInt(c) || 0) + delta))}
          className={`px-1.5 py-1.5 rounded text-[10px] leading-3 font-medium transition-colors ${buttonClass}`}
        >
          {glyph}
        </button>
      ))}
    </>
  );
}
