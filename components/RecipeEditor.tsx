
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Recipe, Ingredient, ServiceDetails, SubRecipe, 
  Allergen, Product, 
  SERVICE_TYPES, AppSettings, ALLERGEN_LIST, AppUser 
} from '../types';
import { CategoryStripe } from './CategoryStripe';
import { AllergenIcon } from './AllergenIcon';
import { calculateIngredientCost } from '../lib/costUtils';
import { compressImage } from '../lib/imageUtils';
import { 
  Save, X, Plus, Trash2, Image as ImageIcon, 
  Book, Utensils, Thermometer, Info, Database, MessageSquare, ChevronDown, CheckCircle2,
  ChefHat, Users, Camera, DatabaseZap, Check, HelpCircle, AlertOctagon
} from 'lucide-react';

interface RecipeEditorProps {
  initialRecipe?: Recipe | null;
  productDatabase: Product[];
  settings: AppSettings;
  appUser: AppUser | null;
  onSave: (recipe: Recipe) => Promise<void> | void;
  onCancel: () => void;
  onAddProduct: (product: Product) => void;
}

const emptyServiceDetails: ServiceDetails = {
  presentation: '',
  servingTemp: '',
  cutlery: '',
  passTime: '',
  serviceType: 'Servicio a la Americana',
  clientDescription: ''
};

const CUTLERY_QUICK_OPTIONS = [
  { label: "Entremeses", value: "TENEDOR Y CUCHILLO DE ENTREMÉS" },
  { label: "Trincheros", value: "TENEDOR Y CUCHILLO TRINCHERO" },
  { label: "Ostras", value: "TENEDOR DE OSTRAS" },
  { label: "Caviar", value: "CUCHARILLAS DE NÁCAR" },
  { label: "Cuchara Sopera", value: "CUCHARA SOPERA" },
  { label: "Consomé", value: "CUCHARA DE CONSOMÉ" },
  { label: "Pescado", value: "TENEDOR Y PALA DE PESCADO" },
  { label: "Marisco", value: "PINZAS Y TENEDOR DE MARISCO" },
  { label: "Carne Blanda", value: "CUCHILLO Y TENEDOR" },
  { label: "Carne Fibrosa", value: "TENEDOR DE CARNE ESPECÍFICO" },
  { label: "Postre Gral", value: "CUCHARA Y TENEDOR DE POSTRE" },
  { label: "Bizcochos", value: "CUCHILLO DE POSTRE" },
  { label: "Fruta/Macedonia", value: "CUCHARAS DE POSTRE" },
  { label: "Sin Cubiertos", value: "SIN CUBIERTOS" },
  { label: "Por Determinar", value: "POR DETERMINAR" },
];

const TEMP_QUICK_OPTIONS = [
  { label: "Carnes/Pescados", value: "60 °C - 70 °C" },
  { label: "Sopas/Cremas", value: "70 °C (sin hervir)" },
  { label: "Guisos/Arroces", value: "60 °C - 70 °C" },
  { label: "Entremeses/Quesos", value: "18 °C - 22 °C (Ambiente)" },
  { label: "Ensaladas/Fríos", value: "4 °C - 10 °C" },
  { label: "Helados/Sorbetes", value: "-1 °C a 2 °C" },
];

