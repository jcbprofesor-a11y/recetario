import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Beaker, Sparkles, Search, Plus, X, ArrowLeft, Zap, Wand2, FlaskConical, Microscope, Info, Wine, ChefHat, Target, Layers } from 'lucide-react';
import { Recipe, AppSettings } from '../types';
import { getMolecularPairings, analyzeRecipeMolecular, PairingResult, generateRecipeAI } from '../services/pairingService';

interface Props {
  recipes: Recipe[];
  settings: AppSettings;
  onBack: () => void;
}

export const FlavorLab: React.FC<Props> = ({ recipes, settings, onBack }) => {
  const [activeTab, setActiveTab] = useState<'explorer' | 'analyzer' | 'creator'>('explorer');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [pairingData, setPairingData] = useState<PairingResult | null>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [generatedRecipe, setGeneratedRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');

  // Generator State
  const [genVibe, setGenVibe] = useState('Modernist/Techno-emotional');
  const [genLevel, setGenLevel] = useState('Professional');
  const [genGoal, setGenGoal] = useState('Fine dining tasting menu component');
  const [genConstraints, setGenConstraints] = useState<string[]>([]);
  const [constraintInput, setConstraintInput] = useState('');

  const handleAddIng = () => {
    if (input.trim() && !ingredients.includes(input.trim())) {
      setIngredients([...ingredients, input.trim()]);
      setInput('');
    }
  };

  const handleAddConstraint = () => {
    if (constraintInput.trim() && !genConstraints.includes(constraintInput.trim())) {
      setGenConstraints([...genConstraints, constraintInput.trim()]);
      setConstraintInput('');
    }
  };

  const handleExplore = async () => {
    if (ingredients.length === 0) return;
    setLoading(true);
    try {
      const res = await getMolecularPairings(ingredients);
      setPairingData(res);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleAnalyzeRecipe = async () => {
    const recipe = recipes.find(r => r.id === selectedRecipeId);
    if (!recipe) return;
    setLoading(true);
    try {
      const res = await analyzeRecipeMolecular(recipe);
      setAnalysisData(res);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleGenerate = async () => {
    if (ingredients.length === 0) return;
    setLoading(true);
    try {
      const res = await generateRecipeAI({
        ingredients,
        vibe: genVibe,
        level: genLevel,
        goal: genGoal,
        constraints: genConstraints
      });
      setGeneratedRecipe(res);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col text-slate-200 overflow-hidden font-sans">
      {/* Header Estilo Laboratorio */}
      <div className="px-8 py-6 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-3 hover:bg-slate-800 rounded-2xl transition-colors text-slate-400">
            <ArrowLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <div className="bg-indigo-500 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
                <FlaskConical size={24} className="text-white" />
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-white">Laboratorio <span className="text-indigo-400">Molecular</span></h1>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Sistemas de I+D Gastronómico • IA Culinaria v2.0</p>
          </div>
        </div>
        
        <div className="flex bg-slate-800 p-1 rounded-2xl border border-slate-700">
          {[
            { id: 'explorer', label: 'Afinidades' },
            { id: 'analyzer', label: 'Auditoría' },
            { id: 'creator', label: 'Arquitecto AI' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Panel de Control Izquierdo */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
              
              <div className="mb-8">
                 <h2 className="text-sm font-black uppercase tracking-widest text-indigo-400 mb-2 flex items-center gap-2">
                    <Plus size={16} /> Ingredientes Base
                 </h2>
                 <p className="text-[10px] text-slate-500 font-medium">Define los pilares de tu creación.</p>
                 <div className="mt-4 flex gap-2">
                  <input 
                    type="text" 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddIng()}
                    placeholder="Ej: Ajo Negro"
                    className="flex-grow bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500"
                  />
                  <button onClick={handleAddIng} className="p-3 bg-indigo-600 rounded-xl text-white">
                    <Plus size={18} />
                  </button>
                 </div>
                 <div className="flex flex-wrap gap-2 mt-4">
                    {ingredients.map(ing => (
                      <span key={ing} className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-2">
                        {ing} <button onClick={() => setIngredients(ingredients.filter(i => i !== ing))}><X size={12} /></button>
                      </span>
                    ))}
                 </div>
              </div>

              {activeTab === 'explorer' && (
                <button 
                  onClick={handleExplore}
                  disabled={loading || ingredients.length === 0}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 flex justify-center items-center gap-3"
                >
                  {loading ? <Microscope className="animate-pulse" /> : <Search size={18} />}
                  Mapear Moléculas
                </button>
              )}

              {activeTab === 'analyzer' && (
                <div className="space-y-4">
                  <select 
                    value={selectedRecipeId}
                    onChange={e => setSelectedRecipeId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-xs font-bold outline-none"
                  >
                    <option value="">Seleccionar receta...</option>
                    {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <button 
                    onClick={handleAnalyzeRecipe}
                    disabled={loading || !selectedRecipeId}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 flex justify-center items-center gap-3"
                  >
                    {loading ? <Microscope className="animate-pulse" /> : <Wand2 size={18} />}
                    Auditar Receta
                  </button>
                </div>
              )}

              {activeTab === 'creator' && (
                <div className="space-y-6 border-t border-slate-800 pt-8 mt-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-2">
                      <Sparkles size={14} /> Concepto / Estilo
                    </label>
                    <input 
                      type="text" value={genVibe} onChange={e => setGenVibe(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-xs font-bold"
                      placeholder="Ej: Brutalista, Minimalista..."
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-2">
                      <Target size={14} /> Objetivo final
                    </label>
                    <input 
                      type="text" value={genGoal} onChange={e => setGenGoal(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-2">
                      <ChefHat size={14} /> Nivel Técnico
                    </label>
                    <select 
                      value={genLevel} onChange={e => setGenLevel(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-xs font-bold"
                    >
                      <option>Casual</option>
                      <option>Semi-Pro</option>
                      <option>Professional</option>
                      <option>Experimental/Avant-Garde</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-2">
                      <Layers size={14} /> Restricciones
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text" value={constraintInput} onChange={e => setConstraintInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddConstraint()}
                        className="flex-grow bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                        placeholder="Ej: Sin lactosa"
                      />
                      <button onClick={handleAddConstraint} className="p-3 bg-slate-700 rounded-xl text-white">
                        <Plus size={18} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {genConstraints.map(c => (
                        <span key={c} className="bg-slate-800/50 border border-slate-700/50 px-2 py-1 rounded-lg text-[8px] font-black uppercase flex items-center gap-1">
                          {c} <button onClick={() => setGenConstraints(genConstraints.filter(i => i !== c))}><X size={10} /></button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={handleGenerate}
                    disabled={loading || ingredients.length === 0}
                    className="w-full bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-indigo-600/20 flex justify-center items-center gap-3"
                  >
                    {loading ? <Zap className="animate-spin" /> : <Wand2 size={18} />}
                    Generar Arquitectura
                  </button>
                </div>
              )}

            </div>
          </div>

          {/* Área de Resultados Derecha */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center min-h-[400px] gap-6"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20"></div>
                    <motion.div 
                       animate={{ rotate: 360, scale: [1, 1.1, 1] }} 
                       transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                       className="relative z-10"
                    >
                      <Beaker size={60} className="text-indigo-500" />
                    </motion.div>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 animate-pulse">Sintetizando algoritmos culinarios...</p>
                </motion.div>
              ) : activeTab === 'explorer' && pairingData ? (
                <motion.div key="p-res" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <ResultSection title="Afinidades" pairings={pairingData.pairings.classics} color="indigo" icon={Info} />
                  <ResultSection title="Disrupciones" pairings={pairingData.pairings.bold} color="amber" icon={Sparkles} />
                  <ResultSection title="Liquid Pairing" pairings={pairingData.pairings.drinks} color="purple" icon={Wine} />
                </motion.div>
              ) : activeTab === 'analyzer' && analysisData ? (
                <motion.div key="a-res" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 space-y-10">
                   <div className="space-y-4">
                     <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">ADN Molecular</p>
                     <p className="text-lg text-slate-200 italic font-medium leading-relaxed border-l-4 border-indigo-500/50 pl-8">{analysisData.analisis_molecular}</p>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     {analysisData.variaciones.map((v: any, i: number) => (
                       <div key={i} className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/40">
                         <div className="flex items-center gap-2 mb-4">
                            <span className="text-[9px] font-black line-through text-slate-600 uppercase">{v.original}</span>
                         </div>
                         <div className="text-emerald-400 font-black text-xs mb-3 uppercase tracking-tighter">→ {v.sugerencia}</div>
                         <p className="text-[10px] text-slate-500 leading-relaxed italic">{v.porque}</p>
                       </div>
                     ))}
                   </div>
                   <div className="bg-amber-500/5 border border-amber-500/20 rounded-[2rem] p-8">
                     <h4 className="text-[10px] font-black text-amber-500 uppercase mb-4 flex items-center gap-2"><Sparkles size={14}/> Agente de Maridaje Directo</h4>
                     <p className="text-white font-black text-lg mb-2 uppercase">{analysisData.ingrediente_secreto.nombre}</p>
                     <p className="text-[11px] text-amber-200/50 leading-relaxed italic">{analysisData.ingrediente_secreto.explicacion}</p>
                   </div>
                </motion.div>
              ) : activeTab === 'creator' && generatedRecipe ? (
                <motion.div key="c-res" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                   <div className="bg-indigo-600 p-8 flex justify-between items-start">
                     <div>
                       <div className="text-[9px] font-black text-indigo-200 uppercase mb-2 tracking-[0.2em]">{generatedRecipe.category} • {genLevel}</div>
                       <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{generatedRecipe.name}</h2>
                       <p className="text-indigo-200/80 text-xs mt-4 max-w-xl font-medium italic">{generatedRecipe.description}</p>
                     </div>
                     <div className="text-right">
                       <span className="bg-white/10 px-4 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-widest">{generatedRecipe.yieldQuantity} {generatedRecipe.yieldUnit}</span>
                     </div>
                   </div>

                   <div className="p-10 space-y-12">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {generatedRecipe.subRecipes.map((sub: any, i: number) => (
                           <div key={i} className="space-y-6">
                              <h3 className="text-xs font-black uppercase text-indigo-400 tracking-widest flex items-center gap-2 border-b border-slate-800 pb-3">
                                <Beaker size={14} /> {sub.name}
                              </h3>
                              <ul className="space-y-3">
                                {sub.ingredients.map((ing: any, j: number) => (
                                  <li key={j} className="flex justify-between items-center bg-slate-800/30 p-3 rounded-xl border border-slate-700/30">
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold text-white mb-0.5">{ing.name}</span>
                                      {ing.notes && <span className="text-[9px] text-slate-500 italic uppercase">{ing.notes}</span>}
                                    </div>
                                    <span className="text-[10px] font-black text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-lg">{ing.quantity} {ing.unit}</span>
                                  </li>
                                ))}
                              </ul>
                              <div className="space-y-4 mt-6">
                                {sub.steps.map((st: any, k: number) => (
                                  <div key={k} className="flex gap-4 group">
                                    <span className="text-[10px] font-black text-slate-700 mt-1">0{k+1}</span>
                                    <p className="text-[11px] text-slate-400 leading-relaxed font-medium group-hover:text-slate-200 transition-colors">{st.step}</p>
                                  </div>
                                ))}
                              </div>
                           </div>
                        ))}
                      </div>

                      <div className="bg-indigo-900/10 border border-indigo-500/20 p-8 rounded-3xl relative overflow-hidden">
                        <ChefHat className="absolute -bottom-4 -right-4 text-indigo-500/10" size={120} />
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase mb-4 tracking-[0.2em] flex items-center gap-2">Notas del Chef I+D</h4>
                        <p className="text-xs text-slate-300 leading-relaxed italic relative z-10">{generatedRecipe.chefTips}</p>
                      </div>
                   </div>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center min-h-[400px] text-slate-700 text-center space-y-6">
                  <div className="relative">
                    <FlaskConical size={100} strokeWidth={0.5} className="opacity-20" />
                    <motion.div animate={{ rotate: 180 }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }} className="absolute inset-0 flex items-center justify-center">
                       <Zap size={24} className="text-indigo-900/30" />
                    </motion.div>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Protocolo de Laboratorio Activo</h3>
                    <p className="text-[9px] font-bold mt-2 text-slate-800 max-w-xs uppercase">Esperando fluctuaciones creativas en los parámetros de entrada.</p>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

const ResultSection = ({ title, pairings, color, icon: Icon }: any) => (
  <div className="space-y-4">
    <h3 className={`text-[10px] font-black uppercase tracking-widest text-${color}-400 flex items-center gap-2 mb-6`}>
      <Icon size={14} /> {title}
    </h3>
    {pairings.map((p: any, i: number) => (
      <div key={i} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition-colors group">
        <div className="flex justify-between items-start mb-4">
           <span className="text-xs font-black text-white uppercase group-hover:text-indigo-400 transition-colors uppercase">{p.name}</span>
           <div className={`text-[10px] font-serif font-black text-${color}-400 bg-${color}-500/10 px-2 py-0.5 rounded-lg border border-${color}-500/20`}>{p.sharedPercentage}%</div>
        </div>
        <div className="flex items-center gap-2 mb-2">
           <Beaker size={10} className="text-slate-600" />
           <span className="text-[8px] font-black uppercase text-slate-600 tracking-wider">ADN: {p.molecularBasis}</span>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed italic">{p.explanation}</p>
      </div>
    ))}
  </div>
);
