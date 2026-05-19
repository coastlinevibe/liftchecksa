'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleImageProps {
  title: string;
  icon: React.ReactNode;
  imageUrl: string | null;
  altText: string;
  width: number;
  height: number;
  className?: string;
}

export default function CollapsibleImage({
  title,
  icon,
  imageUrl,
  altText,
  width,
  height,
  className = ''
}: CollapsibleImageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-3 hover:opacity-70 transition-opacity"
      >
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-600" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-600" />
        )}
      </button>
      
      {isExpanded && (
        <>
          {imageUrl ? (
            <div className="bg-slate-100 rounded-lg p-4">
              <Image 
                src={imageUrl} 
                alt={altText} 
                width={width} 
                height={height} 
                className={className}
              />
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-sm text-red-800">No {altText.toLowerCase()} uploaded</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
