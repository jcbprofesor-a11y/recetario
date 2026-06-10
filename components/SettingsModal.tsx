
import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, AppBackup, Recipe, Product, AppUser, MenuPlan } from '../types';
import { X, Save, Upload, School, User, Database, Download, Tag, Plus, Trash2, Edit3, Mail } from 'lucide-react';
import { compressImage } from '../lib/imageUtils';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  recipes: Recipe[];
  productDatabase: Product[];
  savedMenus: MenuPlan[];
  appUser: AppUser | null;
  onSave: (settings: AppSettings) => void;
  onUpdateUser: (user: Partial<AppUser>) => void;
  onRestore: (backup: AppBackup) => void;
  onInviteUser: (email: string) => void;
  onDeleteAccount: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, recipes, productDatabase, savedMenus, appUser, onSave, onUpdateUser, onRestore, onInviteUser, onDeleteAccount }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [localUser, setLocalUser] = useState<Partial<AppUser>>(appUser || {});
  const [newCat, setNewCat] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [backupOptions, setBackupOptions] = useState({
    recipes: true,
    products: true,
    menus: true,
    settings: true,
    users: false,
    invites: false
  });
  const backupInputRef = useRef<HTMLInputElement>(null);

  const isActuallyAdmin = appUser?.role === 'admin' || appUser?.email?.toLowerCase() === 'jcbprofesor@gmail.com' || appUser?.email?.toLowerCase() === 'juan.codina@murciaeduca.es';

  useEffect(() => {
    setLocalSettings(settings);
    if (appUser) setLocalUser(appUser);
  }, [settings, appUser, isOpen]);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'teacherLogo' | 'instituteLogo') => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 400, 400);
        setLocalUser(prev => ({ ...prev, [field]: compressed }));
      } catch (error) {
        console.error("Error compressing image:", error);
      }
    }
  };

  const handleSave = () => {
    onSave(localSettings);
    onUpdateUser(localUser);
    onClose();
  };

  const handleDownloadBackup = async () => {
    // Filter recipes if not admin
    const filteredRecipes = isActuallyAdmin 
      ? recipes 
      : recipes.filter(r => r.workspaceId === appUser?.workspaceId);

    const backup: any = {
      version: 2,
      timestamp: Date.now(),
    };

    if (backupOptions.settings) backup.settings = localSettings;
    if (backupOptions.recipes) backup.recipes = filteredRecipes;
    if (backupOptions.products) backup.productDatabase = productDatabase;
    if (backupOptions.menus) {
      backup.savedMenus = isActuallyAdmin 
        ? savedMenus 
        : savedMenus.filter(m => m.workspaceId === appUser?.workspaceId);
    }

    // If admin and requested, fetch users and invites
    if (isActuallyAdmin) {
      try {
        if (backupOptions.users) {
          const usersSnap = await getDocs(collection(db, 'users'));
          backup.users = usersSnap.docs.map(d => ({ ...d.data(), uid: d.id }));
        }
        if (backupOptions.invites) {
          const invitesSnap = await getDocs(collection(db, 'workspace_invites'));
          backup.invites = invitesSnap.docs.map(d => ({ ...d.data(), id: d.id }));
        }
      } catch (e) {
        console.error("Error fetching admin data for backup:", e);
      }
    }

    const jsonString = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    const prefix = isActuallyAdmin ? 'FULL_DATABASE' : 'MIS_RECETAS';
    downloadAnchorNode.download = `${prefix}_backup_${dateStr}.json`;
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    document.body.removeChild(downloadAnchorNode);
    URL.revokeObjectURL(url);
  };

  const addCategory = () => {
    if (newCat.trim()) {
      const name = newCat.trim();
      setLocalSettings({
        ...localSettings,
        categories: [...(localSettings.categories || []), name],
        categoryConfigs: [...(localSettings.categoryConfigs || []), { name, colors: ['#94a3b8'] }]
      });
      setNewCat('');
    }
  };

  const updateCategory = (index: number, newName: string) => {
    const oldName = localSettings.categories[index];
    const updated = [...localSettings.categories];
    updated[index] = newName;
    
    const configs = [...(localSettings.categoryConfigs || [])];
    const configIdx = configs.findIndex(c => c.name === oldName);
    if (configIdx !== -1) {
      configs[configIdx].name = newName;
    } else {
      configs.push({ name: newName, colors: ['#94a3b8'] });
    }
    
    setLocalSettings({ ...localSettings, categories: updated, categoryConfigs: configs });
  };

  const removeCategory = (cat: string) => {
    if (confirm(`¿Eliminar la categoría "${cat}"?`)) {
      setLocalSettings({
        ...localSettings,
        categories: localSettings.categories.filter(c => c !== cat),
        categoryConfigs: (localSettings.categoryConfigs || []).filter(c => c.name !== cat)
      });
    }
  };

  const updateCategoryColors = (catName: string, colors: string[]) => {
    const configs = [...(localSettings.categoryConfigs || [])];
    const idx = configs.findIndex(c => c.name === catName);
    if (idx !== -1) {
      configs[idx].colors = colors;
    } else {
      configs.push({ name: catName, colors });
    }
    setLocalSettings({ ...localSettings, categoryConfigs: configs });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2">Configuración General</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold border-b pb-2 mb-4">
                <School size={18} className="text-amber-500" /> Escuela / Centro
              </div>
              <input type="text" value={localUser.instituteName || ''} onChange={e => setLocalUser({...localUser, instituteName: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Nombre IES..." />
              <div className="relative aspect-video bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                {localUser.instituteLogo ? <img src={localUser.instituteLogo} className="h-full w-full object-contain p-2" /> : <div className="text-gray-400 text-xs text-center"><Upload className="mx-auto mb-1"/>Logo Centro</div>}
                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'instituteLogo')} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold border-b pb-2 mb-4">
                <User size={18} className="text-amber-500" /> Profesor / Responsable
              </div>
              <input type="text" value={localUser.teacherName || ''} onChange={e => setLocalUser({...localUser, teacherName: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Nombre..." />
              <div className="relative aspect-square w-32 mx-auto bg-gray-100 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                {localUser.teacherLogo ? <img src={localUser.teacherLogo} className="h-full w-full object-cover" /> : <div className="text-gray-400 text-xs text-center"><Upload className="mx-auto mb-1"/>Foto</div>}
                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'teacherLogo')} />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
             <div className="flex items-center gap-2 text-slate-800 font-bold mb-4">
                <Tag size={18} className="text-indigo-500" /> Gestión de Categorías
             </div>
             <div className="space-y-4">
                <div className="flex gap-2 mb-4">
                   <input type="text" value={newCat} onChange={e => setNewCat(e.target.value)} className="flex-grow px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Nueva categoría..." />
                   <button onClick={addCategory} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all hover:bg-slate-800"><Plus size={16}/> Añadir</button>
                </div>
                <div className="grid grid-cols-1 gap-3">
                   {localSettings.categories?.map((c, idx) => {
                     const config = localSettings.categoryConfigs?.find(conf => conf.name === c) || { name: c, colors: ['#94a3b8'] };
                     return (
                       <div key={idx} className="bg-slate-50 px-4 py-3 rounded-2xl flex flex-col gap-3 border border-slate-200">
                          <div className="flex items-center gap-2">
                            <input 
                              type="text" 
                              value={c} 
                              onChange={(e) => updateCategory(idx, e.target.value)} 
                              className="bg-transparent border-none text-xs font-black text-slate-800 flex-grow focus:ring-0 p-0 uppercase tracking-tight"
                            />
                            <button onClick={() => removeCategory(c)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                          </div>
                          
                          <div className="flex items-center gap-2">
                             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Colores Identificativos:</span>
                             <div className="flex gap-1.5 items-center">
                                {config.colors.map((color, cIdx) => (
                                  <div key={cIdx} className="relative group/color">
                                    <input 
                                      type="color" 
                                      value={color} 
                                      onChange={(e) => {
                                        const newColors = [...config.colors];
                                        newColors[cIdx] = e.target.value;
                                        updateCategoryColors(c, newColors);
                                      }}
                                      className="w-6 h-6 rounded-full border-2 border-white shadow-sm cursor-pointer overflow-hidden p-0"
                                    />
                                    {config.colors.length > 1 && (
                                      <button 
                                        onClick={() => {
                                          const newColors = config.colors.filter((_, i) => i !== cIdx);
                                          updateCategoryColors(c, newColors);
                                        }}
                                        className="absolute -top-1 -right-1 bg-white text-slate-400 rounded-full shadow-sm hover:text-rose-500 opacity-0 group-hover/color:opacity-100 transition-opacity"
                                      >
                                        <X size={10} />
                                      </button>
                                    )}
                                  </div>
                                ))}
                                {config.colors.length < 3 && (
                                  <button 
                                    onClick={() => updateCategoryColors(c, [...config.colors, '#94a3b8'])}
                                    className="w-6 h-6 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all"
                                  >
                                    <Plus size={12} />
                                  </button>
                                )}
                             </div>
                             
                             {/* Vista previa de la franja */}
                             <div className="ml-auto flex h-3 w-16 rounded-full overflow-hidden border border-white shadow-sm">
                                {config.colors.map((color, cIdx) => (
                                  <div key={cIdx} style={{ backgroundColor: color }} className="flex-grow h-full" />
                                ))}
                             </div>
                          </div>
                       </div>
                     );
                   })}
                </div>
             </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
             <div className="flex items-center gap-2 text-slate-800 font-bold mb-4">
                <Mail size={18} className="text-emerald-500" /> Equipo y Colaboradores
             </div>
             <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
                <p className="text-xs text-emerald-800 mb-3">
                  Invita a otros profesores o alumnos a tu espacio de trabajo. Compartirán tus recetas y menús.
                </p>
                <div className="flex gap-2">
                  <input 
                    type="email" 
                    placeholder="Email del colaborador" 
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    className="flex-grow px-3 py-2 border border-emerald-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button 
                    onClick={() => {
                      if (inviteEmail) {
                        onInviteUser(inviteEmail);
                        setInviteEmail('');
                        alert('Invitación enviada. Cuando el usuario inicie sesión, se unirá a tu espacio.');
                      }
                    }}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors"
                  >
                    Invitar
                  </button>
                </div>
             </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
             <div className="flex items-center gap-2 text-slate-800 font-bold mb-4">
                <Database size={18} className="text-blue-500" /> Datos y Backup
             </div>
             
             <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
                <div className="flex flex-col gap-4">
                  <div className="text-xs text-blue-800">
                    <p className="font-bold">Copia de Seguridad {isActuallyAdmin ? 'Integral' : 'Personal'}</p>
                    <p className="opacity-80">
                      {isActuallyAdmin 
                        ? 'Como administrador, puedes descargar toda la base de datos o seleccionar partes específicas.' 
                        : 'Descarga una copia de tus recetas y productos.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-50 transition-colors">
                      <input type="checkbox" checked={backupOptions.recipes} onChange={e => setBackupOptions({...backupOptions, recipes: e.target.checked})} className="rounded text-blue-600" />
                      <span className="text-[10px] font-bold text-slate-600 uppercase">Recetas</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-50 transition-colors">
                      <input type="checkbox" checked={backupOptions.products} onChange={e => setBackupOptions({...backupOptions, products: e.target.checked})} className="rounded text-blue-600" />
                      <span className="text-[10px] font-bold text-slate-600 uppercase">Productos</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-50 transition-colors">
                      <input type="checkbox" checked={backupOptions.menus} onChange={e => setBackupOptions({...backupOptions, menus: e.target.checked})} className="rounded text-blue-600" />
                      <span className="text-[10px] font-bold text-slate-600 uppercase">Menús</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-50 transition-colors">
                      <input type="checkbox" checked={backupOptions.settings} onChange={e => setBackupOptions({...backupOptions, settings: e.target.checked})} className="rounded text-blue-600" />
                      <span className="text-[10px] font-bold text-slate-600 uppercase">Ajustes</span>
                    </label>
                    {isActuallyAdmin && (
                      <>
                        <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-50 transition-colors">
                          <input type="checkbox" checked={backupOptions.users} onChange={e => setBackupOptions({...backupOptions, users: e.target.checked})} className="rounded text-blue-600" />
                          <span className="text-[10px] font-bold text-slate-600 uppercase">Usuarios</span>
                        </label>
                        <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-50 transition-colors">
                          <input type="checkbox" checked={backupOptions.invites} onChange={e => setBackupOptions({...backupOptions, invites: e.target.checked})} className="rounded text-blue-600" />
                          <span className="text-[10px] font-bold text-slate-600 uppercase">Invitaciones</span>
                        </label>
                      </>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-blue-100">
                    <button onClick={handleDownloadBackup} className="flex-grow py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2 text-xs font-bold hover:bg-blue-700 transition-colors">
                      <Download size={14}/> Exportar Selección
                    </button>
                    <button onClick={() => backupInputRef.current?.click()} className="flex-grow py-2 bg-white border border-blue-200 text-blue-700 rounded-lg flex items-center justify-center gap-2 text-xs font-bold hover:bg-blue-50 transition-colors">
                      <Upload size={14}/> Importar Backup
                    </button>
                    <input type="file" ref={backupInputRef} className="hidden" accept=".json" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => onRestore(JSON.parse(event.target?.result as string));
                        reader.readAsText(file);
                      }
                    }} />
                  </div>
                </div>
             </div>
             <div className="bg-rose-50 border border-rose-100 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-xs text-rose-800 flex-grow">
                  <p className="font-bold">Zona de Peligro</p>
                  <p className="opacity-80">Eliminar cuenta permanentemente. Tus fichas pasarán a la comunidad.</p>
                </div>
                <button onClick={onDeleteAccount} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-colors flex items-center gap-2">
                  <Trash2 size={14} /> Eliminar mi cuenta
                </button>
             </div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cerrar</button>
          <button onClick={handleSave} className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 font-bold">
            <Save size={18} /> Guardar Ajustes
          </button>
        </div>
      </div>
    </div>
  );
};
