
import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'default' | 'inverted';
  align?: 'left' | 'center' | 'right';
}

export const Logo: React.FC<LogoProps> = ({ className = "", variant = 'default', align = 'left' }) => {
  const baseColor = variant === 'inverted' ? 'text-white' : 'text-[#013b33]';
  const justify = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';
  const iconColor = variant === 'inverted' ? 'white' : '#013b33';

  return (
    <div className={`flex items-center gap-3 ${justify} ${className} select-none`}>
      <svg 
        width="40" 
        height="40" 
        viewBox="0 0 256 256" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <path 
          d="M 128 192 C 92.654 192 64 220.654 64 256 L 0 256 C 0 185.308 57.308 128 128 128 Z M 256 128 C 256 198.692 198.692 256 128 256 L 128 192 C 163.346 192 192 163.346 192 128 Z M 128 64 C 92.654 64 64 92.654 64 128 L 0 128 C 0 57.308 57.308 0 128 0 Z M 256 0 C 256 70.692 198.692 128 128 128 L 128 64 C 163.346 64 192 35.346 192 0 Z" 
          fill={iconColor}
        />
      </svg>
      <span className={`font-black text-3xl tracking-tighter leading-none ${baseColor}`}>
        Fresco<span className="text-orange-500">.</span>
      </span>
    </div>
  );
};
