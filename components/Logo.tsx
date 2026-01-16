
import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'default' | 'inverted';
  align?: 'left' | 'center' | 'right';
}

export const Logo: React.FC<LogoProps> = ({ className = "", variant = 'default', align = 'left' }) => {
  const baseColor = variant === 'inverted' ? 'text-white' : 'text-[#013b33]';
  const justify = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';

  return (
    <div className={`flex items-center gap-2.5 ${justify} ${className} select-none`}>
      <img 
        src="input_file_0.png" 
        alt="Fresco" 
        className="w-9 h-9 object-contain"
      />
      <span className={`font-black text-2xl tracking-tighter leading-none ${baseColor}`}>
        Fresco<span className="text-orange-500">.</span>
      </span>
    </div>
  );
};
