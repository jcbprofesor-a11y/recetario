
import React from 'react';
import { AppSettings } from '../types';

interface CategoryStripeProps {
  category: string;
  settings: AppSettings;
  className?: string;
  vertical?: boolean;
}

export const CategoryStripe: React.FC<CategoryStripeProps> = ({ category, settings, className = "", vertical = false }) => {
  const config = settings.categoryConfigs?.find(c => c.name === category);
  
  // Fallback colors if no config exists
  const getFallbackColors = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('carne') || c.includes('ave')) return ['#f43f5e']; // rose-500
    if (c.includes('pescado') || c.includes('marisco')) return ['#3b82f6']; // blue-500
    if (c.includes('entrante') || c.includes('ensalada')) return ['#10b981']; // emerald-500
    if (c.includes('postre') || c.includes('dulce') || c.includes('pastelería')) return ['#f59e0b']; // amber-500
    if (c.includes('salsa') || c.includes('guarnición')) return ['#6366f1']; // indigo-500
    if (c.includes('arroz') || c.includes('pasta')) return ['#f97316']; // orange-500
    return ['#94a3b8']; // slate-400
  };

  const colors = config?.colors || getFallbackColors(category);

  return (
    <div className={`${className} flex ${vertical ? 'flex-col' : 'flex-row'} overflow-hidden`}>
      {colors.map((color, idx) => (
        <div 
          key={idx} 
          style={{ backgroundColor: color }} 
          className="flex-grow h-full w-full"
        />
      ))}
    </div>
  );
};
