import React from 'react';

/**
 * Reusable vector logo for Prakriti Track.
 * 
 * @param {number} [height=40] - The display height of the logo in pixels.
 * @param {boolean} [showText=true] - Toggle display of 'Prakriti Track' text.
 * @param {string} [className=""] - Optional CSS class name.
 */
export default function Logo({ height = 40, showText = true, className = "" }) {
  const width = showText ? 240 : 60;
  return (
    <svg 
      width={width * (height / 60)} 
      height={height} 
      viewBox={`0 0 ${width} 60`} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      {/* Brand stem - uses currentColor for adaptive dark/light rendering */}
      <path 
        d="M25 42C25 28 42 15 57 25C67 31 64 41 54 41C44 41 40 31 50 25" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
      />
      {/* Left red leaves */}
      <path d="M21 26C15 28 11 24 15 20C19 16 21 20 21 26Z" fill="#ef4444" />
      <path d="M31 20C25 22 21 18 25 14C29 10 31 14 31 20Z" fill="#ef4444" />
      
      {/* Right green leaf */}
      <path d="M57 25C64 17 72 19 74 27C72 35 64 33 57 25Z" fill="#10b981" />
      <path d="M57 25C62 23 67 24 74 27" stroke="#ffffff" strokeWidth="1" />
      
      {showText && (
        <>
          {/* Main cursive branding */}
          <text 
            x="85" 
            y="35" 
            fontFamily="'Playfair Display', Georgia, serif" 
            fontSize="26" 
            fontWeight="bold" 
            fontStyle="italic" 
            fill="currentColor"
          >
            Prakriti
          </text>
          {/* Subheading branding */}
          <text 
            x="85" 
            y="50" 
            fontFamily="'Inter', sans-serif" 
            fontSize="10" 
            fontWeight="800" 
            letterSpacing="3" 
            fill="var(--text-muted, #94a3b8)"
          >
            TRACK
          </text>
          {/* Customized red dots for standard 'i' glyphs */}
          <circle cx="157" cy="20" r="2.5" fill="#ef4444" />
          <circle cx="184" cy="20" r="2.5" fill="#ef4444" />
        </>
      )}
    </svg>
  );
}
