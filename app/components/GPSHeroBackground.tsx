'use client';

import React from 'react';

export default function GPSHeroBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-emerald-400 to-emerald-500" style={{ perspective: '500px' }}>
      {/* GPS Animation Container */}
      <div 
        className="absolute inset-0 w-[calc(100%+1000px)] h-full -left-[500px]"
        style={{ transform: 'rotateX(45deg)' }}
      >
        {/* Animated Road Background */}
        <div 
          className="absolute w-full h-[1300px] -top-[162px] animate-driving"
          style={{
            backgroundImage: 'url(/roads-pattern.svg)',
            backgroundPosition: '50%',
            backgroundSize: '25%',
          }}
        />
        
        {/* Road/Route */}
        <div 
          className="absolute w-8 -top-[162px] -bottom-[162px] left-1/2 -translate-x-1/2 bg-white shadow-[0_0_13px_5px_rgba(16,185,129,0.25)]"
        >
          {/* Emerald center line */}
          <div 
            className="absolute w-[60%] top-0 bottom-[35%] left-1/2 -translate-x-1/2 bg-emerald-600"
          />
        </div>
        
        {/* Location Marker */}
        <div 
          className="absolute h-24 w-24 bg-white rounded-full top-[60%] left-1/2 -translate-x-1/2 shadow-[0_0.125em_10px_3px_rgba(16,185,129,0.25)]"
          style={{
            borderRight: '1px solid #ddd',
            borderBottom: '3px solid #ddd',
            borderLeft: '1px solid #ddd',
          }}
        >
          {/* Arrow pointer */}
          <div 
            className="absolute top-[20%] left-1/2 -translate-x-1/2"
            style={{
              borderLeft: '1.5em solid transparent',
              borderRight: '1.5em solid transparent',
              borderBottom: '3em solid #10b981',
            }}
          />
        </div>
      </div>
      
      {/* Fade overlay at top */}
      <div 
        className="absolute top-0 left-0 w-full h-[60%] z-10 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(to bottom, rgba(52, 211, 153, 1) 10%, rgba(52, 211, 153, 0) 100%)',
        }}
      />
      
      {/* Content */}
      <div className="relative z-20">
        {children}
      </div>
      
      {/* Horizontal bottom */}
      <div 
        className="absolute bottom-0 w-full h-20 bg-slate-900"
      />
    </div>
  );
}
