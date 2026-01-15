
import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'default' | 'inverted';
  align?: 'left' | 'center' | 'right';
}

export const Logo: React.FC<LogoProps> = ({ className = "", variant = 'default', align = 'left' }) => {
  const baseColor = variant === 'inverted' ? 'text-white' : 'text-teal-900';
  const justify = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';

  return (
    <div className={`flex items-center gap-4 ${justify} ${className} select-none group`}>
      <div className="relative flex-shrink-0 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
        <img 
          src="input_file_0.png" 
          alt="Fresco Logo" 
          className="w-11 h-11 object-contain drop-shadow-sm"
        />
      </div>
      <span className={`font-black text-3xl tracking-tighter leading-none ${baseColor}`}>
        Fresco<span className={variant === 'inverted' ? 'text-orange-300' : 'text-orange-500'}>.</span>
      </span>
    </div>
  );
};
