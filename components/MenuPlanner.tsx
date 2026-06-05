
import React, { useState, useMemo, useEffect } from 'react';
import { Recipe, AppSettings, ALLERGEN_LIST, Allergen, Product, MenuPlan, AppUser } from '../types';
import { calculateIngredientCost } from '../lib/costUtils';
import { formatScaledQuantity, convertToBase } from '../lib/unitUtils';
import { CategoryStripe } from './CategoryStripe';
import { Plus, Trash2, ArrowLeft, Printer, Search, ArrowUp, ArrowDown, Calendar, FileText, Utensils, AlertOctagon, Users, ShoppingCart, BookOpen, ChevronRight, ChefHat, Info, Thermometer, User, DollarSign, Save, History, Clock, CheckCircle2, UtensilsCrossed } from 'lucide-react';

const ALLERGEN_CONFIG: Record<Allergen, { color: string, short: string, icon: string }> = {
  'Gluten': { color: 'bg-yellow-100 text-yellow-800', short: 'GLU', icon: '🌾' },
  'Crustáceos': { color: 'bg-red-100 text-red-800', short: 'CRU', icon: '🦀' },
  'Huevos': { color: 'bg-orange-100 text-orange-800', short: 'HUE', icon: '🥚' },
  'Pescado': { color: 'bg-blue-100 text-blue-800', short: 'PES', icon: '🐟' },
  'Cacahuetes': { color: 'bg-amber-100 text-amber-800', short: 'CAC', icon: '🥜' },
  'Soja': { color: 'bg-purple-100 text-purple-800', short: 'SOJA', icon: '🌱' },
  'Lácteos': { color: 'bg-sky-100 text-sky-800', short: 'LAC', icon: '🥛' },
  'Frutos de cáscara': { color: 'bg-emerald-100 text-emerald-800', short: 'FRA', icon: '🌰' },
  'Apio': { color: 'bg-green-100 text-green-800', short: 'API', icon: '🥬' },
  'Mostaza': { color: 'bg-yellow-200 text-yellow-900', short: 'MUS', icon: '🌭' },
  'Sésamo': { color: 'bg-stone-100 text-stone-800', short: 'SES', icon: '🥯' },
  'Sulfitos': { color: 'bg-gray-200 text-gray-800', short: 'SUL', icon: '🍷' },
  'Altramuces': { color: 'bg-pink-100 text-pink-800', short: 'ALT', icon: '🏵️' },
  'Moluscos': { color: 'bg-indigo-100 text-indigo-800', short: 'MOL', icon: '🐙' }
};

interface MenuPlannerProps {
  recipes: Recipe[];
  settings: AppSettings;
  appUser: AppUser | null;
  onBack: () => void;
  productDatabase: Product[];
  savedMenus: MenuPlan[];
  onSaveMenu: (menu: MenuPlan) => Promise<void> | void;
  onDeleteMenu: (id: string) => void;
  onUpdateRecipe: (recipe: Recipe) => Promise<void> | void;
}

