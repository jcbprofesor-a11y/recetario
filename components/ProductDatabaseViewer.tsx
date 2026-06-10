
import React, { useState, useMemo, useRef } from 'react';
import { Product, Allergen, ALLERGEN_LIST, AppUser } from '../types';
import { AllergenIcon } from './AllergenIcon';
import { Search, Plus, ArrowLeft, Edit2, Trash2, Save, X, Shield, Check, Download, Upload, DollarSign, Database, AlertTriangle, AlertCircle, FileSpreadsheet, Clock } from 'lucide-react';

interface ProductDatabaseViewerProps {
  products: Product[];
  appUser: AppUser | null;
  onBack: () => void;
  onAdd: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onImport: (products: Product[]) => void;
}

const ALLERGEN_CODE_MAP: Record<string, Allergen> = {
  'GLU': 'Gluten', 'CRU': 'Crustáceos', 'HUE': 'Huevos', 'PES': 'Pescado',
  'CAC': 'Cacahuetes', 'SOY': 'Soja', 'LAC': 'Lácteos', 'FRA': 'Frutos de cáscara',
  'API': 'Apio', 'MUS': 'Mostaza', 'SES': 'Sésamo', 'SUL': 'Sulfitos',
  'ALT': 'Altramuces', 'MOL': 'Moluscos'
};

const REVERSE_ALLERGEN_MAP: Record<string, string> = Object.entries(ALLERGEN_CODE_MAP).reduce((acc, [code, name]) => ({ ...acc, [name]: code }), {});

const parseSmartPrice = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val || val === 'precio_no_disponible') return 0;
  let s = val.toString().trim().replace(/[€\s]/g, '');
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
  else if (lastDot > lastComma) s = s.replace(/,/g, '');
  return parseFloat(s) || 0;
};

