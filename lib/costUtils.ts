import { UNIT_FACTORS, normalizeUnit } from './unitUtils';

export const calculateIngredientCost = (quantity: string | number, unit: string, pricePerUnit?: number, baseUnit?: string, weightPerUnit?: number): number => {
  if (pricePerUnit === undefined || pricePerUnit === 0) return 0;
  
  const qtyNum = typeof quantity === 'string' ? parseFloat(quantity.replace(',', '.')) : quantity;
  if (isNaN(qtyNum)) return 0;

  const rUnit = normalizeUnit(unit);
  const bUnit = normalizeUnit(baseUnit || unit);

  // CASO ESPECIAL: Conversión de peso a unidades (o viceversa) usando weightPerUnit
  if ((bUnit === 'unidad' || bUnit === 'ud') && (rUnit === 'g' || rUnit === 'kg') && weightPerUnit) {
    const qtyInGrams = rUnit === 'kg' ? qtyNum * 1000 : qtyNum;
    const unitsNeeded = qtyInGrams / weightPerUnit;
    return unitsNeeded * pricePerUnit;
  }

  if ((rUnit === 'unidad' || rUnit === 'ud') && (bUnit === 'g' || bUnit === 'kg') && weightPerUnit) {
    const totalGrams = qtyNum * weightPerUnit;
    const bFactor = UNIT_FACTORS[bUnit] || 1;
    return (totalGrams / bFactor) * pricePerUnit;
  }

  if (rUnit === bUnit) return qtyNum * pricePerUnit;

  const rFactor = UNIT_FACTORS[rUnit] || 1;
  const bFactor = UNIT_FACTORS[bUnit] || 1;

  const cost = (qtyNum * rFactor) / bFactor * pricePerUnit;
  return cost;
};
