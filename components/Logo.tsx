
import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'default' | 'inverted';
  align?: 'left' | 'center' | 'right';
  iconOnly?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = "", variant = 'default', align = 'left', iconOnly = false }) => {
  const baseColor = variant === 'inverted' ? 'text-white' : 'text-[#013b33]';
  const justify = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';
  const iconColor = variant === 'inverted' ? 'white' : '#013b33';

  return (
    <div className={`flex items-center gap-3 ${justify} ${className} select-none`}>
      <svg 
        width={iconOnly ? "32" : "38"} 
        height={iconOnly ? "32" : "38"} 
        viewBox="0 0 256 256" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <path 
          d="M 64 128 C 64 163.346 92.654 192 128 192 L 128 256 C 57.308 256 0 198.692 0 128 Z M 192 128 C 192 163.346 220.654 192 256 192 L 256 256 C 185.308 256 128 198.692 128 128 Z M 64 0 C 64 35.346 92.654 64 128 64 L 128 128 C 57.308 128 0 70.692 0 0 Z M 192 0 C 192 35.346 220.654 64 256 64 L 256 128 C 185.308 128 128 70.692 128 0 Z" 
          fill={iconColor}
        />
      </svg>
      {!iconOnly && (
        <span className={`font-black text-3xl tracking-[-0.05em] leading-none ${baseColor}`}>
          Fresco<span className="text-orange-500">.</span>
        </span>
      )}
    </div>
  );
};
