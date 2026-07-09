'use client';
import React from 'react';

// ---------------------------------------------------------------------------
// Shared bits for the analysis pages (Listening Patterns / Behavior / Music
// Discovery): stat tiles and recharts prop helpers, themed via
// getAnalysisPageColors / getAnalysisChartTheme from theme.js. Replaces the
// per-page copies of tooltip styling, legend styling, and pie label renderers.
// ---------------------------------------------------------------------------

// Label + big value + optional sub-line, on a press-shadow card.
export function StatTile({ label, value, sub, colors, className = '' }) {
  return (
    <div className={`p-3 ${colors.card} ${className}`}>
      <div className={`text-sm ${colors.textLight}`}>{label}</div>
      <div className={`text-3xl font-bold ${colors.text}`}>{value}</div>
      {sub && <div className={`text-xs mt-1 ${colors.textLighter}`}>{sub}</div>}
    </div>
  );
}

// Small square swatch that ties a stat card to its slice in a chart,
// so the text itself can stay in ink colors.
export function SliceDot({ color, className = '' }) {
  return (
    <span
      className={`inline-block w-3 h-3 rounded-sm shrink-0 ${className}`}
      style={{ backgroundColor: color }}
    />
  );
}

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Ink that reads on a given slice fill — dark text on light slices and
// vice versa, instead of one accent color that loses half the slices.
export function inkFor(hex) {
  try {
    return luminance(hex) > 0.45 ? '#27272a' : '#fafafa';
  } catch {
    return '#27272a';
  }
}

// Pie slice % label renderer. `colors` must be the same array the Cells use;
// omit it (or pass a datum without color) and the label falls back to dark ink.
export function makePieLabel({ colors = [], withName = false } = {}) {
  const renderer = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, payload }) => {
    if (percent < 0.04) return null; // slivers: legend + tooltip carry them
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180);
    const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180);
    const fill = colors[index] ?? payload?.color;
    return (
      <text
        x={x}
        y={y}
        fill={inkFor(fill || '#ffffff')}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="11px"
        fontWeight="bold"
      >
        {withName ? `${name} ${(percent * 100).toFixed(0)}%` : `${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
  return renderer;
}

// Headline stat rendered in a donut's hole. Use as
// <Pie innerRadius="55%" ...><Label content={donutCenter({ value, caption, ink })} /></Pie>
export function donutCenter({ value, caption, ink }) {
  const render = ({ viewBox }) => {
    const { cx, cy } = viewBox || {};
    if (cx == null || cy == null) return null;
    return (
      <g>
        <text
          x={cx}
          y={caption ? cy - 5 : cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="20px"
          fontWeight="800"
          fill={ink}
        >
          {value}
        </text>
        {caption && (
          <text
            x={cx}
            y={cy + 13}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="10px"
            fill={ink}
            opacity="0.75"
          >
            {caption}
          </text>
        )}
      </g>
    );
  };
  return render;
}

// Spread onto <Tooltip {...tooltipProps(chart)} /> for a theme-styled box.
export function tooltipProps(chart) {
  return {
    contentStyle: { ...chart.tooltip, borderRadius: '4px' },
    labelStyle: { color: chart.tooltip.color, fontWeight: 'bold' },
    itemStyle: { color: chart.tooltip.color },
    cursor: { fill: chart.grid, fillOpacity: 0.35 },
  };
}

// Spread onto <Legend {...legendProps(chart)} />.
export function legendProps(chart) {
  return {
    wrapperStyle: { color: chart.legendText, fontSize: '12px' },
    iconType: 'rect',
    iconSize: 10,
    formatter: (value) => <span style={{ color: chart.legendText }}>{value}</span>,
  };
}

// Spread onto <XAxis {...axisProps(chart)} /> / <YAxis {...axisProps(chart)} />.
export function axisProps(chart) {
  return {
    stroke: chart.axis,
    tick: { fill: chart.axis, fontSize: 10 },
    tickLine: { stroke: chart.axis },
  };
}
