import React, { useState, useEffect, useMemo } from 'react';
import { AppUser, Recipe } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { ArrowLeft, UserCheck, UserX, Shield, Trash2, Search, Loader2, BookOpen, Lock, Globe, MessageSquare } from 'lucide-react';

interface UserManagementProps {
  recipes: Recipe[];
  onBack: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ recipes, onBack }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as AppUser));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    return unsub;
  }, []);

  const toggleApproval = async (user: AppUser) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { isApproved: !user.isApproved });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const toggleRole = async (user: AppUser) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (window.confirm(`¿Cambiar rol de ${user.displayName} a ${newRole}?`)) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { role: newRole });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  const deleteUser = async (user: AppUser) => {
    if (window.confirm(`¿Eliminar permanentemente a ${user.displayName}? Sus fichas pasarán a la comunidad pendientes de revisión.`)) {
      try {
        // Transfer recipes to community
        const q = query(collection(db, 'recipes'), where('workspaceId', '==', user.workspaceId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.docs.forEach(d => {
            batch.update(d.ref, { workspaceId: 'community_pending', isPublic: false });
          });
          await batch.commit();
        }

        await deleteDoc(doc(db, 'users', user.uid));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}`);
      }
    }
  };

  const userRecipeStats = useMemo(() => {
    const stats: Record<string, { public: number, private: number }> = {};
    recipes.forEach(r => {
      // We need to know which user created which recipe. 
      // Currently Recipe doesn't have a 'creatorUid' field, but it has 'workspaceId'.
      // If we want per-user stats, we should have added 'creatorUid' to Recipe.
      // Let's check if we can use 'creator' name, but that's not reliable.
      // Wait, let's assume 'workspaceId' is the user's UID if they are not in a shared workspace.
      // Actually, let's look at how recipes are saved in App.tsx.
      // They are saved with workspaceId.
      const wsId = r.workspaceId;
      if (!stats[wsId]) stats[wsId] = { public: 0, private: 0 };
      if (r.isPublic) stats[wsId].public++;
      else stats[wsId].private++;
    });
    return stats;
  }, [recipes]);

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-slate-900 text-white px-6 py-8 shadow-xl">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-serif font-bold">Gestión de Usuarios</h1>
              <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Control de Acceso y Permisos</p>
            </div>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar usuario..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all"
            />
          </div>
        </div>
      </header>

      <main className="flex-grow p-6">
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="animate-spin text-amber-500 mb-4" size={40} />
              <p className="text-slate-500 font-medium">Cargando usuarios...</p>
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Usuario</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Espacio / Fichas</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Rol</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredUsers.map((u) => (
                      <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{u.displayName}</span>
                            <span className="text-xs text-slate-500">{u.email}</span>
                            {u.requestMessage && !u.isApproved && (
                              <div className="mt-2 text-[10px] bg-amber-50 border border-amber-200 text-amber-800 p-2 rounded-lg flex items-start gap-2 max-w-xs">
                                <MessageSquare size={12} className="shrink-0 mt-0.5" />
                                <span className="italic leading-tight">{u.requestMessage}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">WS: {u.workspaceId.slice(0,8)}...</span>
                            <div className="flex gap-3">
                               <div className="flex items-center gap-1 text-slate-600" title="Fichas Privadas">
                                  <Lock size={12} className="text-slate-300" />
                                  <span className="text-xs font-bold">{userRecipeStats[u.workspaceId]?.private || 0}</span>
                               </div>
                               <div className="flex items-center gap-1 text-indigo-600" title="Fichas Públicas">
                                  <Globe size={12} className="text-indigo-300" />
                                  <span className="text-xs font-bold">{userRecipeStats[u.workspaceId]?.public || 0}</span>
                               </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {u.isApproved ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-tighter">
                              <UserCheck size={12} /> Autorizado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-tighter">
                              <UserX size={12} /> Pendiente
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                            {u.role === 'admin' && <Shield size={12} />} {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => toggleApproval(u)}
                              className={`p-2 rounded-lg transition-colors ${u.isApproved ? 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
                              title={u.isApproved ? "Revocar Acceso" : "Autorizar Acceso"}
                            >
                              {u.isApproved ? <UserX size={16} /> : <UserCheck size={16} />}
                            </button>
                            <button 
                              onClick={() => toggleRole(u)}
                              className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors"
                              title="Cambiar Rol"
                            >
                              <Shield size={16} />
                            </button>
                            <button 
                              onClick={() => deleteUser(u)}
                              className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                              title="Eliminar Usuario"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredUsers.length === 0 && (
                <div className="py-20 text-center">
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No se encontraron usuarios</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
