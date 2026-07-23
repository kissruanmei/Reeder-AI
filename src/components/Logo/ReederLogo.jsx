import React from 'react';

export const ReederLogo = ({ size = 28, showText = true, className = '' }) => {
  return (
    <div 
      className={`reeder-logo-container ${className}`}
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '8px',
        userSelect: 'none'
      }}
    >
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 512 512" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="navBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5"/>
            <stop offset="50%" stopColor="#7c3aed"/>
            <stop offset="100%" stopColor="#c084fc"/>
          </linearGradient>
          <linearGradient id="navSparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8"/>
            <stop offset="100%" stopColor="#f472b6"/>
          </linearGradient>
        </defs>

        {/* Background Squircle */}
        <rect width="512" height="512" rx="128" fill="url(#navBgGrad)"/>
        
        {/* Book Left Page */}
        <path d="M120 350 V 210 C 120 190 140 178 165 182 L 244 195 V 338 L 165 324 C 140 320 120 332 120 350 Z" fill="#ffffff" fillOpacity="0.95"/>
        
        {/* Book Right Page */}
        <path d="M392 350 V 210 C 392 190 372 178 347 182 L 268 195 V 338 L 347 324 C 372 320 392 332 392 350 Z" fill="#ffffff" fillOpacity="0.8"/>
        
        {/* Center Spine */}
        <path d="M256 195 V 338" stroke="#4f46e5" strokeWidth="10" strokeLinecap="round"/>

        {/* AI Sparkle */}
        <path d="M256 100 Q256 150 210 150 Q256 150 256 200 Q256 150 302 150 Q256 150 256 100 Z" fill="url(#navSparkleGrad)"/>
        <circle cx="256" cy="150" r="10" fill="#ffffff"/>
      </svg>

      {showText && (
        <span style={{ 
          fontWeight: 700, 
          fontSize: '15px', 
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--accent-color) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontFamily: 'Inter, sans-serif'
        }}>
          Reeder <span style={{ color: 'var(--accent-color)', WebkitTextFillColor: 'initial', fontSize: '11px', fontWeight: 600, padding: '1px 5px', borderRadius: '4px', background: 'var(--accent-light)', verticalAlign: 'middle', marginLeft: '2px' }}>AI</span>
        </span>
      )}
    </div>
  );
};