export const RecipeEditor: React.FC<RecipeEditorProps> = ({ 
  initialRecipe, productDatabase, settings, appUser, onSave, onCancel, onAddProduct 
}) => {
  const [name, setName] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [yieldQuantity, setYieldQuantity] = useState<number>(1);
  const [yieldUnit, setYieldUnit] = useState('Raciones');
  const [photo, setPhoto] = useState('');
  const [creator, setCreator] = useState(appUser?.teacherName || appUser?.displayName || '');
  const [sourceUrl, setSourceUrl] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [platingInstructions, setPlatingInstructions] = useState('');
  const [extraAllergens, setExtraAllergens] = useState<Allergen[]>([]);
  const [serviceDetails, setServiceDetails] = useState<ServiceDetails>(emptyServiceDetails);
  const [subRecipes, setSubRecipes] = useState<SubRecipe[]>([]);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [suggestions, setSuggestions] = useState<{idx: number, list: Product[]} | null>(null);
  const [editingAllergenTarget, setEditingAllergenTarget] = useState<{subIdx: number, ingIdx: number} | 'global' | null>(null);
  
  const [quickAddProduct, setQuickAddProduct] = useState<Product | null>(null);
  const [familySearch, setFamilySearch] = useState('');
  const [showFamilyList, setShowFamilyList] = useState(false);

  const existingFamilies = useMemo(() => {
    const families = Array.from(new Set(
      productDatabase.map(p => p.category?.toUpperCase() || 'VARIOS')
    )).sort();
    return families;
  }, [productDatabase]);

  const filteredFamilies = useMemo(() => {
    const search = familySearch.toUpperCase();
    return existingFamilies.filter(f => f.includes(search));
  }, [existingFamilies, familySearch]);

  useEffect(() => {
    if (initialRecipe) {
      setName(initialRecipe.name);
      setCategories(initialRecipe.categories || (initialRecipe.category ? [initialRecipe.category] : []));
      setYieldQuantity(initialRecipe.yieldQuantity);
      setYieldUnit(initialRecipe.yieldUnit);
      setPhoto(initialRecipe.photo);
      setCreator(initialRecipe.creator || appUser?.teacherName || appUser?.displayName || '');
      setSourceUrl(initialRecipe.sourceUrl || '');
      setIsPublic(initialRecipe.isPublic || false);
      setServiceDetails(initialRecipe.serviceDetails || emptyServiceDetails);
      setPlatingInstructions(initialRecipe.platingInstructions || '');
      setExtraAllergens(initialRecipe.extraAllergens || []);
      setSubRecipes((initialRecipe.subRecipes || []).map(sr => ({
        ...sr,
        ingredients: (sr.ingredients || []).map(ing => {
          const product = productDatabase.find(p => p.name.toUpperCase() === ing.name.toUpperCase());
          const baseUnit = ing.baseUnit || (product ? product.unit : undefined);
          const weightPerUnit = ing.weightPerUnit || (product ? product.weightPerUnit : undefined);
          
          return {
            ...ing,
            baseUnit,
            weightPerUnit,
            cost: calculateIngredientCost(ing.quantity, ing.unit, ing.pricePerUnit, baseUnit, weightPerUnit)
          };
        }),
        photos: sr.photos || ((sr as any).photo ? [(sr as any).photo] : [])
      })));
    } else {
      setSubRecipes([{ id: Date.now().toString(), name: 'Elaboración Principal', ingredients: [], instructions: '', photos: [] }]);
      setCreator(appUser?.teacherName || appUser?.displayName || '');
    }
  }, [initialRecipe, appUser]);

  const updateIngredient = (subIdx: number, ingIdx: number, field: keyof Ingredient, value: any) => {
    const newSubs = [...subRecipes];
    const ing = newSubs[subIdx].ingredients[ingIdx];
    
    if (field === 'quantity') {
      ing.quantity = value;
    } else {
      (ing as any)[field] = value;
    }

    // Recalcular coste si cambia cantidad o unidad
    if (field === 'quantity' || field === 'unit') {
      ing.cost = calculateIngredientCost(ing.quantity, ing.unit, ing.pricePerUnit, ing.baseUnit, ing.weightPerUnit);
    }

    if (field === 'name') {
      const lowerVal = (value as string).toLowerCase();
      if (lowerVal.length > 1) {
        const matches = productDatabase.filter(p => p.name.toLowerCase().includes(lowerVal)).slice(0, 50);
        setSuggestions({ idx: ingIdx, list: matches });
      } else setSuggestions(null);
    }
    setSubRecipes(newSubs);
  };

  const handleOpenQuickAdd = (ingName: string) => {
    if (!ingName.trim()) return;
    setQuickAddProduct({
      id: `p_quick_${Date.now()}`,
      name: ingName.toUpperCase(),
      unit: 'kg',
      pricePerUnit: 0,
      allergens: [],
      category: 'ALMACÉN'
    });
    setFamilySearch('ALMACÉN');
    setSuggestions(null);
  };

  const handleSaveQuickProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddProduct) return;
    
    onAddProduct({
      ...quickAddProduct,
      category: familySearch.toUpperCase() || 'VARIOS'
    });
    
    const newSubs = [...subRecipes];
    newSubs.forEach(sub => {
      sub.ingredients.forEach(ing => {
        if (ing.name.toUpperCase() === quickAddProduct.name.toUpperCase()) {
          ing.pricePerUnit = quickAddProduct.pricePerUnit;
          ing.baseUnit = quickAddProduct.unit;
          ing.unit = quickAddProduct.unit;
          ing.weightPerUnit = quickAddProduct.weightPerUnit;
          ing.allergens = quickAddProduct.allergens;
          ing.cost = calculateIngredientCost(ing.quantity, ing.unit, ing.pricePerUnit, ing.baseUnit, ing.weightPerUnit);
        }
      });
    });
    
    setSubRecipes(newSubs);
    setQuickAddProduct(null);
  };

  const selectProduct = (subIdx: number, ingIdx: number, product: Product) => {
    const newSubs = [...subRecipes];
    const currentIng = newSubs[subIdx].ingredients[ingIdx];
    const qtyNum = parseFloat(currentIng.quantity.replace(',', '.'));
    
    // Si el ingrediente ya tiene una unidad definida por el usuario (distinta a la inicial vacía o estándar)
    // o si simplemente queremos priorizar la unidad que ya está escrita en el campo.
    // Solo sobreescribimos si la unidad actual es la por defecto (kg) y el producto trae otra.
    const isDefaultUnit = currentIng.unit === 'kg' || currentIng.unit === '';
    const finalUnit = !isDefaultUnit ? currentIng.unit : product.unit;

    newSubs[subIdx].ingredients[ingIdx] = {
      ...currentIng,
      name: product.name,
      category: product.category,
      allergens: product.allergens || [],
      unit: finalUnit,
      pricePerUnit: product.pricePerUnit,
      weightPerUnit: product.weightPerUnit,
      baseUnit: product.unit,
      cost: calculateIngredientCost(currentIng.quantity, finalUnit, product.pricePerUnit, product.unit, product.weightPerUnit)
    };
    setSubRecipes(newSubs);
    setSuggestions(null);
  };

  const toggleTargetAllergen = (allergen: Allergen) => {
    if (!editingAllergenTarget) return;

    if (editingAllergenTarget === 'global') {
      const current = [...extraAllergens];
      const updated = current.includes(allergen) ? current.filter(a => a !== allergen) : [...current, allergen];
      setExtraAllergens(updated);
    } else {
      const { subIdx, ingIdx } = editingAllergenTarget;
      const newSubs = [...subRecipes];
      const current = [...newSubs[subIdx].ingredients[ingIdx].allergens];
      const updated = current.includes(allergen) ? current.filter(a => a !== allergen) : [...current, allergen];
      newSubs[subIdx].ingredients[ingIdx].allergens = updated;
      setSubRecipes(newSubs);
    }
  };

  const removeSubRecipePhoto = (subIdx: number, photoIdx: number) => {
    const newSubs = [...subRecipes];
    newSubs[subIdx].photos = newSubs[subIdx].photos.filter((_, i) => i !== photoIdx);
    setSubRecipes(newSubs);
  };

  const handleAddSubRecipePhotos = (e: React.ChangeEvent<HTMLInputElement>, subIdx: number) => {
    const files = e.target.files;
    if (!files) return;
    processFiles(Array.from(files), subIdx);
  };

  const processFiles = async (files: File[], subIdx: number) => {
    const newSubs = [...subRecipes];
    try {
      const results = await Promise.all(files.map(file => compressImage(file)));
      newSubs[subIdx].photos = [...(newSubs[subIdx].photos || []), ...results];
      setSubRecipes(newSubs);
    } catch (error) {
      console.error("Error compressing images:", error);
      alert("Hubo un error al procesar las imágenes.");
    }
  };

  const handlePasteSubRecipePhotos = (e: React.ClipboardEvent, subIdx: number) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      processFiles(files, subIdx);
    }
  };

  const handlePasteMainPhoto = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          try {
            const compressed = await compressImage(file);
            setPhoto(compressed);
          } catch (error) {
            console.error("Error compressing image:", error);
          }
          break;
        }
      }
    }
  };

  const handleSave = async () => {
    const totalCost = subRecipes.reduce((acc, sub) => acc + sub.ingredients.reduce((sAcc, ing) => sAcc + (ing.cost || 0), 0), 0);
    try {
      await onSave({
        id: initialRecipe?.id || Date.now().toString(),
        name, 
        categories: categories.length > 0 ? categories : (settings.categories?.[0] ? [settings.categories[0]] : ['Otros']),
        category: categories[0] || settings.categories?.[0] || 'Otros',
        photo, creator, sourceUrl, isPublic,
        yieldQuantity: yieldQuantity || 1,
        yieldUnit, totalCost: totalCost || 0,
        subRecipes: JSON.parse(JSON.stringify(subRecipes)), // Deep copy to ensure state is captured
        platingInstructions, serviceDetails,
        extraAllergens,
        lastModified: Date.now()
      } as any); // Type assertion to bypass workspaceId which is added in App.tsx
      alert(`Ficha técnica "${name}" guardada correctamente.`);
    } catch (error: any) {
      console.error("Error saving recipe:", error);
      let errorMsg = "Es posible que el tamaño de las imágenes sea demasiado grande o haya un problema de conexión.";
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.error) errorMsg = parsed.error;
      } catch (e) {
        if (error.message) errorMsg = error.message;
      }
      
      // Check approximate payload size
      const payloadSize = JSON.stringify(subRecipes).length;
      if (payloadSize > 800000) {
        errorMsg = "El tamaño de las imágenes es demasiado grande para la base de datos. Por favor, elimina algunas fotos o usa imágenes más pequeñas.";
      }

      alert(`Hubo un error al guardar la ficha técnica.\n\nDetalle: ${errorMsg}`);
    }
  };

  const selectedServiceType = SERVICE_TYPES.find(s => s.name === serviceDetails.serviceType);

  return (
    <div className="bg-slate-100 min-h-screen pb-20 font-sans relative">
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 px-8 py-4 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button type="button" onClick={onCancel} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={24} /></button>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
            <Book className="text-amber-500" /> {initialRecipe ? 'Editar Ficha' : 'Nueva Ficha Técnica'}
          </h2>
        </div>
        <button onClick={handleSave} className="px-8 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 flex items-center gap-2 shadow-xl font-black uppercase text-xs tracking-widest transition-all">
          <Save size={18} /> Guardar Ficha
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-3">
             <div 
               className="relative aspect-square bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden cursor-pointer shadow-inner group transition-all focus:ring-2 focus:ring-amber-500 outline-none"
               onPaste={handlePasteMainPhoto}
               tabIndex={0}
             >
                {photo ? <img src={photo} className="w-full h-full object-cover" alt="" /> : <div className="text-center"><ImageIcon size={48} className="text-slate-200 mx-auto" /><p className="text-[10px] font-black uppercase text-slate-300 mt-2">Portada Plato</p><p className="text-[8px] text-slate-300 mt-1 font-bold">(Click o Pegar)</p></div>}
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <Camera className="text-white" size={32} />
                </div>
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      const compressed = await compressImage(file);
                      setPhoto(compressed);
                    } catch (error) {
                      console.error("Error compressing image:", error);
                    }
                  }
                }} />
             </div>
          </div>
          <div className="md:col-span-9 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Nombre del Plato</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-xl font-serif font-black uppercase focus:ring-2 focus:ring-slate-200 transition-all" placeholder="Nombre de la receta" />
              </div>
              <div className="md:col-span-12">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Categorías (Puedes seleccionar varias)</label>
                  <div className="flex gap-1">
                    {categories.map(cat => (
                      <CategoryStripe key={cat} category={cat} settings={settings} className="h-2 w-8 rounded-full border border-white shadow-sm" />
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 italic">
                  {settings.categories?.map(c => {
                    const isSelected = categories.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setCategories(categories.filter(x => x !== c));
                          } else {
                            setCategories([...categories, c]);
                          }
                        }}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                          isSelected 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md scale-105' 
                            : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-600'
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                  {(!settings.categories || settings.categories.length === 0) && (
                    <p className="text-[10px] text-slate-400">No hay categorías configuradas</p>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 shadow-inner">
                  <label className="block text-[10px] font-black text-amber-700 uppercase mb-2 flex items-center gap-2">
                    <Users size={12}/> Rendimiento (PAX)
                  </label>
                  <input type="number" value={yieldQuantity} onChange={e => setYieldQuantity(Number(e.target.value) || 0)} className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl font-black text-amber-900 outline-none focus:ring-2 focus:ring-amber-500 transition-all" />
               </div>
               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Unidad de Medida</label>
                  <input type="text" value={yieldUnit} onChange={e => setYieldUnit(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 transition-all" placeholder="Ej: raciones, pax, ud..." />
               </div>
               <div className="p-4">
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Responsable / Creador</label>
                  <input type="text" value={creator} onChange={e => setCreator(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-black" />
               </div>
               <div className="p-4">
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Comunidad</label>
                  <button 
                    type="button" 
                    onClick={() => setIsPublic(!isPublic)}
                    className={`w-full px-4 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${isPublic ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-200' : 'bg-slate-50 text-slate-400 border-2 border-slate-100 hover:bg-slate-100'}`}
                  >
                    {isPublic ? 'Pública (Visible para todos)' : 'Privada (Solo mi equipo)'}
                  </button>
               </div>
               <div className="p-4">
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Enlace de Origen (URL)</label>
                  <input type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-black text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 transition-all" placeholder="https://..." />
               </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
           <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {subRecipes.map((sub, idx) => (
                <button key={idx} type="button" onClick={() => setActiveTab(idx)} className={`px-6 py-3 rounded-2xl text-xs font-black whitespace-nowrap transition-all border-2 ${activeTab === idx ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105' : 'bg-white text-slate-400 border-white hover:border-slate-100'}`}>
                  {idx + 1}. {sub.name}
                </button>
              ))}
              <button onClick={() => setSubRecipes([...subRecipes, { id: Date.now().toString(), name: 'Nueva Elaboración', ingredients: [], instructions: '', photos: [] }])} className="p-3 bg-white text-slate-400 rounded-2xl border border-dashed border-slate-200 hover:text-slate-900 hover:border-slate-400 transition-all"><Plus size={18}/></button>
           </div>

           {subRecipes[activeTab] && (
             <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 shadow-sm space-y-6 overflow-visible">
                <div className="flex justify-between items-center border-b pb-4">
                  <div className="flex items-center gap-3 w-full max-w-md">
                    <Database className="text-slate-300" size={20} />
                    <input type="text" value={subRecipes[activeTab].name} onChange={e => {
                      const n = [...subRecipes]; n[activeTab].name = e.target.value; setSubRecipes(n);
                    }} className="text-xl font-black uppercase tracking-tight outline-none w-full focus:ring-b-2 focus:ring-slate-900" placeholder="Nombre de la elaboración" />
                  </div>
                  <button onClick={() => { if(confirm('¿Eliminar esta elaboración?')){ const n = subRecipes.filter((_,i)=>i!==activeTab); setSubRecipes(n); setActiveTab(0); }}} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={20}/></button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 overflow-visible">
                   <div className="lg:col-span-12 space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                         <span>Escandallo de Ingredientes</span>
                         <button onClick={() => {
                           const n = [...subRecipes]; n[activeTab].ingredients.push({ id: Math.random().toString(), name: '', quantity: '', unit: 'kg', allergens: [] }); setSubRecipes(n);
                         }} className="text-indigo-600 flex items-center gap-1 font-black hover:text-indigo-800 transition-colors"><Plus size={14}/> Añadir Ingrediente</button>
                      </div>
                      <div className="space-y-2">
                        {subRecipes[activeTab].ingredients.map((ing, iIdx) => {
                          const exactMatch = ing.name && productDatabase.some(p => p.name.toUpperCase() === ing.name.toUpperCase());
                          return (
                            <div key={ing.id} className="grid grid-cols-12 gap-2 relative group items-center">
                               <div className="col-span-5 relative">
                                  <input 
                                    type="text" 
                                    value={ing.name} 
                                    onChange={e => updateIngredient(activeTab, iIdx, 'name', e.target.value)} 
                                    className={`w-full px-4 py-3 text-xs font-black rounded-xl outline-none uppercase placeholder:opacity-30 border transition-all ${ing.name && !exactMatch ? 'bg-amber-50 border-amber-200 ring-2 ring-amber-100' : 'bg-slate-50 border-transparent focus:bg-white focus:border-slate-200'}`} 
                                    placeholder="Nombre del ingrediente..." 
                                  />
                                  {ing.name && !exactMatch && (
                                    <button 
                                      type="button"
                                      onClick={() => handleOpenQuickAdd(ing.name)}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all shadow-md flex items-center gap-1"
                                    >
                                      <DatabaseZap size={14} />
                                      <span className="text-[8px] font-black uppercase">Alta</span>
                                    </button>
                                  )}
                                  
                                  {suggestions && suggestions.idx === iIdx && (
                                    <div className="absolute z-[100] left-0 right-0 top-full mt-1 bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                                       {suggestions.list.map(p => (
                                         <div key={p.id} onClick={() => selectProduct(activeTab, iIdx, p)} className="px-5 py-4 hover:bg-indigo-50 cursor-pointer text-[10px] font-black uppercase flex justify-between border-b border-slate-50 last:border-0 transition-colors">
                                            <span>{p.name}</span>
                                            <span className="text-slate-300">{p.category}</span>
                                         </div>
                                       ))}
                                       <div onClick={() => handleOpenQuickAdd(ing.name)} className="px-5 py-4 bg-amber-50 hover:bg-amber-100 cursor-pointer text-[10px] font-black uppercase flex items-center gap-3 text-amber-700 transition-colors border-t border-amber-100">
                                          <DatabaseZap size={16} />
                                          <span>Añadir "{ing.name}" como nuevo producto...</span>
                                       </div>
                                    </div>
                                  )}
                               </div>
                               <input type="text" value={ing.quantity} onChange={e => updateIngredient(activeTab, iIdx, 'quantity', e.target.value)} className="col-span-2 text-right px-1.5 py-3 bg-white border border-slate-100 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-slate-900 transition-all" placeholder="0.00" />
                               <input 
                                 type="text" 
                                 value={ing.unit} 
                                 onChange={e => updateIngredient(activeTab, iIdx, 'unit', e.target.value)} 
                                 className="col-span-1 text-[9px] font-black text-slate-400 uppercase bg-transparent border-b border-transparent focus:border-slate-200 outline-none transition-all" 
                                 placeholder="ud"
                               />
                               <div className="col-span-1 flex justify-center items-center">
                                 <button 
                                   type="button" 
                                   onClick={() => setEditingAllergenTarget({ subIdx: activeTab, ingIdx: iIdx })}
                                   className={`p-1.5 rounded-lg border transition-all ${ing.allergens.length > 0 ? 'border-rose-200 bg-rose-50 text-rose-500 shadow-sm' : 'border-slate-100 text-slate-300 hover:border-slate-300'}`}
                                   title="Editar Alérgenos"
                                 >
                                   <AlertOctagon size={14} />
                                 </button>
                               </div>
                               <span className="col-span-2 text-right font-mono font-black text-indigo-600 text-xs flex items-center justify-end">{ing.cost?.toFixed(2).replace('.', ',')}€</span>
                               <button onClick={() => { const n = [...subRecipes]; n[activeTab].ingredients.splice(iIdx, 1); setSubRecipes(n); }} className="col-span-1 text-slate-200 hover:text-red-500 flex justify-center items-center transition-colors"><Trash2 size={16}/></button>
                            </div>
                          );
                        })}
                      </div>
                   </div>

                   <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
                      <div className="lg:col-span-7 pt-6 border-t border-slate-100">
                         <label className="block text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2"><Utensils size={14}/> Procedimiento de Cocina</label>
                         <textarea value={subRecipes[activeTab].instructions} onChange={e => {
                           const n = [...subRecipes]; n[activeTab].instructions = e.target.value; setSubRecipes(n);
                         }} onBlur={(e) => {
                           const formatted = e.target.value.replace(/(\d+\.\s)/g, '\n$1').trim();
                           const n = [...subRecipes]; n[activeTab].instructions = formatted; setSubRecipes(n);
                         }} className="w-full p-8 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm min-h-[220px] leading-relaxed font-medium outline-none focus:ring-2 focus:ring-slate-900 transition-all font-serif" placeholder="Describe paso a paso los procesos técnicos de esta elaboración... (Ej: 1. Paso uno. 2. Paso dos.)" />
                      </div>
                      <div className="lg:col-span-5 pt-6 border-t border-slate-100 space-y-4">
                         <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Galería de Imágenes Técnicas</label>
                         <div className="grid grid-cols-2 gap-3">
                           {(subRecipes[activeTab].photos || []).map((photoSrc, pIdx) => (
                              <div key={pIdx} className="relative aspect-square rounded-2xl overflow-hidden shadow-md group border border-slate-100">
                                 <img src={photoSrc} className="w-full h-full object-cover" alt="" />
                                 <button onClick={() => removeSubRecipePhoto(activeTab, pIdx)} className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                                   <Trash2 size={12} />
                                 </button>
                              </div>
                           ))}
                           <div 
                             className="relative aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-indigo-400 transition-colors group shadow-inner focus:ring-2 focus:ring-indigo-500 outline-none"
                             onPaste={(e) => handlePasteSubRecipePhotos(e, activeTab)}
                             tabIndex={0}
                           >
                              <div className="text-center">
                                 <Camera className="text-slate-200 mx-auto transition-transform group-hover:scale-110" size={32} />
                                 <p className="text-[8px] font-black text-slate-300 mt-1 uppercase tracking-widest">Añadir Foto</p>
                                 <p className="text-[7px] text-slate-300 font-bold">(Click o Pegar)</p>
                              </div>
                              <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleAddSubRecipePhotos(e, activeTab)} />
                           </div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
           )}
        </div>

        <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-800 overflow-hidden text-white p-8 space-y-8 relative">
           <div className="absolute top-0 right-0 p-10 opacity-5"><ChefHat size={120}/></div>
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                 <h3 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                    <MessageSquare size={32} className="text-amber-500" /> Ficha de Servicio (Sala)
                 </h3>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Protocolos de pase, servicio y atención al cliente</p>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-8">
                 <div className="group">
                    <label className="block text-[10px] font-black text-amber-500 uppercase mb-3 tracking-widest flex items-center gap-2">
                      <Info size={14}/> Explicación Sugerente del Plato
                    </label>
                    <textarea value={serviceDetails.clientDescription} onChange={e => setServiceDetails({...serviceDetails, clientDescription: e.target.value})} className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl p-5 text-sm min-h-[120px] outline-none italic placeholder:text-slate-600 focus:border-amber-500 transition-all text-slate-200 font-serif" placeholder="Describe cómo se le debe presentar el plato al cliente..." />
                 </div>
                 <div className="group">
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-4 tracking-widest">Protocolo de Servicio</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                       {SERVICE_TYPES.map(s => (
                         <button key={s.id} type="button" onClick={() => setServiceDetails({...serviceDetails, serviceType: s.name})} className={`px-3 py-3 text-[9px] font-black rounded-xl border transition-all uppercase flex flex-col items-center gap-1 ${serviceDetails.serviceType === s.name ? 'bg-amber-500 border-amber-500 text-slate-900 shadow-lg scale-105' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                           {s.name.replace('Servicio a la ', '').replace('Servicio de ', '')}
                         </button>
                       ))}
                    </div>
                    {selectedServiceType && (
                       <div className="mb-4 bg-slate-800/50 border border-amber-500/20 p-4 rounded-xl animate-fadeIn">
                          <p className="text-[10px] font-black text-amber-500 uppercase flex items-center gap-2 mb-1">
                             <HelpCircle size={10} /> Definición del Protocolo
                          </p>
                          <p className="text-[11px] text-slate-400 font-serif italic leading-relaxed">
                             {selectedServiceType.desc}
                          </p>
                       </div>
                    )}
                    <input type="text" value={serviceDetails.serviceType} onChange={e => setServiceDetails({...serviceDetails, serviceType: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-amber-500 font-black uppercase" />
                 </div>
              </div>

              <div className="space-y-8">
                 <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest flex items-center gap-2">
                       <Thermometer size={14}/> Temperatura de Pase
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {TEMP_QUICK_OPTIONS.map(opt => (
                          <button 
                            key={opt.label} 
                            type="button" 
                            onClick={() => setServiceDetails({...serviceDetails, servingTemp: opt.value})}
                            className={`px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all border ${serviceDetails.servingTemp === opt.value ? 'bg-amber-500 border-amber-500 text-slate-900 shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                     </div>
                     <input type="text" value={serviceDetails.servingTemp} onChange={e => setServiceDetails({...serviceDetails, servingTemp: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 text-sm font-black text-amber-500 outline-none focus:ring-2 focus:ring-amber-500 uppercase" placeholder="Ej: 60-65 ºC" />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest flex items-center gap-2">
                       <Utensils size={14}/> Marcaje y Cubertería
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                       {CUTLERY_QUICK_OPTIONS.map(opt => (
                         <button 
                           key={opt.label} 
                           type="button" 
                           onClick={() => setServiceDetails({...serviceDetails, cutlery: opt.value})}
                           className={`px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all border ${serviceDetails.cutlery === opt.value ? 'bg-amber-500 border-amber-500 text-slate-900 shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                         >
                           {opt.label}
                         </button>
                       ))}
                    </div>
                    <textarea value={serviceDetails.cutlery} onChange={e => setServiceDetails({...serviceDetails, cutlery: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-5 text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-amber-500 font-bold uppercase placeholder:text-slate-600" placeholder="Ej: TENEDOR TRINCHERO + CUCHILLO..." />
                 </div>
              </div>
           </div>
           <div className="pt-10 border-t border-white/5">
              <div className="flex justify-between items-center mb-4">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Instrucciones de Emplatado y Acabado Final</label>
                <button 
                  type="button" 
                  onClick={() => setEditingAllergenTarget('global')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${extraAllergens.length > 0 ? 'bg-rose-500 border-rose-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                >
                  <AlertOctagon size={14} />
                  <span>Alérgenos Extra ({extraAllergens.length})</span>
                </button>
              </div>
              <textarea value={platingInstructions} onChange={e => setPlatingInstructions(e.target.value)} className="w-full bg-slate-900 border-2 border-dashed border-slate-700 rounded-[2rem] p-8 text-sm min-h-[150px] outline-none focus:border-amber-500 transition-colors font-serif" placeholder="Describe el paso final antes del pase..." />
           </div>
        </div>
      </div>

      {quickAddProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111322]/90 backdrop-blur-md p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] max-w-[540px] w-full overflow-visible border border-white/10 my-8">
            <div className="bg-[#111322] text-white px-10 py-10 flex justify-between items-center rounded-t-[2.5rem]">
              <h2 className="text-[26px] font-black uppercase tracking-tight">Añadir Género</h2>
              <button onClick={() => setQuickAddProduct(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={32} />
              </button>
            </div>
            
            <form onSubmit={handleSaveQuickProduct} className="p-10 space-y-9 overflow-visible">
              <div className="relative">
                <label className="block text-[10px] font-black text-[#94A3B8] uppercase mb-2 tracking-[0.1em]">Familia / Categoría de Pedido</label>
                <div className="relative">
                  <input 
                    required type="text" value={familySearch} 
                    onFocus={() => setShowFamilyList(true)}
                    onBlur={() => setTimeout(() => setShowFamilyList(false), 200)}
                    onChange={e => { setFamilySearch(e.target.value.toUpperCase()); setShowFamilyList(true); }} 
                    className="w-full px-7 py-5 bg-[#F8FAFC] border-none rounded-2xl font-black uppercase outline-none focus:ring-2 focus:ring-slate-100 text-slate-700 text-lg shadow-sm" 
                    placeholder="BUSCAR O CREAR FAMILIA..." 
                  />
                  <ChevronDown className={`absolute right-7 top-1/2 -translate-y-1/2 text-slate-300 transition-transform ${showFamilyList ? 'rotate-180' : ''}`} size={20} />
                </div>
                {showFamilyList && (
                  <div className="absolute z-[110] left-0 right-0 top-full mt-2 bg-white border border-slate-100 shadow-2xl rounded-2xl overflow-hidden max-h-48 overflow-y-auto animate-fadeIn custom-scrollbar">
                    {filteredFamilies.length > 0 ? (
                      filteredFamilies.map(f => (
                        <div key={f} onClick={() => { setFamilySearch(f); setShowFamilyList(false); }} className="px-6 py-4 hover:bg-slate-50 cursor-pointer text-[10px] font-black uppercase text-slate-600 border-b border-slate-50 last:border-0 flex justify-between items-center">
                          <span>{f}</span>
                          <CheckCircle2 size={12} className="text-slate-200" />
                        </div>
                      ))
                    ) : (
                      <div className="px-6 py-4 text-[10px] font-black text-amber-500 uppercase bg-amber-50">Crear familia: "{familySearch}"</div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-[#94A3B8] uppercase mb-2 tracking-[0.1em]">Nombre del Producto</label>
                <input required type="text" value={quickAddProduct.name} onChange={e => setQuickAddProduct({...quickAddProduct, name: e.target.value.toUpperCase()})} className="w-full px-7 py-5 bg-[#F8FAFC] border-none rounded-2xl font-black uppercase outline-none focus:ring-2 focus:ring-slate-100 text-slate-700 text-lg shadow-sm" placeholder="EJ: SOLOMILLO DE TERNERA" />
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] font-black text-[#94A3B8] uppercase mb-2 tracking-[0.1em]">Precio Mercado €</label>
                  <div className="relative">
                    <input 
                      required 
                      type="text" 
                      value={quickAddProduct.pricePerUnit} 
                      onChange={e => {
                        const val = e.target.value;
                        // Permitir números, comas y puntos
                        if (/^[0-9.,]*$/.test(val)) {
                          setQuickAddProduct({...quickAddProduct, pricePerUnit: val as any});
                        }
                      }} 
                      onBlur={e => {
                        const val = e.target.value;
                        let s = val.replace(',', '.');
                        const num = parseFloat(s) || 0;
                        setQuickAddProduct({...quickAddProduct, pricePerUnit: num});
                      }}
                      className="w-full px-7 py-5 bg-[#F8FAFC] border-none rounded-2xl font-black outline-none focus:ring-2 focus:ring-slate-100 text-slate-700 text-lg shadow-sm" 
                    />
                    <span className="absolute right-7 top-1/2 -translate-y-1/2 text-[#CBD5E1] font-bold text-xl">€</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-[#94A3B8] uppercase mb-2 tracking-[0.1em]">Unidad</label>
                  <div className="relative">
                    <select value={quickAddProduct.unit} onChange={e => setQuickAddProduct({...quickAddProduct, unit: e.target.value})} className="w-full px-7 py-5 bg-[#F8FAFC] border-none rounded-2xl font-black outline-none appearance-none cursor-pointer text-slate-700 text-lg shadow-sm">
                      <option value="kg">kg</option>
                      <option value="L">L</option>
                      <option value="ud">ud</option>
                      <option value="unidad">unidad</option>
                      <option value="g">g</option>
                      <option value="ml">ml</option>
                    </select>
                    <ChevronDown className="absolute right-7 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                  </div>
                </div>
              </div>

              {(quickAddProduct.unit === 'ud' || quickAddProduct.unit === 'unidad') && (
                <div className="animate-fadeIn">
                  <label className="block text-[10px] font-black text-amber-600 uppercase mb-2 tracking-[0.1em]">Peso por Unidad (gramos)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={quickAddProduct.weightPerUnit || ''} 
                      onChange={e => setQuickAddProduct({...quickAddProduct, weightPerUnit: parseFloat(e.target.value) || undefined})} 
                      className="w-full px-7 py-5 bg-amber-50 border-none rounded-2xl font-black outline-none focus:ring-2 focus:ring-amber-200 text-amber-900 text-lg shadow-sm" 
                      placeholder="Ej: 60" 
                    />
                    <span className="absolute right-7 top-1/2 -translate-y-1/2 text-amber-300 font-bold text-xl">g</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-[#94A3B8] uppercase mb-5 tracking-[0.1em]">Alérgenos Declarados (Nombre Completo)</label>
                <div className="grid grid-cols-2 gap-3 bg-[#F8FAFC] p-7 rounded-[2.5rem] border border-slate-50 max-h-60 overflow-y-auto custom-scrollbar shadow-inner">
                  {ALLERGEN_LIST.map(a => {
                    const isSel = quickAddProduct.allergens.includes(a);
                    return (
                      <button key={a} type="button" onClick={() => {
                          const current = quickAddProduct.allergens;
                          const updated = isSel ? current.filter(x => x !== a) : [...current, a];
                          setQuickAddProduct({...quickAddProduct, allergens: updated});
                        }} className={`py-3 px-4 rounded-xl text-[9px] font-black border-2 transition-all uppercase flex items-center gap-3 text-center leading-tight ${isSel ? 'bg-white border-[#111322] text-[#111322] shadow-md scale-105' : 'bg-white border-transparent text-[#CBD5E1] hover:text-slate-500 hover:border-slate-100'}`}>
                        <div className={isSel ? 'opacity-100' : 'opacity-30 grayscale'}>
                          <AllergenIcon allergen={a} size={20} />
                        </div>
                        <span>{a}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-6">
                <button type="submit" className="w-full py-6 bg-[#111322] text-white rounded-[1.25rem] font-black uppercase text-base tracking-[0.2em] shadow-2xl hover:bg-slate-800 transition-all active:scale-[0.98] transform">
                  Guardar en Catálogo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingAllergenTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-[540px] w-full overflow-hidden border border-white/10">
            <div className="bg-slate-900 text-white px-10 py-8 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight">Editar Alérgenos</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                  {editingAllergenTarget === 'global' 
                    ? 'Alérgenos extra de la ficha' 
                    : `Ingrediente: ${subRecipes[editingAllergenTarget.subIdx].ingredients[editingAllergenTarget.ingIdx].name}`}
                </p>
              </div>
              <button onClick={() => setEditingAllergenTarget(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={32} />
              </button>
            </div>
            
            <div className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {ALLERGEN_LIST.map(a => {
                  const isSel = editingAllergenTarget === 'global' 
                    ? extraAllergens.includes(a)
                    : subRecipes[editingAllergenTarget.subIdx].ingredients[editingAllergenTarget.ingIdx].allergens.includes(a);
                  
                  return (
                    <button 
                      key={a} 
                      type="button" 
                      onClick={() => toggleTargetAllergen(a)} 
                      className={`py-4 px-5 rounded-2xl text-[10px] font-black border-2 transition-all uppercase flex items-center gap-4 text-left leading-tight ${isSel ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-md' : 'bg-slate-50 border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'}`}
                    >
                      <div className={isSel ? 'opacity-100' : 'opacity-30 grayscale'}>
                        <AllergenIcon allergen={a} size={24} />
                      </div>
                      <span>{a}</span>
                    </button>
                  );
                })}
              </div>
              
              <button 
                onClick={() => setEditingAllergenTarget(null)} 
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl hover:bg-slate-800 transition-all"
              >
                Finalizar Selección
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
