
export type Allergen = 
  | 'Gluten' | 'Crustáceos' | 'Huevos' | 'Pescado' | 'Cacahuetes' 
  | 'Soja' | 'Lácteos' | 'Frutos de cáscara' | 'Apio' | 'Mostaza' 
  | 'Sésamo' | 'Sulfitos' | 'Altramuces' | 'Moluscos';

export const ALLERGEN_LIST: Allergen[] = [
  'Gluten', 'Crustáceos', 'Huevos', 'Pescado', 'Cacahuetes', 
  'Soja', 'Lácteos', 'Frutos de cáscara', 'Apio', 'Mostaza', 
  'Sésamo', 'Sulfitos', 'Altramuces', 'Moluscos'
];

export interface Product {
  id: string;
  name: string;
  allergens: Allergen[];
  category?: string;
  unit: string;
  pricePerUnit: number; 
  weightPerUnit?: number; 
  status?: 'approved' | 'pending'; // New: For admin approval
  requestedBy?: string; // New: Who requested it
}

export interface Ingredient {
  id: string;
  name: string;
  quantity: string; 
  unit: string;
  category?: string;
  allergens: Allergen[];
  pricePerUnit?: number;
  weightPerUnit?: number;
  baseUnit?: string;
  cost?: number;
}

export interface SubRecipe {
  id: string;
  name: string;
  ingredients: Ingredient[];
  instructions: string;
  photos: string[];
}

export interface ServiceDetails {
  presentation: string;
  servingTemp: string;
  tempHot?: string;
  tempCold?: string;
  cutlery: string;
  passTime: string;
  serviceType: string;
  clientDescription: string;
}

export interface Recipe {
  id: string;
  name: string;
  category: string; 
  categories: string[]; 
  photo: string;
  creator: string;
  creatorLogo?: string; // New: Logo of the creator
  workspaceId: string; // New: Who owns this recipe
  isPublic: boolean;   // New: Shared with community
  originalAuthor?: string; // New: If duplicated from community
  sourceUrl?: string;
  yieldQuantity: number;
  yieldUnit: string;
  subRecipes: SubRecipe[];
  platingInstructions: string;
  serviceDetails: ServiceDetails;
  extraAllergens?: Allergen[];
  lastModified: number;
  totalCost?: number;
}

export interface MenuPlan {
  id: string;
  title: string;
  date: string;
  pax: number;
  recipeIds: string[];
  lastModified: number;
  workspaceId: string; // New: Who owns this menu plan
}

export interface CategoryConfig {
  name: string;
  colors: string[]; // Up to 3 colors
}

export interface WorkspaceSettings {
  workspaceId: string;
  categories: string[];
  categoryConfigs?: CategoryConfig[];
}

export interface AppSettings {
  instituteName: string;
  instituteLogo: string;
  categories: string[];
  categoryConfigs?: CategoryConfig[];
}

export interface AppBackup {
  version: number;
  timestamp: number;
  settings: AppSettings;
  recipes: Recipe[];
  productDatabase: Product[];
  savedMenus?: MenuPlan[];
}

export interface FullBackup extends AppBackup {
  users?: AppUser[];
  invites?: WorkspaceInvite[];
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  teacherName?: string;
  teacherLogo?: string;
  instituteName?: string; // New: User's school name
  instituteLogo?: string; // New: User's school logo
  isApproved: boolean;
  role: 'admin' | 'user';
  createdAt: number;
  workspaceId: string; // New: To group users
  requestMessage?: string; // New: Message from pending users
}

export interface WorkspaceInvite {
  email: string;
  workspaceId: string;
  inviterName: string;
  createdAt: number;
}

export const DEFAULT_CATEGORIES = [
  "Entrantes", "Ensaladas", "Sopas y Cremas", "Carnes", "Aves", 
  "Pescados", "Mariscos", "Pastas y Arroces", "Guarniciones", 
  "Salsas", "Postres", "Panadería", "Bebidas", "Otros"
];

export const SERVICE_TYPES = [
  { id: "americana", name: "Servicio a la Americana", desc: "Práctico, rápido, plato montado en cocina." },
  { id: "inglesa", name: "Servicio a la Inglesa", desc: "Similar al americano, pero con mayor énfasis en presentación." },
  { id: "francesa", name: "Servicio a la Francesa", desc: "Tradicional, todos los platos al mismo tiempo en fuentes." },
  { id: "gueridon", name: "Servicio al Gueridón (o a la Rusa)", desc: "Teatral, preparación parcial en mesa frente al cliente." },
  { id: "milieu", name: "Servicio de Plat de Milieu", desc: "Platos servidos en el centro de la mesa (similar a familiar)." },
  { id: "buffet", name: "Servicio de Buffet", desc: "Autoservicio, alimentos expuestos en mesas o mostradores." },
  { id: "directa", name: "Sin Servicio / Venta Directa", desc: "Productos para llevar o despacho directo (bollería, pastelería)." }
];

export const CUTLERY_DICTIONARY = {
  "Carnes": "Cuchillo trinchero + Tenedor trinchero (Para cortar y sujetar)",
  "Pescado": "Pala de pescado + Tenedor de pescado (Hoja flexible, sin filo)",
  "Entremeses": "Tenedor pequeño (+ cuchillo mini si se necesita) (Para entradas frías/ligeras)",
  "Sopas": "Cuchara de sopa o de consomé (Forma según tipo de caldo)",
  "Postres": "Cuchillo + tenedor y/o cuchara de postre (Se colocan arriba del plato)",
  "Quesos": "Cuchillo(s) de queso (+ tenedor pequeño) (Varía según dureza)"
};

export const TEMPERATURE_DICTIONARY = {
  "Carnes Rojas": [
    { label: "Jugoso", value: "52–55 °C" },
    { label: "Medio", value: "57–60 °C" },
    { label: "Al Punto", value: "60–63 °C" },
    { label: "Bien Hecho", value: "68–72 °C" }
  ],
  "Aves (Pollo, Pavo)": [
    { label: "Mínimo Seguro", value: "74 °C (sin rosa)" }
  ],
  "Cerdo": [
    { label: "Jugoso y Seguro", value: "63–65 °C" },
    { label: "Bien Hecho", value: "70–72 °C" }
  ],
  "Cordero": [
    { label: "Jugoso", value: "52–55 °C" },
    { label: "Al Punto", value: "60–63 °C" }
  ],
  "Pescado Blanco": [
    { label: "Merluza/Lenguado", value: "55–60 °C (suave)" }
  ],
  "Pescado Azul": [
    { label: "A la plancha", value: "50–55 °C (rosado)" },
    { label: "Bien Cocido", value: "60–65 °C" }
  ],
  "Mariscos": [
    { label: "Gambas/Langostinos", value: "60–65 °C (nacarado)" },
    { label: "Calamares/Pulpo", value: "70–75 °C (tiernos)" }
  ],
  "Arroces y Pastas": [
    { label: "Servicio Caliente", value: "65–70 °C" }
  ],
  "Verduras": [
    { label: "Asadas/Vapor", value: "60–65 °C (crujientes)" }
  ],
  "Sopas y Cremas": [
    { label: "Ligeras", value: "60–65 °C" },
    { label: "Contundentes", value: "70–75 °C" }
  ],
  "Fríos": [
    { label: "Ensaladas/Tartares", value: "4–8 °C" }
  ]
};
