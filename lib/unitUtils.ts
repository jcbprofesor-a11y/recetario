
export const UNIT_FACTORS: Record<string, number> = {
  'kg': 1000,
  'g': 1,
  'mg': 0.001,
  'l': 1000,
  'ml': 1,
  'cl': 10,
  'dl': 100,
  'ud': 1,
  'unidad': 1,
  'unidades': 1,
  'docena': 12,
};

export const normalizeUnit = (unit: string): string => {
  if (!unit) return '';
  const u = unit.toLowerCase().trim().replace(/\./g, '');
  if (u === 'kgs' || u === 'kilogramo' || u === 'kilogramos') return 'kg';
  if (u === 'gr' || u === 'grs' || u === 'gramo' || u === 'gramos') return 'g';
  if (u === 'litro' || u === 'litros') return 'l';
  if (u === 'mililitro' || u === 'mililitros') return 'ml';
  if (u === 'centilitro' || u === 'centilitros') return 'cl';
  if (u === 'decilitro' || u === 'decilitros') return 'dl';
  return u;
};

export const convertToBase = (quantity: number, unit: string): number => {
  const normalized = normalizeUnit(unit);
  const factor = UNIT_FACTORS[normalized] || 1;
  return quantity * factor;
};

export const formatScaledQuantity = (num: number, unit: string, targetUnit?: string): { quantity: string, unit: string } => {
  const normalized = normalizeUnit(unit);
  const normalizedTarget = targetUnit ? normalizeUnit(targetUnit) : normalized;
  
  // Use original unit to determine the "dimension" (weight vs volume)
  const dimension = (normalized === 'ml' || normalized === 'cl' || normalized === 'dl' || normalized === 'l') ? 'volume' : 
                    (normalized === 'g' || normalized === 'kg' || normalized === 'mg') ? 'weight' : 'other';

  let totalBase = convertToBase(num, unit);

  // If dimension is weight or volume, they are interchangeable (1g = 1ml)
  if (dimension === 'weight' || dimension === 'volume') {
    if (totalBase >= 1000) {
      const value = totalBase / 1000;
      const finalUnit = dimension === 'volume' ? 'l' : 'kg';
      return {
        quantity: value % 1 === 0 ? value.toString() : value.toFixed(2).replace('.', ','),
        unit: finalUnit
      };
    } else {
      const finalUnit = dimension === 'volume' ? 'ml' : 'g';
      return {
        quantity: totalBase % 1 === 0 ? totalBase.toString() : totalBase.toFixed(1).replace('.', ','),
        unit: finalUnit
      };
    }
  }

  // Default for other units or if no specific dimension logic applied
  const factor = UNIT_FACTORS[normalizedTarget] || 1;
  const value = totalBase / factor;
  return {
    quantity: value % 1 === 0 ? value.toString() : value.toFixed(2).replace('.', ','),
    unit: targetUnit || unit
  };
};
