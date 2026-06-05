
import React, { useState, useRef } from 'react';
import { Recipe, AppSettings, Product, MenuPlan, AppUser } from '../types';
import { 
  Plus, Search, Eye, Edit2, Trash2, ChefHat, Settings, Calendar, 
  Database, LogOut, FileJson, Sparkles, Users, Coins, Tag, ShoppingCart, 
  UserCheck, Lock, Unlock, Copy, FlaskConical 
} from 'lucide-react';
import { CategoryStripe } from './CategoryStripe';
import { AllergenIcon } from './AllergenIcon';
import { FlavorLab } from './FlavorLab';

interface DashboardProps {
  recipes: Recipe[];
  settings: AppSettings;
  savedMenus: MenuPlan[];
  productDatabase: Product[];
  appUser: AppUser | null;
  onNew: () => void;
  onEdit: (recipe: Recipe) => void;
  onView: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  onTogglePublic: (recipe: Recipe) => void;
  onImport: (recipe: Recipe) => void;
  onOpenSettings: () => void;
  onOpenMenuPlanner: () => void;
  onOpenProductDB: () => void;
  onOpenAIBridge: () => void;
  onOpenUserManagement: () => void;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  recipes, settings, savedMenus, productDatabase, appUser, onNew, onEdit, onView, onDelete, onTogglePublic, onImport, onOpenSettings, onOpenMenuPlanner, onOpenProductDB, onOpenAIBridge, onOpenUserManagement, onLogout
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [displayLimit, setDisplayLimit] = useState(10);
  const [showFlavorLab, setShowFlavorLab] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sortedRecipes = [...recipes].sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));

  const isActuallyAdmin = appUser?.role === 'admin' || appUser?.email?.toLowerCase() === 'jcbprofesor@gmail.com' || appUser?.email?.toLowerCase() === 'juan.codina@murciaeduca.es';
  const isOwner = appUser?.email?.toLowerCase() === 'jcbbinger@gmail.com' || appUser?.email?.toLowerCase() === 'jcbprofesor@gmail.com' || appUser?.email?.toLowerCase() === 'juan.codina@murciaeduca.es';

  const filteredRecipes = sortedRecipes.filter(r => {
    const recipeCategories = r.categories || [r.category];
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      recipeCategories.some(cat => cat.toLowerCase().includes(searchTerm.toLowerCase()));
    const isMine = r.workspaceId === appUser?.workspaceId;
    const isPublic = r.isPublic === true;
    const isVisible = isActuallyAdmin || isMine || isPublic;
    return matchesSearch && isVisible;
  });

  const visibleRecipes = filteredRecipes.slice(0, displayLimit);

  const handleImportClick = () => fileInputRef.current?.click();
  
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header Compacto */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                {appUser?.instituteLogo || settings.instituteLogo ? (
                  <img src={appUser?.instituteLogo || settings.instituteLogo} className="w-full h-full object-cover" alt="" />
                ) : (
                  <ChefHat className="text-white" size={20} />
                )}
              </div>
              <div>
                <h1 className="text-sm font-black text-slate-900 uppercase tracking-tighter leading-none">Gestión de Recetario</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{appUser?.instituteName || settings.instituteName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-center">
              <button onClick={onOpenAIBridge} className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-black text-[10px] uppercase tracking-widest shadow-md">
                <Sparkles size={14} /> Digitalizar AI
              </button>
              {isOwner && (
                <button 
                  onClick={() => setShowFlavorLab(true)} 
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-700 to-indigo-900 text-white rounded-xl hover:scale-105 transition-all font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/20 border border-indigo-400/30 group"
                >
                  <FlaskConical size={16} className="text-indigo-300 group-hover:rotate-12 transition-transform" /> 
                  <span>Flavor Lab <span className="text-indigo-300">I+D</span></span>
                </button>
              )}
              <button onClick={onNew} className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-black text-[10px] uppercase tracking-widest shadow-md">
                <Plus size={14} /> Nueva Ficha
              </button>
              <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>
              <button onClick={onOpenProductDB} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all" title="Inventario"><Database size={18} /></button>
              <button onClick={onOpenMenuPlanner} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all" title="Menús"><Calendar size={18} /></button>
              {appUser?.role === 'admin' && (
                <button onClick={onOpenUserManagement} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all" title="Usuarios"><Users size={18} /></button>
              )}
              <button onClick={onOpenSettings} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all" title="Ajustes"><Settings size={18} /></button>
              <button onClick={onLogout} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Salir"><LogOut size={18} /></button>
            </div>
          </div>
        </div>
      </div>

      {showFlavorLab && isOwner && (
        <FlavorLab 
          recipes={recipes} 
          settings={settings} 
          onBack={() => setShowFlavorLab(false)} 
        />
      )}

      {/* Stats & Search */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="flex gap-4">
              <div className="bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                 <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600"><Tag size={16}/></div>
                 <div>
                    <div className="text-xs font-black text-slate-900 leading-none">{recipes.length}</div>
                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Recetas</div>
                 </div>
              </div>
              <div className="bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                 <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600"><ShoppingCart size={16}/></div>
                 <div>
                    <div className="text-xs font-black text-slate-900 leading-none">{productDatabase.length}</div>
                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Productos</div>
                 </div>
              </div>
           </div>

           <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input 
                type="text" 
                placeholder="Buscar por nombre o categoría..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs shadow-sm focus:ring-2 focus:ring-slate-900 transition-all outline-none" 
              />
           </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8">
        <div className="flex flex-col gap-3">
          {visibleRecipes.length > 0 ? visibleRecipes.map(recipe => {
            const costPerPortion = recipe.totalCost && recipe.yieldQuantity ? (recipe.totalCost / recipe.yieldQuantity).toFixed(2).replace('.', ',') : '0,00';
            
            const allAllergens = new Set<string>();
            recipe.subRecipes.forEach(sub => sub.ingredients.forEach(ing => ing.allergens.forEach(a => allAllergens.add(a))));

            const isMine = appUser?.workspaceId && (recipe.workspaceId === appUser.workspaceId || (isActuallyAdmin && !recipe.workspaceId));
            const isCommunity = !isMine;

            return (
              <div 
                key={recipe.id} 
                onClick={() => onView(recipe)}
                className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border overflow-hidden flex group cursor-pointer relative border-b-4 border-x-slate-100 border-t-slate-100 ${isCommunity ? 'border-b-blue-500' : 'border-b-emerald-500'}`}
              >
                {/* Indicador de Color Lateral */}
                <CategoryStripe category={(recipe.categories || [recipe.category])[0]} settings={settings} vertical={true} className="w-1.5 shrink-0" />
                
                {/* Imagen */}
                <div className="w-24 sm:w-32 aspect-square relative overflow-hidden bg-slate-50 shrink-0">
                  {recipe.photo ? (
                    <img src={recipe.photo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-10"><ChefHat size={32} /></div>
                  )}
                </div>

                {/* Contenido Central */}
                <div className="flex-grow p-4 flex flex-col justify-between min-w-0">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {(recipe.categories || [recipe.category]).map(cat => (
                          <div key={cat} className="relative">
                            <CategoryStripe category={cat} settings={settings} className="absolute inset-0 rounded opacity-10" />
                            <span className="relative text-[7px] font-black text-slate-500 px-2 py-0.5 rounded uppercase tracking-tighter block border border-slate-100">
                              {cat}
                            </span>
                          </div>
                        ))}
                        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                          <div className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-all ${!recipe.isPublic ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400'}`}>
                            <Lock size={8} />
                            <span className="text-[7px] font-black uppercase tracking-tighter">Privado</span>
                          </div>
                          <div className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-all ${recipe.isPublic ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400'}`}>
                            <Users size={8} />
                            <span className="text-[7px] font-black uppercase tracking-tighter">Público</span>
                          </div>
                        </div>
                        <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest ml-auto">
                          {recipe.yieldQuantity} {recipe.yieldUnit}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight truncate group-hover:text-indigo-600 transition-colors">
                        {recipe.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {recipe.creatorLogo ? (
                          <img src={recipe.creatorLogo} className="w-4 h-4 rounded-full object-cover" alt="" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center">
                            <Users size={8} className="text-slate-400" />
                          </div>
                        )}
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                          {recipe.creator}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-black text-indigo-600 leading-none">{costPerPortion}€</div>
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Coste / Ración</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-2">
                    <div className="flex flex-wrap gap-1">
                      {Array.from(allAllergens).slice(0, 6).map(a => (
                        <div key={a} title={a}>
                          <AllergenIcon allergen={a as any} size={18} />
                        </div>
                      ))}
                      {allAllergens.size > 6 && (
                        <span className="text-[8px] font-black text-slate-300 flex items-center">+{allAllergens.size - 6}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                        {isCommunity && (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              onEdit({
                                ...recipe, 
                                id: '', 
                                workspaceId: appUser?.workspaceId || '',
                                isPublic: false
                              }); 
                            }}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all shadow-sm border border-emerald-100"
                            title="Duplicar a mis recetas"
                          >
                            <Copy size={16} />
                          </button>
                        )}
                        {(isMine || appUser?.role === 'admin') && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); onEdit(recipe); }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-indigo-100"
                            title="Editar Receta"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {(isMine || appUser?.role === 'admin') && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); onTogglePublic(recipe); }}
                            className={`p-2 rounded-xl transition-all border border-transparent ${recipe.isPublic ? 'text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 hover:border-emerald-100' : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50 hover:border-amber-100'}`}
                            title={recipe.isPublic ? "Pública (Click para hacer privada)" : "Privada (Click para hacer pública)"}
                          >
                            {recipe.isPublic ? <Unlock size={16} /> : <Lock size={16} />}
                          </button>
                        )}
                       {(isMine || appUser?.role === 'admin') && (
                         <button 
                           onClick={(e) => { e.stopPropagation(); confirm(`¿Borrar ${recipe.name}?`) && onDelete(recipe.id); }}
                           className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                         >
                           <Trash2 size={16} />
                         </button>
                       )}
                       <div className="px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-sm group-hover:bg-indigo-600 transition-colors">
                         Ver Ficha <Eye size={14} />
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="col-span-full py-20 text-center">
               <ChefHat size={64} className="mx-auto text-slate-200 mb-4" strokeWidth={1} />
               <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No hay fichas técnicas registradas</p>
            </div>
          )}
        </div>

        {filteredRecipes.length > displayLimit && (
          <div className="mt-12 flex justify-center">
            <button 
              onClick={() => setDisplayLimit(prev => prev + 10)}
              className="px-8 py-3 bg-white border-2 border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all uppercase text-[10px] tracking-widest shadow-sm"
            >
              Cargar más recetas
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