export const ProductDatabaseViewer: React.FC<ProductDatabaseViewerProps> = ({ 
  products, appUser, onBack, onAdd, onEdit, onDelete, onImport
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const isActuallyAdmin = appUser?.role === 'admin' || appUser?.email === 'jcbprofesor@gmail.com' || appUser?.email === 'juan.codina@murciaeduca.es';
    return products
      .filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(term) || (p.category || "").toLowerCase().includes(term);
        const isVisible = isActuallyAdmin || p.status === 'approved' || p.requestedBy === appUser?.uid;
        return matchesSearch && isVisible;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, searchTerm, appUser]);

  const handleExportCSV = () => {
    const headers = "Familia,Nombre,Precio (€),Unidad,Peso por Unidad (g),Alergenos";
    const rows = products.map(p => {
      const allergenCodes = (p.allergens || []).map(a => REVERSE_ALLERGEN_MAP[a] || a).join('|');
      const price = p.pricePerUnit === 0 ? 'precio_no_disponible' : p.pricePerUnit.toString();
      const weight = p.weightPerUnit || '';
      const name = p.name.includes(',') ? `"${p.name}"` : p.name;
      const family = (p.category || 'Varios').includes(',') ? `"${p.category}"` : p.category || 'Varios';
      return `${family},${name},${price},${p.unit},${weight},${allergenCodes}`;
    });
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `inventario_ies_la_flota_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
        const dataLines = lines.slice(1);
        
        const newProducts: Product[] = dataLines.map((line, index) => {
          // Parser robusto para CSV con comas en campos entrecomillados
          const parts = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$)/g);
          if (!parts || parts.length < 4) return null;

          const familyRaw = parts[0].replace(/^"|"$/g, '').trim().toUpperCase();
          let nameRaw = parts[1].replace(/^"|"$/g, '').trim().toUpperCase();
          const priceRaw = parts[2].trim();
          const unitRaw = parts[3].trim();
          const weightRaw = parts[4] ? parts[4].trim() : "";
          const allergensRaw = parts[5] ? parts[5].trim() : "";

          // LIMPIEZA CRÍTICA: Si el nombre contiene la familia al inicio, la quitamos
          // Esto evita que salga "ACEITES, ACEITE DE OLIVA" en el nombre
          const prefixes = [familyRaw + ",", familyRaw + " -", familyRaw + ":", familyRaw + " "];
          for (const prefix of prefixes) {
            if (nameRaw.startsWith(prefix)) {
              nameRaw = nameRaw.substring(prefix.length).trim();
              break;
            }
          }

          const allergens: Allergen[] = allergensRaw.split('|')
            .filter(code => code.trim() !== "")
            .map(code => ALLERGEN_CODE_MAP[code.trim().toUpperCase()] || code as Allergen);

          return {
            id: `p_csv_${Date.now()}_${index}`,
            name: nameRaw,
            pricePerUnit: parseSmartPrice(priceRaw),
            unit: (unitRaw || 'kg').trim(),
            weightPerUnit: weightRaw ? parseFloat(weightRaw) : undefined,
            allergens: allergens,
            category: familyRaw || 'VARIOS'
          };
        }).filter(p => p !== null) as Product[];

        // Sincronizar: Si el nombre ya existe, se actualiza. Si no, se añade.
        const updatedDatabase = [...products];
        newProducts.forEach(newP => {
          const idx = updatedDatabase.findIndex(p => p.name.toLowerCase() === newP.name.toLowerCase());
          if (idx >= 0) {
            updatedDatabase[idx] = { ...updatedDatabase[idx], ...newP, id: updatedDatabase[idx].id };
          } else {
            updatedDatabase.push(newP);
          }
        });

        onImport(updatedDatabase);
        alert(`Éxito: Se han procesado ${newProducts.length} registros y organizado por sus familias correspondientes.`);
      } catch (err) {
        alert("Error de formato en el CSV. Asegúrate de seguir el orden: Familia, Nombre, Precio, Unidad, Alérgenos");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const toggleAllergen = (allergen: Allergen) => {
    if (!editingProduct) return;
    const current = editingProduct.allergens || [];
    const updated = current.includes(allergen) ? current.filter(a => a !== allergen) : [...current, allergen];
    setEditingProduct({ ...editingProduct, allergens: updated });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    const finalProduct = {
      ...editingProduct,
      pricePerUnit: parseSmartPrice(editingProduct.pricePerUnit),
      name: editingProduct.name.toUpperCase(),
      category: editingProduct.category?.toUpperCase() || 'VARIOS'
    };
    if (isCreating) onAdd(finalProduct);
    else onEdit(finalProduct);
    setEditingProduct(null);
  };

  const executeDeleteAll = () => {
    if (deleteConfirmationText === 'ELIMINAR') {
      onImport([]);
      setShowDeleteAllModal(false);
      setDeleteConfirmationText('');
      alert("Base de datos de productos vaciada correctamente.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Cabecera */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button onClick={onBack} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-slate-600">
              <ArrowLeft size={24} />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Inventario Maestro</h1>
                <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 shadow-lg">
                  <Database size={10} /> {products.length} Items
                </span>
              </div>
              <p className="text-slate-500 text-xs font-bold uppercase opacity-60">Organización por Familias y Categorías</p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto flex-wrap justify-center">
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportCSV} />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm">
              <Upload size={16} /> Importar CSV
            </button>
            <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl hover:bg-emerald-600 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest shadow-sm">
              <FileSpreadsheet size={16} /> Exportar CSV
            </button>
            <button onClick={() => setShowDeleteAllModal(true)} disabled={products.length === 0} className="flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest shadow-sm disabled:opacity-30">
              <Trash2 size={16} /> Vaciar Todo
            </button>
            <button onClick={() => { setEditingProduct({ id: `p_${Date.now()}`, name: '', category: 'ALMACÉN', unit: 'kg', pricePerUnit: 0, allergens: [] }); setIsCreating(true); }} className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-black text-[10px] uppercase tracking-widest shadow-lg ml-auto md:ml-0">
              <Plus size={18} /> Nuevo Registro
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div className="mb-6">
           <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Filtrar por familia o nombre..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-sm shadow-sm focus:ring-2 focus:ring-slate-900 transition-all" />
           </div>
        </div>

        {/* Tabla de Productos */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase text-[9px] font-black tracking-widest">
              <tr>
                <th className="px-6 py-4 w-16">Nº</th>
                <th className="px-6 py-4">Género / Materia Prima</th>
                <th className="px-6 py-4">P. Mercado</th>
                <th className="px-6 py-4">Ud.</th>
                <th className="px-6 py-4">Alérgenos</th>
                <th className="px-6 py-4 text-right">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProducts.length > 0 ? filteredProducts.map((product, idx) => (
                <tr key={product.id} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black text-slate-300 bg-slate-100 w-8 h-8 flex items-center justify-center rounded-full">{idx + 1}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                       <span className="font-black text-slate-800 uppercase text-xs tracking-tight">{product.name}</span>
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-70">
                         {product.category || 'SIN FAMILIA'}
                       </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                    {product.pricePerUnit === 0 ? <span className="text-[10px] text-slate-300">N/D</span> : `${product.pricePerUnit.toFixed(3).replace('.', ',')}€`}
                  </td>
                  <td className="px-6 py-4 text-slate-400 font-black uppercase text-[10px]">{product.unit}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(product.allergens || []).length > 0 ? (
                        product.allergens.map(a => (
                          <div key={a} title={a}>
                            <AllergenIcon allergen={a} size={24} />
                          </div>
                        ))
                      ) : <Check size={14} className="text-green-300 opacity-50"/>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => { setEditingProduct({...product}); setIsCreating(false); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                      <button onClick={() => confirm(`¿Borrar ${product.name}?`) && onDelete(product.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                   <td colSpan={6} className="py-20 text-center">
                      <Database size={48} className="mx-auto text-slate-200 mb-4" strokeWidth={1} />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Sin resultados encontrados</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Borrado Total */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-rose-950/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden border-4 border-rose-500/20">
            <div className="bg-rose-600 text-white p-8 text-center">
              <AlertTriangle size={48} className="mx-auto mb-4 animate-bounce" />
              <h2 className="text-2xl font-black uppercase tracking-tighter">¿Vaciar Catálogo?</h2>
              <p className="text-rose-100 text-[10px] font-black uppercase tracking-widest mt-2">Esta acción borrará {products.length} productos</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex gap-4 items-center">
                 <AlertCircle size={24} className="text-rose-600 shrink-0" />
                 <p className="text-[11px] text-rose-800 font-bold leading-tight">
                   Si borras los productos, todas tus fichas de recetas perderán los precios asociados hasta que los vuelvas a importar.
                 </p>
              </div>
              <div className="text-center">
                 <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-[0.2em]">
                   Escribe <span className="text-rose-600">ELIMINAR</span> para confirmar
                 </label>
                 <input 
                  type="text" autoFocus value={deleteConfirmationText}
                  onChange={e => setDeleteConfirmationText(e.target.value.toUpperCase())}
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-center text-rose-600 text-xl outline-none focus:border-rose-500 transition-all uppercase"
                  placeholder="CONFIRMACIÓN"
                 />
              </div>
              <div className="flex gap-3">
                 <button onClick={() => { setShowDeleteAllModal(false); setDeleteConfirmationText(''); }} className="flex-1 px-4 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors">Cancelar</button>
                 <button onClick={executeDeleteAll} disabled={deleteConfirmationText !== 'ELIMINAR'} className={`flex-1 px-4 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${deleteConfirmationText === 'ELIMINAR' ? 'bg-rose-600 text-white shadow-xl hover:bg-rose-700' : 'bg-slate-50 text-slate-200 pointer-events-none'}`}>Borrar Todo</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor de Producto */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-slate-900 text-white px-8 py-5 flex justify-between items-center">
              <h2 className="text-xl font-black uppercase tracking-tighter">{isCreating ? 'Añadir Género' : 'Ficha de Registro'}</h2>
              <button onClick={() => setEditingProduct(null)}><X size={24}/></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Familia / Categoría de Pedido</label>
                <input required type="text" value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value.toUpperCase()})} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold uppercase outline-none focus:ring-2 focus:ring-slate-900" placeholder="Ej: CARNES, LÁCTEOS..." />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Nombre del Producto (Sin familia)</label>
                <input required type="text" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value.toUpperCase()})} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold uppercase outline-none focus:ring-2 focus:ring-slate-900" placeholder="Ej: SOLOMILLO DE TERNERA" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Precio Mercado €</label>
                  <div className="relative">
                    <input type="text" value={editingProduct.pricePerUnit} onChange={e => setEditingProduct({...editingProduct, pricePerUnit: e.target.value as any})} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-mono font-bold outline-none focus:ring-2 focus:ring-slate-900" placeholder="0.00" />
                    <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Unidad</label>
                  <select value={editingProduct.unit} onChange={e => setEditingProduct({...editingProduct, unit: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none">
                    <option value="kg">kg</option>
                    <option value="L">L</option>
                    <option value="unidad">unidad</option>
                    <option value="g">g</option>
                  </select>
                </div>
              </div>
              {editingProduct.unit === 'unidad' && (
                <div className="animate-fadeIn">
                  <label className="block text-[10px] font-black text-amber-600 uppercase mb-2">Peso por Unidad (gramos)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={editingProduct.weightPerUnit || ''} 
                      onChange={e => setEditingProduct({...editingProduct, weightPerUnit: parseFloat(e.target.value) || undefined})} 
                      className="w-full px-5 py-3 bg-amber-50 border border-amber-100 rounded-2xl font-mono font-bold outline-none focus:ring-2 focus:ring-amber-500" 
                      placeholder="Ej: 60" 
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-300 font-bold text-xs">g</span>
                  </div>
                  <p className="text-[9px] text-amber-500 font-bold mt-1 italic">Necesario para convertir de gramos a unidades automáticamente.</p>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Alérgenos Declarados</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 max-h-40 overflow-y-auto custom-scrollbar">
                  {ALLERGEN_LIST.map(a => {
                    const isSel = editingProduct.allergens.includes(a);
                    return (
                      <button key={a} type="button" onClick={() => toggleAllergen(a)} className={`px-3 py-2 rounded-xl text-[9px] font-black border transition-all uppercase flex items-center gap-2 ${isSel ? 'bg-white border-slate-900 text-slate-900 shadow-sm' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}>
                        <div className={isSel ? 'opacity-100' : 'opacity-30 grayscale'}>
                          <AllergenIcon allergen={a} size={18} />
                        </div>
                        <span className="truncate">{a}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all hover:bg-slate-800">Guardar en Catálogo</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