export const MenuPlanner: React.FC<MenuPlannerProps> = ({ 
  recipes, settings, appUser, onBack, productDatabase, savedMenus, onSaveMenu, onDeleteMenu, onUpdateRecipe 
}) => {
  const [activeTab, setActiveTab] = useState<'planning' | 'service_order' | 'allergen_matrix' | 'purchase_order' | 'kitchen_fichas' | 'history'>('planning');
  const [currentMenuId, setCurrentMenuId] = useState<string | null>(null);
  const [menuTitle, setMenuTitle] = useState('MENÚ DEL DÍA');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [menuPax, setMenuPax] = useState<number>(30);
  const [selectedRecipes, setSelectedRecipes] = useState<Recipe[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    if (activeTab === 'kitchen_fichas') {
      const originalTitle = document.title;
      document.title = menuTitle;
      return () => {
        document.title = originalTitle;
      };
    }
  }, [activeTab, menuTitle]);

  const filteredRecipes = recipes.filter(r => 
    !selectedRecipes.find(sr => sr.id === r.id) &&
    (r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const menuEconomics = useMemo(() => {
    let totalCost = 0;
    selectedRecipes.forEach(recipe => {
      const costPerPortion = (recipe.totalCost || 0) / (recipe.yieldQuantity || 1);
      totalCost += costPerPortion * menuPax;
    });
    return {
      total: totalCost,
      perPax: selectedRecipes.length > 0 ? totalCost / menuPax : 0
    };
  }, [selectedRecipes, menuPax]);

  const purchaseOrderData = useMemo(() => {
    const families: Record<string, Record<string, { name: string, baseQuantity: number, unit: string, cost: number }>> = {};
    selectedRecipes.forEach(recipe => {
      const ratio = menuPax / recipe.yieldQuantity;
      recipe.subRecipes.forEach(sub => {
        sub.ingredients.forEach(ing => {
          const product = productDatabase.find(p => p.name === ing.name);
          const family = product?.category || 'OTROS';
          const qtyNum = parseFloat(ing.quantity.replace(',', '.'));
          const finalQty = isNaN(qtyNum) ? 0 : qtyNum * ratio;
          const finalCost = calculateIngredientCost(finalQty, ing.unit, ing.pricePerUnit, ing.baseUnit, ing.weightPerUnit);
          
          const baseQty = convertToBase(finalQty, ing.unit);
          const targetUnit = product?.unit || ing.unit;

          if (!families[family]) families[family] = {};
          if (!families[family][ing.name]) {
            families[family][ing.name] = { name: ing.name, baseQuantity: baseQty, unit: targetUnit, cost: finalCost };
          } else {
            families[family][ing.name].baseQuantity += baseQty;
            families[family][ing.name].cost += finalCost;
          }
        });
      });
    });
    return Object.entries(families).sort(([a], [b]) => a.localeCompare(b));
  }, [selectedRecipes, menuPax, productDatabase]);

  const handleSavePlan = async (asNew: boolean = false) => {
    if (selectedRecipes.length === 0) return;
    setSaveStatus('saving');
    const newId = (asNew || !currentMenuId) ? `menu_${Date.now()}` : currentMenuId;
    const plan: MenuPlan = {
      id: newId,
      title: menuTitle,
      date: eventDate,
      pax: menuPax,
      recipeIds: selectedRecipes.map(r => r.id),
      lastModified: Date.now(),
      workspaceId: appUser?.workspaceId || ''
    };
    
    try {
      await onSaveMenu(plan);
      
      // Save any modifications made to the recipes' service details
      await Promise.all(selectedRecipes.map(recipe => onUpdateRecipe(recipe)));

      if (asNew || !currentMenuId) setCurrentMenuId(newId);
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error("Error saving menu plan:", error);
      setSaveStatus('idle');
      alert("Hubo un error al guardar el menú.");
    }
  };

  const handleLoadPlan = (plan: MenuPlan) => {
    setMenuTitle(plan.title);
    setEventDate(plan.date);
    setMenuPax(plan.pax);
    setCurrentMenuId(plan.id);
    
    const matchedRecipes = plan.recipeIds
      .map(id => recipes.find(r => r.id === id))
      .filter(r => !!r) as Recipe[];
    
    setSelectedRecipes(matchedRecipes);
    setActiveTab('planning');
  };

  const handleReset = () => {
    if (confirm("¿Limpiar planificación actual?")) {
      setSelectedRecipes([]);
      setMenuTitle('MENÚ DEL DÍA');
      setCurrentMenuId(null);
      setMenuPax(30);
    }
  };

  const addToMenu = (recipe: Recipe) => setSelectedRecipes([...selectedRecipes, JSON.parse(JSON.stringify(recipe))]);
  const removeFromMenu = (index: number) => {
    const newMenu = [...selectedRecipes];
    newMenu.splice(index, 1);
    setSelectedRecipes(newMenu);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newMenu = [...selectedRecipes];
    const item = newMenu[index];
    newMenu.splice(index, 1);
    newMenu.splice(direction === 'up' ? index - 1 : index + 1, 0, item);
    setSelectedRecipes(newMenu);
  };

  const updateServiceOrder = (index: number, field: string, value: string) => {
    const newMenu = [...selectedRecipes];
    if (!newMenu[index].serviceDetails) {
      newMenu[index].serviceDetails = { presentation: '', servingTemp: '', cutlery: '', passTime: '', serviceType: '', clientDescription: '' };
    }
    newMenu[index].serviceDetails = { ...newMenu[index].serviceDetails, [field]: value };
    setSelectedRecipes(newMenu);
  };

  const getRecipeAllergens = (r: Recipe): Allergen[] => {
    const set = new Set<Allergen>();
    r.subRecipes.forEach(sub => sub.ingredients.forEach(ing => ing.allergens.forEach(a => set.add(a))));
    r.extraAllergens?.forEach(a => set.add(a));
    return Array.from(set);
  };

  const getScaledData = (qtyStr: string, unit: string, recipeYield: number, baseUnit?: string): { quantity: string, unit: string } => {
    const num = parseFloat(qtyStr.replace(',', '.'));
    if (isNaN(num)) return { quantity: qtyStr, unit };
    const scaledNum = num * (menuPax / recipeYield);
    return formatScaledQuantity(scaledNum, unit, baseUnit);
  };

  const PrintHeader = ({ title, subtitle }: { title: string, subtitle: string }) => (
    <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-6">
       <div className="w-1/4">
          {settings.instituteLogo ? <img src={settings.instituteLogo} className="h-16 object-contain" alt="IES" /> : <span className="font-bold">{settings.instituteName}</span>}
       </div>
       <div className="w-2/4 text-center">
          <h1 className="text-2xl font-black uppercase mb-1 tracking-tighter">{title}</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest">{subtitle}</p>
       </div>
       <div className="w-1/4 text-right">
          <p className="text-xs font-black">{appUser?.teacherName || appUser?.displayName}</p>
          <p className="text-[10px] font-bold text-slate-500">{new Date().toLocaleDateString()}</p>
       </div>
    </div>
  );

  if (activeTab === 'history') {
    return (
      <div className="min-h-screen bg-gray-50 p-6 md:p-10">
        <div className="max-w-4xl mx-auto">
           <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                 <button onClick={() => setActiveTab('planning')} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-slate-600">
                    <ArrowLeft size={24} />
                 </button>
                 <div>
                    <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Histórico de Menús</h1>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Planificaciones Guardadas</p>
                 </div>
              </div>
              <button onClick={() => setActiveTab('planning')} className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">
                <Plus size={16}/> Nueva Planificación
              </button>
           </div>

           <div className="grid grid-cols-1 gap-4">
              {savedMenus.length === 0 ? (
                <div className="bg-white rounded-3xl p-20 text-center border border-dashed border-slate-300">
                   <Clock size={48} className="mx-auto text-slate-200 mb-4" />
                   <p className="font-bold uppercase tracking-widest text-[10px] text-slate-400">No hay menús guardados todavía</p>
                </div>
              ) : (
                savedMenus.map(plan => (
                  <div key={plan.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-center gap-6 hover:border-indigo-400 transition-all group shadow-sm">
                     <div className="flex items-center gap-5">
                        <div className="bg-slate-100 p-4 rounded-xl text-slate-400 group-hover:text-indigo-600 transition-colors">
                           <Calendar size={28} />
                        </div>
                        <div>
                           <h3 className="font-black text-slate-800 uppercase text-lg leading-none mb-2">{plan.title}</h3>
                           <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <span className="flex items-center gap-1"><Clock size={12}/> {plan.date}</span>
                              <span className="flex items-center gap-1"><Users size={12}/> {plan.pax} PAX</span>
                              <span className="bg-slate-50 px-2 py-0.5 rounded">{plan.recipeIds.length} PLATOS</span>
                           </div>
                        </div>
                     </div>
                     <div className="flex gap-2">
                        <button onClick={() => handleLoadPlan(plan)} className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest">
                           Cargar Menú
                        </button>
                        <button onClick={() => confirm(`¿Borrar el menú ${plan.title}?`) && onDeleteMenu(plan.id)} className="p-3 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                           <Trash2 size={20} />
                        </button>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'planning') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><ArrowLeft size={24} className="text-slate-600" /></button>
              <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Planificador de Menús</h1>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
               <button onClick={() => setActiveTab('history')} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold text-xs uppercase tracking-widest transition-all shadow-sm"><History size={16}/> Histórico</button>
               <button onClick={() => setActiveTab('kitchen_fichas')} disabled={selectedRecipes.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-slate-900 rounded-xl hover:bg-amber-600 disabled:opacity-50 font-bold text-xs uppercase tracking-widest transition-all shadow-md"><BookOpen size={16}/> Fichas Cocina</button>
               <button onClick={() => setActiveTab('purchase_order')} disabled={selectedRecipes.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 font-bold text-xs uppercase tracking-widest transition-all shadow-md"><ShoppingCart size={16}/> Pedido Familias</button>
               <button onClick={() => setActiveTab('service_order')} disabled={selectedRecipes.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-700 disabled:opacity-50 font-bold text-xs uppercase tracking-widest transition-all shadow-md"><FileText size={16}/> Orden Servicio</button>
               <button onClick={() => setActiveTab('allergen_matrix')} disabled={selectedRecipes.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50 font-bold text-xs uppercase tracking-widest transition-all shadow-md"><AlertOctagon size={16}/> Matriz Alérgenos</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 bg-white rounded-3xl shadow-sm border border-gray-200 flex flex-col overflow-hidden h-[75vh]">
               <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                 <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" placeholder="Filtrar catálogo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 shadow-inner font-bold text-sm" />
                 </div>
               </div>
               <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {filteredRecipes.map(recipe => (
                    <div key={recipe.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-transparent hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group">
                       <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden shadow-inner relative">
                            <CategoryStripe category={recipe.category} settings={settings} vertical={true} className="absolute left-0 top-0 bottom-0 w-1 z-10" />
                            {recipe.photo && <img src={recipe.photo} className="w-full h-full object-cover" alt="" />}
                          </div>
                          <div>
                             <h4 className="font-black text-slate-800 text-sm uppercase leading-none mb-1">{recipe.name}</h4>
                             <div className="flex items-center gap-2">
                               <div className="relative">
                                 <CategoryStripe category={recipe.category} settings={settings} className="absolute inset-0 rounded opacity-20" />
                                 <p className="relative text-[8px] text-slate-600 font-bold uppercase tracking-widest px-1.5 py-0.5 leading-none">{recipe.category}</p>
                               </div>
                             </div>
                          </div>
                       </div>
                       <button onClick={() => addToMenu(recipe)} className="p-3 bg-white text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><Plus size={20} /></button>
                    </div>
                  ))}
               </div>
            </div>

            <div className="lg:col-span-7 bg-white rounded-3xl shadow-xl border border-gray-100 flex flex-col overflow-hidden h-[75vh]">
               <div className="p-8 border-b border-indigo-50 bg-indigo-50/30">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg"><Utensils size={24}/></div>
                      <div>
                        <h3 className="font-black text-indigo-900 uppercase tracking-widest">Servicio Programado</h3>
                        <p className="text-xs text-indigo-400 font-bold uppercase">Gestión de volúmenes y costes</p>
                      </div>
                    </div>
                    {selectedRecipes.length > 0 && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleSavePlan()} 
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${saveStatus === 'saved' ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                        >
                          {saveStatus === 'saving' ? 'Guardando...' : saveStatus === 'saved' ? <><CheckCircle2 size={14}/> Guardado</> : <><Save size={14}/> Guardar</>}
                        </button>
                        <button onClick={handleReset} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Resetear"><Trash2 size={20}/></button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-indigo-700 uppercase mb-2 tracking-widest">Nombre del Menú / Evento</label>
                      <input type="text" value={menuTitle} onChange={e => setMenuTitle(e.target.value)} className="w-full px-5 py-3 border border-indigo-100 rounded-2xl text-sm font-black shadow-sm outline-none focus:ring-2 focus:ring-indigo-600" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-indigo-700 uppercase mb-2 tracking-widest">Fecha</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300" size={18} />
                        <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-indigo-100 rounded-2xl text-sm font-black shadow-sm outline-none focus:ring-2 focus:ring-indigo-600" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-indigo-700 uppercase mb-2 tracking-widest">Raciones (Pax)</label>
                      <div className="relative">
                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300" size={18} />
                        <input type="number" value={menuPax} onChange={e => setMenuPax(Math.max(1, Number(e.target.value)))} className="w-full pl-12 pr-4 py-3 border border-indigo-100 rounded-2xl text-sm font-black shadow-sm outline-none focus:ring-2 focus:ring-indigo-600" />
                      </div>
                    </div>
                  </div>
               </div>
               
               <div className="flex-grow overflow-y-auto p-6 space-y-4 bg-slate-50/30 custom-scrollbar">
                  {selectedRecipes.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-3xl">
                       <Calendar size={64} className="mb-4 opacity-10"/>
                       <p className="font-bold uppercase tracking-widest text-[10px]">Añade platos para planificar el servicio</p>
                    </div>
                  ) : (
                    <>
                      {selectedRecipes.map((recipe, idx) => (
                          <div key={`${recipe.id}_${idx}`} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 animate-fadeIn group">
                             <span className="font-black text-slate-200 text-xl w-8 text-center">{idx + 1}</span>
                             <div className="w-14 h-14 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 relative">
                                <CategoryStripe category={recipe.category} settings={settings} vertical={true} className="absolute left-0 top-0 bottom-0 w-1 z-10" />
                                {recipe.photo && <img src={recipe.photo} className="w-full h-full object-cover" alt="" />}
                             </div>
                             <div className="flex-grow">
                                <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight truncate">{recipe.name}</h4>
                                <p className="text-[10px] text-slate-400 font-bold italic">Escalado: {menuPax} raciones</p>
                             </div>
                             <div className="flex items-center gap-2">
                                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => moveItem(idx, 'up')} className="p-1 text-slate-300 hover:text-slate-900" disabled={idx === 0}><ArrowUp size={16}/></button>
                                  <button onClick={() => moveItem(idx, 'down')} className="p-1 text-slate-300 hover:text-slate-900" disabled={idx === selectedRecipes.length -1}><ArrowDown size={16}/></button>
                                </div>
                                <button onClick={() => removeFromMenu(idx)} className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={20}/></button>
                             </div>
                          </div>
                      ))}
                      <div className="p-8 border-t border-slate-100 mt-6 bg-slate-50/50 rounded-2xl text-right">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Coste Total Estimado</p>
                         <p className="text-3xl font-black text-indigo-600">{menuEconomics.total.toFixed(2)}€</p>
                      </div>
                    </>
                  )}
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'kitchen_fichas') {
    return (
      <div className="min-h-screen bg-gray-100 print:bg-white p-4 md:p-10">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              margin: 10mm 10mm 20mm 10mm;
            }
            .print-footer {
              position: fixed;
              bottom: -15mm;
              left: 0;
              right: 0;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 7px;
              color: #94a3b8;
              text-transform: uppercase;
              font-weight: 900;
              letter-spacing: 0.2em;
              background: transparent;
            }
            .page-number:after {
              content: "PÁG. " counter(page);
            }
            .no-break { break-inside: avoid; }
            .instructions-text { font-size: 10px !important; line-height: 1.4 !important; }
            .ingredients-table { font-size: 10px !important; }
          }
        `}} />
        <div className="max-w-5xl mx-auto mb-6 flex justify-between items-center no-print">
          <button onClick={() => setActiveTab('planning')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold uppercase text-[10px] tracking-widest">
            <ArrowLeft size={20} />
            <span>Volver</span>
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl hover:bg-slate-700 transition-all shadow-lg font-black uppercase text-xs tracking-widest">
            <Printer size={20} />
            <span>Imprimir Fichas Escaladas</span>
          </button>
        </div>

        {selectedRecipes.map((recipe, rIdx) => {
          const allergens = getRecipeAllergens(recipe);
          const paxRatio = menuPax / recipe.yieldQuantity;
          const costPerPortion = recipe.totalCost && recipe.yieldQuantity ? ((recipe.totalCost / recipe.yieldQuantity) * paxRatio) : 0;

          return (
            <div key={recipe.id} className="bg-white shadow-2xl print:shadow-none mb-10 overflow-hidden rounded-3xl print:rounded-none page-break border border-slate-200 print:border-none max-w-[210mm] mx-auto">
               {/* Cabecera compacta */}
               <div className="p-10 border-b-2 border-slate-900">
                  <div className="flex justify-between items-start">
                     <div>
                        <div className="relative w-fit mb-3">
                           <CategoryStripe category={recipe.category} settings={settings} className="absolute inset-0 rounded opacity-20" />
                           <p className="relative text-slate-700 font-black uppercase tracking-[0.2em] text-[10px] px-2 py-0.5">{recipe.category}</p>
                        </div>
                        <h2 className="text-4xl font-serif font-black uppercase leading-none tracking-tighter text-slate-900">{recipe.name}</h2>
                        <div className="flex items-center gap-4 mt-4">
                           <p className="text-slate-400 text-xs uppercase font-black tracking-widest">VOLUMEN DE PASE: {menuPax} {recipe.yieldUnit}</p>
                           <div className="bg-slate-50 px-3 py-1 rounded-lg border border-slate-900">
                              <span className="text-slate-900 font-black text-xs uppercase">Coste/Ración: {costPerPortion.toFixed(2).replace('.', ',')}€</span>
                           </div>
                        </div>
                     </div>
                     <div className="text-right flex flex-col items-end">
                        <div className="border-2 border-slate-900 p-2 rounded-xl mb-3"><Utensils size={32} className="text-slate-900"/></div>
                        <p className="text-3xl font-black text-slate-900">{menuPax} PAX</p>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 border-b border-slate-100 divide-x divide-slate-100">
                  <div className="p-6 flex items-center gap-4">
                     <Info size={20} className="text-indigo-400"/>
                     <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Servicio Sala</p>
                        <p className="text-xs font-black uppercase text-slate-800">{recipe.serviceDetails.serviceType}</p>
                     </div>
                  </div>
                  <div className="p-6 flex items-center gap-4">
                     <Thermometer size={20} className="text-rose-400"/>
                     <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Temp. Pase</p>
                        <p className="text-xs font-black uppercase text-slate-800">{recipe.serviceDetails.servingTemp || 'N/A'}</p>
                     </div>
                  </div>
                  <div className="p-6 flex items-center gap-4">
                     <User size={20} className="text-amber-400"/>
                     <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Responsable</p>
                        <p className="text-xs font-black uppercase text-slate-800">{recipe.creator || appUser?.teacherName || appUser?.displayName}</p>
                     </div>
                  </div>
               </div>

               <div className="p-10 space-y-12">
                  {/* FOTO Y ALÉRGENOS */}
                  <div className="flex gap-6 items-stretch break-inside-avoid">
                     {recipe.photo && (
                       <div className="w-1/4 aspect-[4/3] rounded-2xl overflow-hidden border-2 border-slate-900 shrink-0">
                          <img src={recipe.photo} alt={recipe.name} className="w-full h-full object-cover" />
                       </div>
                     )}
                     
                     <div className="flex-grow bg-white rounded-2xl p-6 border-2 border-slate-900">
                        <h4 className="text-[9px] font-black text-slate-900 uppercase tracking-widest text-center mb-4 flex items-center justify-center gap-2 border-b border-slate-100 pb-2">
                           <AlertOctagon size={12} className="text-amber-500" /> CONTROL DE ALÉRGENOS
                        </h4>
                        <div className="grid grid-cols-7 gap-y-4 gap-x-1">
                           {ALLERGEN_LIST.map(allergen => {
                             const isPresent = allergens.includes(allergen);
                             return (
                               <div key={allergen} className={`transition-opacity ${isPresent ? 'opacity-100' : 'opacity-10'}`}>
                                 <div className="flex flex-col items-center gap-1">
                                    <span className="text-xl">{ALLERGEN_CONFIG[allergen].icon}</span>
                                    <span className="text-[6px] font-black uppercase text-slate-400 text-center leading-none">{allergen}</span>
                                 </div>
                               </div>
                             );
                           })}
                        </div>
                     </div>
                  </div>

                  {recipe.subRecipes.map((sub, sIdx) => (
                    <div key={sIdx} className="no-break space-y-3 border-b border-slate-200 pb-6 last:border-0">
                       <div className="flex items-center gap-2">
                          <span className="border border-slate-900 text-slate-900 w-5 h-5 flex items-center justify-center rounded font-black text-[10px]">{sIdx + 1}</span>
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">{sub.name}</h4>
                       </div>

                       <div className="grid grid-cols-12 gap-4">
                          {/* LADO IZQUIERDO: Escandallo (Compacto) */}
                          <div className="col-span-4 space-y-2">
                             <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-0.5">Ingredientes / Escandallo</p>
                             <table className="w-full text-[10px] text-slate-700 ingredients-table">
                               <tbody className="divide-y divide-slate-50">
                                  {sub.ingredients.map((ing, iIdx) => {
                                    const scaled = getScaledData(ing.quantity, ing.unit, recipe.yieldQuantity, ing.baseUnit);
                                    return (
                                      <tr key={iIdx}>
                                         <td className="py-1 font-bold uppercase tracking-tight leading-tight">{ing.name}</td>
                                         <td className="py-1 text-right font-black text-slate-900 whitespace-nowrap">{scaled.quantity}</td>
                                         <td className="py-1 pl-1 text-slate-400 font-bold uppercase text-[7px] text-right">{scaled.unit}</td>
                                      </tr>
                                    );
                                  })}
                               </tbody>
                             </table>
                          </div>

                          {/* LADO DERECHO: Proceso (Compacto) */}
                          <div className="col-span-8 space-y-2">
                             <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-0.5">Técnica y Ejecución</p>
                             <div className="space-y-3">
                                {sub.photos && sub.photos.length > 0 && (
                                   <div className="grid grid-cols-4 gap-2">
                                      {sub.photos.map((p, pIdx) => (
                                        <div key={pIdx} className="relative aspect-[4/3]">
                                          <img src={p} alt={`${sub.name} step ${pIdx+1}`} className="w-full h-full object-cover rounded-lg border border-slate-100" />
                                        </div>
                                      ))}
                                   </div>
                                )}
                                <div className="text-[10px] text-slate-600 leading-snug text-justify whitespace-pre-wrap font-serif italic instructions-text">
                                   {sub.instructions || "Técnica no definida."}
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                  ))}

                  <div className="border-2 border-slate-900 text-slate-900 p-8 rounded-2xl">
                     <h4 className="text-[10px] font-black uppercase text-slate-900 mb-3 tracking-[0.2em] flex items-center gap-2 border-b border-slate-200 pb-2">Puesta en Plato y Acabado</h4>
                     <p className="text-xs text-slate-600 font-medium leading-relaxed italic">{recipe.platingInstructions || "Ver manual de emplatado estándar."}</p>
                  </div>
               </div>

               {/* FICHA TÉCNICA DE SERVICIO + CHECKLIST - Nueva página en impresión */}
               <div className="page-break"></div>
               <div className="p-10">
                  <div className="bg-white border-2 border-slate-900 text-slate-900 p-8 rounded-[2rem] break-inside-avoid">
                     <div className="flex items-center gap-3 mb-6 border-b border-slate-200 pb-4">
                        <Clock size={24} className="text-amber-600" />
                        <div>
                           <h3 className="text-xl font-black uppercase tracking-tighter">Ficha de Pase y Servicio</h3>
                           <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Información clave para sala</p>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-5 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                           <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Temperatura</p>
                           <div className="flex items-center gap-2">
                             <Thermometer size={16} className="text-rose-500" />
                             <span className="text-xs font-black text-amber-600">{recipe.serviceDetails.servingTemp || '--'}</span>
                           </div>
                        </div>
                        
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                           <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Técnica</p>
                           <div className="flex items-start gap-2">
                              <Info size={14} className="text-indigo-600 mt-0.5 shrink-0" />
                              <span className="text-[9px] font-black uppercase text-slate-700 leading-tight">{recipe.serviceDetails.serviceType}</span>
                           </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                           <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Cubertería</p>
                           <div className="flex items-start gap-2">
                              <UtensilsCrossed size={16} className="text-amber-600 shrink-0" />
                              <span className="text-[8px] font-bold text-slate-600 uppercase leading-snug">{recipe.serviceDetails.cutlery || 'Estándar'}</span>
                           </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-amber-500/30">
                           <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-2">Rendimiento</p>
                           <div className="flex items-center gap-2">
                             <Users size={18} className="text-amber-600" />
                             <span className="text-lg font-black text-amber-500 leading-none">{menuPax} {recipe.yieldUnit.substring(0,3)}</span>
                           </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-indigo-500/30">
                           <p className="text-[8px] font-black text-indigo-600 uppercase tracking-widest mb-2">Coste / Ración</p>
                           <div className="flex items-center gap-1">
                             <span className="text-lg font-black text-indigo-600 leading-none">
                               {costPerPortion.toFixed(2).replace('.', ',')}
                             </span>
                             <span className="text-xs font-black text-indigo-400">€</span>
                           </div>
                        </div>
                     </div>

                     <div className="mt-4 bg-white p-5 rounded-2xl border border-slate-200">
                        <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Protocolo de Emplatado y Acabado</h4>
                        <p className="text-[10px] text-slate-600 font-medium leading-relaxed italic">
                           {recipe.platingInstructions || "Seguir protocolo estándar de la categoría."}
                         </p>
                      </div>

                      {/* Footer fijo para impresión con número de página */}
                      <div className="hidden print:flex print-footer">
                         <span>{recipe.name} • {menuTitle}</span>
                         <span className="page-number"></span>
                         <span>{settings.instituteName}</span>
                      </div>

                      {/* CHECKLIST DE MISE EN PLACE - SOLO AL FINAL DE LA FICHA DE SERVICIO */}
                      <div className="mt-8 p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                         <h3 className="flex items-center gap-2 font-black text-slate-900 uppercase tracking-tighter text-xs mb-4 border-b border-slate-200 pb-2">
                            <UtensilsCrossed size={14} className="text-emerald-600" /> CHECKLIST DE MISE EN PLACE (REPASO FINAL)
                         </h3>
                         <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                            {recipe.subRecipes.map((sub, idx) => (
                               <div key={idx} className="flex items-center gap-3">
                                  <div className="w-4 h-4 border-2 border-slate-300 rounded flex-shrink-0"></div>
                                  <span className="text-[10px] font-bold text-slate-700 uppercase">{sub.name}</span>
                               </div>
                            ))}
                            <div className="flex items-center gap-3">
                               <div className="w-4 h-4 border-2 border-slate-300 rounded flex-shrink-0"></div>
                               <span className="text-[10px] font-bold text-slate-700 uppercase">Marcaje de Mesa ({recipe.serviceDetails.cutlery || 'Estándar'})</span>
                            </div>
                            <div className="flex items-center gap-3">
                               <div className="w-4 h-4 border-2 border-slate-300 rounded flex-shrink-0"></div>
                               <span className="text-[10px] font-bold text-slate-700 uppercase">Temperatura de Servicio ({recipe.serviceDetails.servingTemp || '--'})</span>
                            </div>
                            <div className="flex items-center gap-3">
                               <div className="w-4 h-4 border-2 border-slate-300 rounded flex-shrink-0"></div>
                               <span className="text-[10px] font-bold text-slate-700 uppercase">Protocolo de Emplatado</span>
                            </div>
                         </div>
                      </div>
                  </div>
               </div>
               {/* Footer fijo para impresión con número de página */}
               <div className="hidden print:flex print-footer">
                  <span>{recipe.name} • {recipe.category}</span>
                  <span className="page-number"></span>
                  <span>{settings.instituteName}</span>
               </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (activeTab === 'purchase_order') {
    return (
      <div className="min-h-screen bg-gray-100 print:bg-white p-4 md:p-10">
         <div className="max-w-[210mm] mx-auto bg-white shadow-2xl print:shadow-none p-6 print:p-0 rounded-3xl overflow-hidden">
            <div className="flex justify-between items-center mb-6 print:hidden">
               <button onClick={() => setActiveTab('planning')} className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 transition-colors uppercase text-[10px] tracking-widest"><ArrowLeft size={20}/> Volver</button>
               <button onClick={() => window.print()} className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg hover:bg-emerald-700 transition-all uppercase text-xs tracking-widest"><Printer size={20}/> Generar Pedido</button>
            </div>

            <PrintHeader title="HOJA DE PEDIDO POR FAMILIAS" subtitle={`EVENTO: ${menuTitle} | VOLUMEN: ${menuPax} PAX | FECHA: ${eventDate}`} />

            <div className="mb-6 flex justify-end">
               <div className="border-2 border-slate-900 px-4 py-2 rounded-xl text-right bg-slate-50">
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Presupuesto Estimado</p>
                  <p className="text-xl font-black text-slate-900 tracking-tighter">{menuEconomics.total.toFixed(2)}€</p>
               </div>
            </div>

            <div className="columns-1 md:columns-2 gap-8 print:columns-2 print:gap-6 space-y-6">
               {purchaseOrderData.map(([family, items]) => (
                 <div key={family} className="break-inside-avoid border-t-2 border-slate-200 pt-3">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.1em] mb-3 flex items-center gap-2">
                       <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[9px] font-black">{family}</span>
                    </h3>
                    <table className="w-full text-left text-[9px]">
                       <thead className="border-b border-slate-900">
                          <tr className="text-[8px] font-black uppercase text-slate-400 tracking-widest">
                             <th className="py-1">Materia Prima</th>
                             <th className="py-1 text-right">Cant.</th>
                             <th className="py-1 pl-2">Unidad</th>
                             <th className="py-1 text-right">Coste</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {Object.values(items).map((item: any) => (
                            <tr key={item.name} className="hover:bg-slate-50/50">
                               <td className="py-1 font-black text-slate-800 uppercase tracking-tight leading-tight">{item.name}</td>
                               <td className="py-1 text-right font-mono font-black text-emerald-600">{formatScaledQuantity(item.baseQuantity, 'g', item.unit).quantity}</td>
                               <td className="py-1 pl-2 font-black text-slate-400 uppercase text-[8px] tracking-widest">{formatScaledQuantity(item.baseQuantity, 'g', item.unit).unit}</td>
                               <td className="py-1 text-right font-mono text-slate-400 font-bold">{item.cost.toFixed(2)}€</td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
               ))}
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 text-center text-[8px] text-slate-300 font-bold uppercase tracking-[0.3em] print:text-black">
               Este pedido es una proyección basada en escandallos técnicos para {menuPax} comensales. Verifique existencias antes de tramitar.
            </div>
         </div>
      </div>
    );
  }

  if (activeTab === 'service_order') {
    return (
      <div className="min-h-screen bg-gray-100 print:bg-white p-4 md:p-10">
         <style>{`@media print { @page { size: landscape; margin: 0.5cm; } }`}</style>
         <div className="max-w-[297mm] mx-auto bg-white shadow-2xl print:shadow-none p-6 print:p-0 rounded-3xl overflow-hidden">
            <div className="flex justify-between items-center mb-6 print:hidden">
               <button onClick={() => setActiveTab('planning')} className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 transition-colors uppercase text-[10px] tracking-widest"><ArrowLeft size={20}/> Volver</button>
               <div className="flex gap-2">
                 <button 
                   onClick={() => handleSavePlan()} 
                   className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg ${saveStatus === 'saved' ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                 >
                   {saveStatus === 'saving' ? 'Guardando...' : saveStatus === 'saved' ? <><CheckCircle2 size={16}/> Guardado</> : <><Save size={16}/> Guardar Menú</>}
                 </button>
                 <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-2xl font-black shadow-lg hover:bg-slate-800 transition-all uppercase text-xs tracking-widest"><Printer size={20}/> Imprimir Orden</button>
               </div>
            </div>

            <PrintHeader title="ORDEN DE SERVICIO" subtitle={`EVENTO: ${menuTitle} | FECHA: ${eventDate}`} />

            <div className="overflow-x-auto border-2 border-slate-900 rounded-xl mt-8">
               <table className="w-full text-left text-[10px] border-collapse">
                  <thead className="bg-slate-100 border-b-2 border-slate-900">
                     <tr className="text-[9px] font-black uppercase text-slate-700 tracking-widest text-center">
                        <th className="p-3 border-r border-slate-300 w-[15%]">Menu</th>
                        <th className="p-3 border-r border-slate-300 w-[15%]">Presentación<br/><span className="text-[7px] text-slate-500">(Tipo de plato, copa...)</span></th>
                        <th className="p-3 border-r border-slate-300 w-[5%]">Caliente</th>
                        <th className="p-3 border-r border-slate-300 w-[5%]">Frío</th>
                        <th className="p-3 border-r border-slate-300 w-[12%]">Marcaje<br/><span className="text-[7px] text-slate-500">Recomendado</span></th>
                        <th className="p-3 border-r border-slate-300 w-[15%]">Tipo de Servicio<br/><span className="text-[7px] text-slate-500">(Inglesa, Sopera, Sala...)</span></th>
                        <th className="p-3 border-r border-slate-300 w-[23%]">Breve Descripción<br/><span className="text-[7px] text-slate-500">(Para informar al cliente)</span></th>
                        <th className="p-3 w-[10%]">Tiempo<br/>de Pase</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                     {selectedRecipes.map((recipe, idx) => {
                        const temp = (recipe.serviceDetails?.servingTemp || '').toLowerCase();
                        const isCold = temp.includes('frio') || temp.includes('frío') || temp.includes('fria') || temp.includes('fría') || temp.includes('helado');
                        const isHot = temp.includes('caliente') || temp.includes('tibio') || temp.includes('templado') || temp.includes('tibia') || temp.includes('templada') || (!isCold && temp.length > 0);
                        
                        return (
                          <tr key={`${recipe.id}_${idx}`} className="hover:bg-slate-50 break-inside-avoid">
                             <td className="p-3 border-r border-slate-300 font-black text-slate-900 uppercase text-[10px] leading-tight">{recipe.name}</td>
                             <td className="p-0 border-r border-slate-300"><textarea value={recipe.serviceDetails?.presentation || ''} onChange={e => updateServiceOrder(idx, 'presentation', e.target.value)} className="w-full h-full min-h-[60px] p-3 bg-transparent border-none resize-none focus:ring-2 focus:ring-slate-900 outline-none text-slate-700" placeholder="-" /></td>
                             <td className="p-0 border-r border-slate-300 text-center font-bold text-slate-900 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => updateServiceOrder(idx, 'servingTemp', 'Caliente')}>
                                {isHot ? (temp.length > 15 ? recipe.serviceDetails?.servingTemp : '✓') : ''}
                             </td>
                             <td className="p-0 border-r border-slate-300 text-center font-bold text-slate-900 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => updateServiceOrder(idx, 'servingTemp', 'Frío')}>
                                {isCold ? (temp.length > 15 ? recipe.serviceDetails?.servingTemp : '✓') : ''}
                             </td>
                             <td className="p-0 border-r border-slate-300"><textarea value={recipe.serviceDetails?.cutlery || ''} onChange={e => updateServiceOrder(idx, 'cutlery', e.target.value)} className="w-full h-full min-h-[60px] p-3 bg-transparent border-none resize-none focus:ring-2 focus:ring-slate-900 outline-none text-slate-700" placeholder="-" /></td>
                             <td className="p-0 border-r border-slate-300"><textarea value={recipe.serviceDetails?.serviceType || ''} onChange={e => updateServiceOrder(idx, 'serviceType', e.target.value)} className="w-full h-full min-h-[60px] p-3 bg-transparent border-none resize-none focus:ring-2 focus:ring-slate-900 outline-none text-slate-700" placeholder="-" /></td>
                             <td className="p-0 border-r border-slate-300"><textarea value={recipe.serviceDetails?.clientDescription || ''} onChange={e => updateServiceOrder(idx, 'clientDescription', e.target.value)} className="w-full h-full min-h-[60px] p-3 bg-transparent border-none resize-none focus:ring-2 focus:ring-slate-900 outline-none text-slate-700 italic leading-tight" placeholder="-" /></td>
                             <td className="p-0"><input type="text" value={recipe.serviceDetails?.passTime || ''} onChange={e => updateServiceOrder(idx, 'passTime', e.target.value)} className="w-full h-full p-3 bg-transparent border-none text-center font-black text-slate-900 uppercase focus:ring-2 focus:ring-slate-900 outline-none" placeholder="-" /></td>
                          </tr>
                        );
                     })}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
    );
  }

  if (activeTab === 'allergen_matrix') {
    return (
      <div className="min-h-screen bg-gray-100 print:bg-white p-4 md:p-10">
         <div className="max-w-[297mm] mx-auto bg-white shadow-2xl print:shadow-none p-12 print:p-0 rounded-3xl overflow-hidden">
            <div className="flex justify-between items-center mb-8 print:hidden">
               <button onClick={() => setActiveTab('planning')} className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 uppercase text-[10px] tracking-widest"><ArrowLeft size={20}/> Volver</button>
               <button onClick={() => window.print()} className="flex items-center gap-2 bg-rose-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg hover:bg-rose-700 transition-all uppercase text-xs tracking-widest"><Printer size={20}/> Imprimir Matriz</button>
            </div>

            <PrintHeader title="DECLARACIÓN DE ALÉRGENOS POR SERVICIO" subtitle={`SERVICIO: ${menuTitle} | FECHA: ${eventDate} | VOLUMEN: ${menuPax} PAX`} />

            <div className="overflow-x-auto border border-slate-900 rounded-lg">
               <table className="w-full border-collapse border-hidden text-[9px] table-fixed">
                  <thead>
                     <tr className="bg-slate-50">
                        <th className="border border-slate-900 p-4 text-left uppercase font-black text-slate-900 w-1/4 text-sm tracking-tighter">Relación de Platos</th>
                        {ALLERGEN_LIST.map(allergen => (
                          <th key={allergen} className="border border-slate-900 p-1 text-center font-black uppercase text-[8px]">
                             <div className="flex flex-col items-center justify-end h-36 pb-3">
                                <span className="text-xl mb-3">{ALLERGEN_CONFIG[allergen].icon}</span>
                                <span className="[writing-mode:vertical-lr] rotate-180 transform font-black tracking-tighter text-slate-800">
                                   {allergen.toUpperCase()}
                                </span>
                             </div>
                          </th>
                        ))}
                     </tr>
                  </thead>
                  <tbody>
                     {selectedRecipes.map((recipe, idx) => {
                       const allergens = getRecipeAllergens(recipe);
                       return (
                         <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="border border-slate-900 p-4 font-black uppercase text-slate-800 leading-tight text-xs tracking-tight bg-slate-50/30">{recipe.name}</td>
                            {ALLERGEN_LIST.map(allergen => {
                              const hasAllergen = allergens.includes(allergen);
                              return (
                                <td key={allergen} className={`border border-slate-900 p-1 text-center ${hasAllergen ? 'bg-rose-50' : ''}`}>
                                  {hasAllergen && <span className="text-xl font-black text-rose-600">X</span>}
                                </td>
                              );
                            })}
                         </tr>
                       );
                     })}
                  </tbody>
               </table>
            </div>
            <div className="mt-10 p-6 border-2 border-slate-900 rounded-2xl bg-slate-50 text-[10px] leading-relaxed italic text-slate-600 font-medium">
               <strong>IMPORTANTE:</strong> Información facilitada en cumplimiento del Reglamento (UE) nº 1169/2011 sobre la información alimentaria facilitada al consumidor. 
               Dada la naturaleza de la elaboración manual en nuestras cocinas, no se puede garantizar la ausencia total de trazas por contaminación cruzada. 
               Por favor, informe al personal sobre cualquier alergia grave antes de consumir.
            </div>
         </div>
      </div>
    );
  }

  return null;
};
