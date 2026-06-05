import { Product, Allergen } from '../types';

const ALLERGEN_MAP: Record<string, Allergen> = {
  'GLU': 'Gluten', 'CRU': 'Crustáceos', 'HUE': 'Huevos', 'PES': 'Pescado',
  'CAC': 'Cacahuetes', 'SOY': 'Soja', 'LAC': 'Lácteos', 'FRA': 'Frutos de cáscara',
  'API': 'Apio', 'MUS': 'Mostaza', 'SES': 'Sésamo', 'SUL': 'Sulfitos',
  'ALT': 'Altramuces', 'MOL': 'Moluscos'
};

const RAW_DATA = [
  {"id":"prod_0001","name":"Solomillo de ternera","category":"carnes","unit":"kg","price":32.50,"allergens":[]},
  {"id":"prod_0003","name":"Filete de ternera","category":"carnes","unit":"kg","price":14.90,"allergens":[]},
  {"id":"prod_0005","name":"Lomo de cerdo","category":"carnes","unit":"kg","price":8.50,"allergens":[]},
  {"id":"prod_0010","name":"Pechuga de pollo","category":"carnes","unit":"kg","price":7.20,"allergens":[]},
  {"id":"prod_0181","name":"Salmón fresco","category":"pescados","unit":"kg","price":18.50,"allergens":["PES"]},
  {"id":"prod_0194","name":"Bacalao fresco","category":"pescados","unit":"kg","price":16.00,"allergens":["PES"]},
  {"id":"prod_0343","name":"Langostinos","category":"mariscos","unit":"kg","price":12.00,"allergens":["CRU"]},
  
  // Verduras actualizadas de unidad a Kg
  {"id":"prod_0499","name":"Zanahoria","category":"verduras","unit":"kg","price":1.20,"allergens":[]},
  {"id":"prod_0504","name":"Cebolla blanca","category":"verduras","unit":"kg","price":0.95,"allergens":[]},
  {"id":"prod_0509","name":"Ajo","category":"verduras","unit":"kg","price":4.50,"allergens":[]},
  {"id":"prod_0512","name":"Tomate rama","category":"verduras","unit":"kg","price":2.40,"allergens":[]},
  {"id":"prod_0517","name":"Pimiento rojo","category":"verduras","unit":"kg","price":2.80,"allergens":[]},
  {"id":"prod_0521","name":"Calabacín","category":"verduras","unit":"kg","price":1.80,"allergens":[]},
  {"id":"prod_0524","name":"Berenjena","category":"verduras","unit":"kg","price":2.10,"allergens":[]},
  {"id":"prod_0508","name":"Puerro","category":"verduras","unit":"kg","price":1.60,"allergens":[]},
  {"id":"prod_0561","name":"Patatas saco","category":"verduras","unit":"kg","price":0.80,"allergens":[]},

  // Almacén
  {"id":"prod_1281","name":"Harina de trigo","category":"almacen","unit":"kg","price":1.10,"allergens":["GLU"]},
  {"id":"prod_1309","name":"Azúcar blanco","category":"almacen","unit":"kg","price":1.35,"allergens":[]},
  {"id":"prod_1305","name":"Sal fina","category":"almacen","unit":"kg","price":0.60,"allergens":[]},
  {"id":"prod_1344","name":"Arroz redondo","category":"almacen","unit":"kg","price":1.80,"allergens":[]},
  {"id":"prod_1561","name":"Aceite Oliva Virgen Extra","category":"aceites","unit":"L","price":9.50,"allergens":[]},
  {"id":"prod_1564","name":"Aceite Girasol","category":"aceites","unit":"L","price":1.80,"allergens":[]},
  
  // Lácteos y Huevos
  {"id":"prod_0951","name":"Leche entera","category":"lacteos","unit":"L","price":1.05,"allergens":["LAC"]},
  {"id":"prod_0800","name":"Huevo XL","category":"lacteos","unit":"unidad","price":0.25,"allergens":["HUE"]},
  {"id":"prod_0965","name":"Mantequilla","category":"lacteos","unit":"kg","price":11.50,"allergens":["LAC"]},
  {"id":"prod_2000","name":"Chocolate Cobertura 70%","category":"almacen","unit":"kg","price":18.00,"allergens":["LAC", "SOY"]}
];

export const INITIAL_PRODUCT_DATABASE: Product[] = RAW_DATA.map(item => ({
  id: item.id,
  name: item.name,
  category: item.category,
  unit: item.unit,
  pricePerUnit: (item as any).price || 0,
  allergens: (item.allergens as string[]).map(code => ALLERGEN_MAP[code] || (code as Allergen))
}));