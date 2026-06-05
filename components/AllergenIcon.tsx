
import React from 'react';
import { Allergen } from '../types';
import { 
  Wheat, 
  Fish, 
  Egg, 
  Milk, 
  Nut, 
  Shell, 
  Sprout, 
  FlaskConical, 
  Leaf, 
  Droplets, 
  CircleDot, 
  Circle,
  Bean
} from 'lucide-react';

interface AllergenIconProps {
  allergen: Allergen;
  size?: number;
  className?: string;
  showLabel?: boolean;
}

export const ALLERGEN_DATA: Record<Allergen, { color: string, icon: React.ReactNode }> = {
  'Gluten': {
    color: '#E67E22',
    icon: <Wheat />
  },
  'Crustáceos': {
    color: '#3498DB',
    icon: <Shell />
  },
  'Huevos': {
    color: '#F1C40F',
    icon: <Egg />
  },
  'Pescado': {
    color: '#2980B9',
    icon: <Fish />
  },
  'Cacahuetes': {
    color: '#A04000',
    icon: <Bean />
  },
  'Soja': {
    color: '#27AE60',
    icon: <Leaf />
  },
  'Lácteos': {
    color: '#8D6E63',
    icon: <Milk />
  },
  'Frutos de cáscara': {
    color: '#C0392B',
    icon: <Nut />
  },
  'Apio': {
    color: '#2ECC71',
    icon: <Sprout />
  },
  'Mostaza': {
    color: '#D4AC0D',
    icon: <Droplets />
  },
  'Sésamo': {
    color: '#7F8C8D',
    icon: <CircleDot />
  },
  'Sulfitos': {
    color: '#8E44AD',
    icon: <FlaskConical />
  },
  'Altramuces': {
    color: '#F4D03F',
    icon: <Circle />
  },
  'Moluscos': {
    color: '#5DADE2',
    icon: <Shell />
  }
};

export const AllergenIcon: React.FC<AllergenIconProps> = ({ allergen, size = 24, className = "", showLabel = false }) => {
  const data = ALLERGEN_DATA[allergen];
  if (!data) return null;

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <div 
        style={{ 
          backgroundColor: data.color, 
          width: size, 
          height: size,
          color: 'white'
        }}
        className="rounded-full flex items-center justify-center p-1 shadow-sm transition-transform hover:scale-110"
      >
        {React.cloneElement(data.icon as React.ReactElement, { size: size * 0.6 })}
      </div>
      {showLabel && (
        <span className="text-[7px] font-black uppercase text-center leading-[1] text-slate-900">
          {allergen}
        </span>
      )}
    </div>
  );
};
