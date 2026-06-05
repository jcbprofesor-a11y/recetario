
import React, { useMemo, useState, useEffect } from 'react';
import { Recipe, AppSettings, Allergen, ALLERGEN_LIST, AppUser } from '../types';
import { formatScaledQuantity } from '../lib/unitUtils';
import { Printer, ArrowLeft, AlertOctagon, Utensils, Thermometer, ChefHat, Users, Clock, UtensilsCrossed, MessageSquare, Info, Camera, Edit2, Copy, ExternalLink } from 'lucide-react';

import { CategoryStripe } from './CategoryStripe';
import { AllergenIcon } from './AllergenIcon';
import { MolecularPairings } from './MolecularPairings';

interface RecipeViewProps {
  recipe: Recipe;
  settings: AppSettings;
  appUser: AppUser | null;
  onBack: () => void;
  onEdit: (recipe: Recipe) => void;
}

export const RecipeView: React.FC<RecipeViewProps> = ({ recipe, settings, appUser, onBack, onEdit }) => {
  const [dynamicPax, setDynamicPax] = useState<number>(recipe.yieldQuantity);

  useEffect(() => {
    const originalTitle = document.title;
    document.title = recipe.name;
    return () => {
      document.title = originalTitle;
    };
  }, [recipe.name]);
  
  const paxRatio = useMemo(() => {
    return dynamicPax / recipe.yieldQuantity;
  }, [dynamicPax, recipe.yieldQuantity]);

  const isOwner = appUser?.email?.toLowerCase() === 'jcbbinger@gmail.com' || appUser?.email?.toLowerCase() === 'jcbprofesor@gmail.com' || appUser?.email?.toLowerCase() === 'juan.codina@murciaeduca.es';

  const mainIngredients = useMemo(() => {
    const names = new Set<string>();
    recipe.subRecipes.forEach(sub => {
      sub.ingredients.forEach(ing => {
        if (ing.name && ing.name.length > 2) names.add(ing.name.trim());
      });
    });
    return Array.from(names).slice(0, 8); // Top 8 ingredients for analysis
  }, [recipe]);

  const allAllergens = useMemo(() => {
    const set = new Set<Allergen>();
    recipe.subRecipes?.forEach(sub => {
      sub.ingredients?.forEach(ing => {
        ing.allergens?.forEach(a => set.add(a));
      });
    });
    // Add extra allergens from the recipe level
    recipe.extraAllergens?.forEach(a => set.add(a));
    return Array.from(set);
  }, [recipe]);

  const getScaledData = (qtyStr: string, unit: string, baseUnit?: string): { quantity: string, unit: string } => {
    const num = parseFloat(qtyStr.replace(',', '.'));
    if (isNaN(num)) return { quantity: qtyStr, unit };
    return formatScaledQuantity(num * paxRatio, unit, baseUnit);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-2 md:p-4 print:p-0 print:bg-white font-sans text-slate-900">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { -webkit-print-color-adjust: exact; }
          .page-break { page-break-before: always; }
          .no-break { break-inside: avoid; }
          .instructions-text { font-size: 10px !important; line-height: 1.4 !important; }
          .ingredients-table { font-size: 10px !important; }
          
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
        }
      `}} />
      <title>{recipe.name}</title>
      <div className="max-w-4xl mx-auto mb-4 flex justify-between items-center no-print">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition-colors uppercase text-[10px] tracking-widest">
          <ArrowLeft size={18} />
          <span>Volver al Panel</span>
        </button>
        <div className="flex gap-4">
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <Users size={16} className="text-indigo-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Escalar Pax:</span>
            <input 
              type="number" 
              value={dynamicPax} 
              onChange={e => setDynamicPax(Math.max(1, Number(e.target.value)))}
              className="w-10 font-black text-center text-indigo-600 outline-none border-b-2 border-indigo-100 focus:border-indigo-500 bg-transparent"
            />
          </div>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl hover:bg-slate-800 transition-all shadow-lg font-black uppercase text-xs tracking-widest">
            <Printer size={18} />
            <span>Imprimir Ficha</span>
          </button>
        </div>
      </div>

      <div className="max-w-[210mm] mx-auto bg-white shadow-2xl print:shadow-none print:w-full overflow-hidden p-8 print:p-6 border border-slate-200 print:border-none rounded-[1.5rem] print:rounded-none">
         {/* Cabecera compacta */}
        <div className="flex justify-between items-center mb-4 border-b-2 border-slate-900 pb-4">
           <div className="flex flex-col gap-1">
              <div className="flex flex-wrap gap-1 w-fit">
                {(recipe.categories || (recipe.category ? [recipe.category] : [])).map(cat => (
                  <div key={cat} className="relative">
                    <CategoryStripe category={cat} settings={settings} className="absolute inset-0 rounded opacity-20" />
                    <span className="relative text-slate-700 font-black text-[8px] uppercase tracking-[0.2em] px-2 py-0.5 block">
                      {cat}
                    </span>
                  </div>
                ))}
              </div>
              <h1 className="text-4xl font-serif font-black text-slate-900 leading-none tracking-tighter uppercase mt-1">
                {recipe.name}
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 border border-slate-200 px-2 py-0.5 rounded">
                  <Users size={12} className="text-slate-400" />
                  <span className="text-[10px] font-black text-slate-600 uppercase">{dynamicPax} {recipe.yieldUnit}</span>
                </div>
                <div className="flex items-center gap-1.5 border border-slate-900 px-2 py-0.5 rounded bg-slate-50">
                  <span className="text-[10px] font-black text-slate-900 uppercase">Coste/Ración: {recipe.totalCost && recipe.yieldQuantity ? ((recipe.totalCost / recipe.yieldQuantity) * paxRatio).toFixed(2).replace('.', ',') : '0,00'}€</span>
                </div>
                {recipe.sourceUrl && (
                  <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 border border-indigo-200 bg-indigo-50 px-2 py-0.5 rounded hover:bg-indigo-100 transition-colors no-print">
                    <ExternalLink size={12} className="text-indigo-500" />
                    <span className="text-[10px] font-black text-indigo-700 uppercase">Visitar Origen</span>
                  </a>
                )}
              </div>
           </div>
           <div className="flex flex-col items-end">
             {settings.instituteLogo ? (
               <img src={settings.instituteLogo} alt="IES Logo" className="h-12 w-auto object-contain" />
             ) : (
               <span className="font-black text-[10px] uppercase opacity-20">{settings.instituteName}</span>
             )}
           </div>
        </div>
        
        {/* BLOQUE DE EXPLICACIÓN COMERCIAL - Más compacto */}
        <div className="bg-white border-2 border-slate-900 text-slate-900 p-6 rounded-2xl mb-8 flex items-start gap-6 relative overflow-hidden">
           <div className="bg-amber-500 p-3 rounded-xl text-slate-900 shrink-0 shadow-lg">
             <MessageSquare size={24} />
           </div>
           <div className="flex-grow">
             <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-1">Explicación Sugerente (Servicio)</p>
             <p className="text-base font-medium italic leading-snug text-slate-700 font-serif">
               "{recipe.serviceDetails.clientDescription || 'No definida.'}"
             </p>
           </div>
        </div>

        <div className="space-y-8 mb-8">
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
                      const isPresent = allAllergens.includes(allergen);
                      return (
                        <div key={allergen} className={`transition-opacity ${isPresent ? 'opacity-100' : 'opacity-10'}`}>
                          <AllergenIcon 
                            allergen={allergen} 
                            size={32} 
                            showLabel={true} 
                          />
                        </div>
                      );
                    })}
                 </div>
              </div>
           </div>

           {/* ELABORACIONES: ESCANDALLO + PROCESO JUNTOS */}
           <div className="space-y-6">
              <h3 className="font-black text-slate-900 uppercase tracking-tighter text-xs border-b-2 border-slate-900 pb-1">DESARROLLO TÉCNICO POR ELABORACIÓN</h3>
              {recipe.subRecipes.map((sub, sIdx) => (
                <div key={sub.id} className="no-break space-y-3 border-b border-slate-200 pb-6 last:border-0">
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
                                const scaled = getScaledData(ing.quantity, ing.unit, ing.baseUnit);
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
           </div>

           {isOwner && <MolecularPairings ingredients={mainIngredients} />}
        </div>

        {/* FICHA TÉCNICA DE SERVICIO + CHECKLIST - Nueva página en impresión */}
        <div className="page-break"></div>
        <div className="bg-white border-2 border-slate-900 text-slate-900 p-8 rounded-[2rem] mt-6 break-inside-avoid">
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
                   <span className="text-lg font-black text-amber-500 leading-none">{dynamicPax} {recipe.yieldUnit.substring(0,3)}</span>
                 </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-indigo-500/30">
                 <p className="text-[8px] font-black text-indigo-600 uppercase tracking-widest mb-2">Coste / Ración</p>
                 <div className="flex items-center gap-1">
                   <span className="text-lg font-black text-indigo-600 leading-none">
                     {recipe.totalCost && recipe.yieldQuantity ? ((recipe.totalCost / recipe.yieldQuantity) * paxRatio).toFixed(2).replace('.', ',') : '0,00'}
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

        {/* Pie de página limpio */}
        <div className="mt-8 text-center text-[9px] text-slate-300 font-black uppercase tracking-[0.4em] print:hidden border-t border-slate-50 pt-6">
           {settings.instituteName} • {recipe.creator || appUser?.teacherName || appUser?.displayName}
        </div>

        {/* Footer fijo para impresión con número de página */}
        <div className="hidden print:flex print-footer">
           <span>{recipe.name} • {recipe.category}</span>
           <span className="page-number"></span>
           <span>{settings.instituteName}</span>
        </div>
      </div>
    </div>
  );
};
