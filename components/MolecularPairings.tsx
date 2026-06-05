import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Beaker, Sparkles, Wine, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { getMolecularPairings, PairingResult, Pairing } from '../services/pairingService';

interface Props {
  ingredients: string[];
}

export const MolecularPairings: React.FC<Props> = ({ ingredients }) => {
  const [data, setData] = useState<PairingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (ingredients.length > 0 && expanded && !data) {
      fetchPairings();
    }
  }, [ingredients, expanded]);

  const fetchPairings = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMolecularPairings(ingredients);
      setData(result);
    } catch (err) {
      console.error(err);
      setError('Error al cargar maridajes biocompatibles.');
    } finally {
      setLoading(false);
    }
  };

  const PairingItem = ({ pairing, icon: Icon, colorClass }: { pairing: Pairing, icon: any, colorClass: string }) => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
            <Icon size={14} className={colorClass} />
          </div>
          <span className="font-black uppercase text-[10px] tracking-tight">{pairing.name}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-mono font-bold text-indigo-600">{pairing.sharedPercentage}%</span>
          <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${pairing.sharedPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full ${colorClass.replace('text-', 'bg-')}`}
            />
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-1.5 mb-2">
        <Beaker size={10} className="text-slate-400" />
        <span className="text-[8px] font-black uppercase text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded italic">
          Base: {pairing.molecularBasis}
        </span>
      </div>
      
      <p className="text-[9px] text-slate-600 leading-relaxed italic">
        {pairing.explanation}
      </p>
    </motion.div>
  );

  return (
    <div className="mt-8 border-t border-slate-100 pt-8 no-print">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-indigo-50 rounded-2xl border border-indigo-100 hover:bg-indigo-100 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
            <Sparkles size={20} />
          </div>
          <div className="text-left">
            <h4 className="text-[12px] font-black uppercase tracking-widest text-indigo-900">Ciencia del Sabor (FlavorDB)</h4>
            <p className="text-[9px] font-bold text-indigo-400 uppercase">Análisis molecular de ingredientes y maridajes</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="text-indigo-400" /> : <ChevronDown className="text-indigo-400 group-hover:translate-y-0.5 transition-transform" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="py-6 space-y-8">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  >
                    <Beaker size={40} className="text-indigo-300" />
                  </motion.div>
                  <p className="text-[10px] font-black text-slate-400 uppercase animate-pulse">Analizando compuestos volátiles...</p>
                </div>
              ) : error ? (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-[10px] font-black uppercase text-center">
                  {error}
                </div>
              ) : data ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Info size={12} /> Maridajes Clásicos
                      </h5>
                      {data.pairings.classics.map((p, i) => (
                        <PairingItem key={i} pairing={p} icon={Info} colorClass="text-indigo-500" />
                      ))}
                    </div>

                    <div className="space-y-4">
                      <h5 className="text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                        <Sparkles size={12} /> Sugerencias Audaces
                      </h5>
                      {data.pairings.bold.map((p, i) => (
                        <PairingItem key={i} pairing={p} icon={Sparkles} colorClass="text-amber-500" />
                      ))}
                    </div>

                    <div className="space-y-4">
                      <h5 className="text-[9px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                        <Wine size={12} /> Bebidas Recomendadas
                      </h5>
                      {data.pairings.drinks.map((p, i) => (
                        <PairingItem key={i} pairing={p} icon={Wine} colorClass="text-purple-400" />
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-3">
                    <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                      <Beaker size={14} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-700 uppercase mb-1">Nota Técnica de Maridaje</p>
                      <p className="text-[9px] text-slate-500 leading-relaxed italic">
                        Este análisis ha sido generado basándose en el perfil molecular de los ingredientes principales del plato: <span className="text-indigo-600 font-bold">{ingredients.join(', ')}</span>. La afinidad se calcula mediante la superposición de moléculas odorantes clave.
                      </p>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
