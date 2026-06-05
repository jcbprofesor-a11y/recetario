
import React, { useState, useEffect } from 'react';
import { Recipe, AppSettings, AppBackup, Product, MenuPlan, DEFAULT_CATEGORIES, SubRecipe, AppUser } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Dashboard } from './components/Dashboard';
import { RecipeEditor } from './components/RecipeEditor';
import { RecipeView } from './components/RecipeView';
import { SettingsModal } from './components/SettingsModal';
import { MenuPlanner } from './components/MenuPlanner';
import { ProductDatabaseViewer } from './components/ProductDatabaseViewer';
import { LandingPage } from './components/LandingPage';
import { AIBridge } from './components/AIBridge';
import { UserManagement } from './components/UserManagement';
import { INITIAL_PRODUCT_DATABASE } from './data/products';
import { auth, db, loginWithGoogle, logout as firebaseLogout, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc, collection, deleteDoc, getDoc, updateDoc, query, where, getDocs, writeBatch, or, Query, DocumentData } from 'firebase/firestore';
import { ShieldAlert, LogOut, Loader2 } from 'lucide-react';

type ViewState = 'LANDING' | 'DASHBOARD' | 'EDITOR' | 'VIEWER' | 'MENU_PLANNER' | 'PRODUCT_DB' | 'AI_BRIDGE' | 'PENDING' | 'USER_MANAGEMENT';

const PendingMessageForm = ({ appUser }: { appUser: AppUser | null }) => {
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="mt-2 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
        Mensaje enviado correctamente. El administrador lo revisará pronto.
      </div>
    );
  }

  return (
    <div className="w-full mt-2">
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Escribe un mensaje al administrador (quién eres, por qué necesitas acceso...)"
        className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm mb-3 outline-none focus:border-amber-500 resize-none"
        rows={3}
      />
      <button
        onClick={async () => {
          if (!message.trim() || !appUser) return;
          try {
            await updateDoc(doc(db, 'users', appUser.uid), { requestMessage: message });
            setSent(true);
          } catch (e) {
            console.error(e);
          }
        }}
        className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition-colors text-sm"
      >
        Enviar Mensaje
      </button>
    </div>
  );
};

const defaultSettings: AppSettings = {
  instituteName: "IES La Flota",
  instituteLogo: "",
  categories: DEFAULT_CATEGORIES,
  categoryConfigs: DEFAULT_CATEGORIES.map(name => {
    const c = name.toLowerCase();
    let colors = ['#94a3b8'];
    if (c.includes('carne') || c.includes('ave')) colors = ['#f43f5e'];
    if (c.includes('pescado') || c.includes('marisco')) colors = ['#3b82f6'];
    if (c.includes('entrante') || c.includes('ensalada')) colors = ['#10b981'];
    if (c.includes('postre') || c.includes('dulce') || c.includes('pastelería')) colors = ['#f59e0b'];
    if (c.includes('salsa') || c.includes('guarnición')) colors = ['#6366f1'];
    if (c.includes('arroz') || c.includes('pasta')) colors = ['#f97316'];
    return { name, colors };
  })
};

function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [productDatabase, setProductDatabase] = useState<Product[]>(INITIAL_PRODUCT_DATABASE);
  const [savedMenus, setSavedMenus] = useState<MenuPlan[]>([]);
  
  const [viewState, setViewState] = useState<ViewState>('LANDING');
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Auth Listener
  useEffect(() => {
    let unsubUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // Check for invites first
        let inviteWorkspaceId: string | null = null;
        if (firebaseUser.email) {
          try {
            const invitesQuery = query(collection(db, 'workspace_invites'), where('email', '==', firebaseUser.email.toLowerCase()));
            const invitesSnap = await getDocs(invitesQuery);
            if (!invitesSnap.empty) {
              inviteWorkspaceId = invitesSnap.docs[0].data().workspaceId;
              await deleteDoc(invitesSnap.docs[0].ref);
            }
          } catch (e) { console.error("Invite check error:", e); }
        }

        // Real-time user profile listener
        unsubUser = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            let userData = docSnap.data() as AppUser;
            let needsUpdate = false;

            if (!userData.workspaceId) {
              userData.workspaceId = firebaseUser.uid;
              needsUpdate = true;
            }

            if (inviteWorkspaceId && userData.workspaceId !== inviteWorkspaceId) {
              userData.workspaceId = inviteWorkspaceId;
              userData.isApproved = true;
              needsUpdate = true;
            }

            if (needsUpdate) {
              await setDoc(userDocRef, userData);
            }
            setAppUser(userData);
          } else {
            const isAdminEmail = firebaseUser.email === 'jcbprofesor@gmail.com' || firebaseUser.email === 'juan.codina@murciaeduca.es';
            const newUser: AppUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || '',
              teacherName: firebaseUser.displayName || '',
              teacherLogo: '',
              isApproved: isAdminEmail || !!inviteWorkspaceId,
              role: isAdminEmail ? 'admin' : 'user',
              createdAt: Date.now(),
              workspaceId: inviteWorkspaceId || firebaseUser.uid
            };
            await setDoc(userDocRef, newUser);
            setAppUser(newUser);
          }
          setIsLoading(false);
        });
      } else {
        if (unsubUser) unsubUser();
        setAppUser(null);
        setViewState('LANDING');
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubUser) unsubUser();
    };
  }, []);

  // Firestore Sync
  useEffect(() => {
    const isAdminEmail = user?.email === 'jcbprofesor@gmail.com' || user?.email === 'juan.codina@murciaeduca.es';
    const isActuallyAdmin = appUser?.role === 'admin' || isAdminEmail;
    const isActuallyApproved = appUser?.isApproved || isAdminEmail;

    if (!user || (!isActuallyApproved && !isActuallyAdmin)) {
      if (user && appUser && !isActuallyApproved && !isActuallyAdmin) {
        setViewState('PENDING');
      }
      return;
    }

    setViewState('DASHBOARD');

    let recipesQuery: Query<DocumentData> = collection(db, 'recipes');
    if (!isActuallyAdmin && appUser?.workspaceId) {
      recipesQuery = query(collection(db, 'recipes'), or(
        where('workspaceId', '==', appUser.workspaceId),
        where('isPublic', '==', true)
      ));
    }

    const unsubRecipes = onSnapshot(recipesQuery, (snapshot: any) => {
      setRecipes(snapshot.docs.map((doc: any) => doc.data() as Recipe));
    }, (err: any) => handleFirestoreError(err, OperationType.LIST, 'recipes'));

    let productsQuery: Query<DocumentData> = collection(db, 'products');
    if (!isActuallyAdmin && appUser?.uid) {
      productsQuery = query(collection(db, 'products'), or(
        where('status', '==', 'approved'),
        where('requestedBy', '==', appUser.uid)
      ));
    }

    const unsubProducts = onSnapshot(productsQuery, (snapshot: any) => {
      if (snapshot.empty) {
        setProductDatabase([]);
      } else {
        setProductDatabase(snapshot.docs.map((doc: any) => doc.data() as Product));
      }
    }, (err: any) => handleFirestoreError(err, OperationType.LIST, 'products'));

    let menusQuery: Query<DocumentData> = collection(db, 'menuPlans');
    if (!isActuallyAdmin && appUser?.workspaceId) {
      menusQuery = query(collection(db, 'menuPlans'), where('workspaceId', '==', appUser.workspaceId));
    }

    const unsubMenus = onSnapshot(menusQuery, (snapshot: any) => {
      setSavedMenus(snapshot.docs.map((doc: any) => doc.data() as MenuPlan));
    }, (err: any) => handleFirestoreError(err, OperationType.LIST, 'menuPlans'));

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as AppSettings;
        // Migration: if categoryConfigs is missing, initialize it
        if (!data.categoryConfigs) {
          data.categoryConfigs = (data.categories || DEFAULT_CATEGORIES).map(name => {
            const c = name.toLowerCase();
            let colors = ['#94a3b8'];
            if (c.includes('carne') || c.includes('ave')) colors = ['#f43f5e'];
            if (c.includes('pescado') || c.includes('marisco')) colors = ['#3b82f6'];
            if (c.includes('entrante') || c.includes('ensalada')) colors = ['#10b981'];
            if (c.includes('postre') || c.includes('dulce') || c.includes('pastelería')) colors = ['#f59e0b'];
            if (c.includes('salsa') || c.includes('guarnición')) colors = ['#6366f1'];
            if (c.includes('arroz') || c.includes('pasta')) colors = ['#f97316'];
            return { name, colors };
          });
        }
        setSettings(data);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'settings/global'));

    return () => {
      unsubRecipes();
      unsubProducts();
      unsubMenus();
      unsubSettings();
    };
  }, [user, appUser]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error.code === 'auth/popup-blocked') {
        alert('El navegador ha bloqueado la ventana emergente. Por favor, permite las ventanas emergentes para este sitio.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        // Usuario cerró la ventana, no hacemos nada
      } else if (error.code === 'auth/unauthorized-domain') {
        alert('Este dominio no está autorizado en Firebase. Por favor, añade este dominio a la lista de dominios autorizados en la consola de Firebase.');
      } else {
        alert('Error al iniciar sesión: ' + (error.message || 'Error desconocido'));
      }
    }
  };

  const handleLogout = async () => {
    await firebaseLogout();
    setViewState('LANDING');
    setCurrentRecipe(null);
  };

  const handleCreateNew = () => { setCurrentRecipe(null); setViewState('EDITOR'); };

  const migrateRecipeIfNeeded = (r: Recipe): Recipe => {
    const legacy = r as any;
    const updatedSubRecipes = (legacy.subRecipes || []).map((sr: any) => {
      if (sr.photo !== undefined && sr.photos === undefined) {
        return { ...sr, photos: sr.photo ? [sr.photo] : [], photo: undefined };
      }
      return sr;
    });

    if (legacy.subRecipes && legacy.subRecipes.length > 0 && updatedSubRecipes === legacy.subRecipes) return r;

    return {
      ...r,
      creator: legacy.creator || appUser?.teacherName || appUser?.displayName || settings.instituteName,
      subRecipes: updatedSubRecipes.length > 0 ? updatedSubRecipes : [{
        id: 'legacy-1',
        name: 'Elaboración Principal',
        ingredients: legacy.ingredients || [],
        instructions: legacy.instructions || '',
        photos: legacy.photo ? [legacy.photo] : []
      }],
      platingInstructions: legacy.platingInstructions || ''
    };
  };

  const handleEdit = (recipe: Recipe) => {
    let recipeToEdit = migrateRecipeIfNeeded(recipe);
    if (appUser && recipeToEdit.workspaceId && recipeToEdit.workspaceId !== appUser.workspaceId) {
      // Duplicate community recipe
      recipeToEdit = {
        ...recipeToEdit,
        id: Date.now().toString(),
        workspaceId: appUser.workspaceId,
        isPublic: false,
        originalAuthor: recipeToEdit.creator,
        name: `${recipeToEdit.name} (Copia)`
      };
    }
    setCurrentRecipe(recipeToEdit);
    setViewState('EDITOR');
  };

  const handleView = (recipe: Recipe) => {
    setCurrentRecipe(migrateRecipeIfNeeded(recipe));
    setViewState('VIEWER');
    
    // Update lastModified on view if it's our recipe
    if (appUser && recipe.workspaceId === appUser.workspaceId) {
      updateDoc(doc(db, 'recipes', recipe.id), { lastModified: Date.now() }).catch(console.error);
    }
  };

  const handleSave = async (recipe: Recipe) => {
    try {
      if (!appUser) return;
      const recipeToSave = JSON.parse(JSON.stringify({
        ...recipe,
        workspaceId: recipe.workspaceId || appUser.workspaceId,
        isPublic: recipe.isPublic || false,
        creator: appUser.teacherName || appUser.displayName || recipe.creator,
        creatorLogo: appUser.teacherLogo || recipe.creatorLogo || '',
        lastModified: Date.now()
      }));
      await setDoc(doc(db, 'recipes', recipeToSave.id), recipeToSave);
      setViewState('DASHBOARD');
      setCurrentRecipe(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `recipes/${recipe.id}`);
    }
  };

  const handleTogglePublic = async (recipe: Recipe) => {
    try {
      const newIsPublic = !recipe.isPublic;
      await updateDoc(doc(db, 'recipes', recipe.id), { isPublic: newIsPublic });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `recipes/${recipe.id}`);
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta receta?')) {
      try {
        await deleteDoc(doc(db, 'recipes', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `recipes/${id}`);
      }
    }
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    try {
      await setDoc(doc(db, 'settings', 'global'), newSettings);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/global');
    }
  };

  const handleUpdateUser = async (updatedUser: Partial<AppUser>) => {
    if (!appUser) return;
    try {
      await updateDoc(doc(db, 'users', appUser.uid), updatedUser);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${appUser.uid}`);
    }
  };

  const handleDeleteAccount = async () => {
    if (!appUser || !auth.currentUser) return;
    if (!window.confirm("¿Estás seguro de que quieres eliminar tu cuenta? Perderás el acceso, pero tus fichas pasarán a la comunidad para ser revisadas por el administrador.")) return;

    try {
      // Transfer recipes
      const q = query(collection(db, 'recipes'), where('workspaceId', '==', appUser.workspaceId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach(d => {
          batch.update(d.ref, { workspaceId: 'community_pending', isPublic: false });
        });
        await batch.commit();
      }

      // Delete user doc
      await deleteDoc(doc(db, 'users', appUser.uid));

      // Delete auth user
      await auth.currentUser.delete();
      setAppUser(null);
      setViewState('LANDING');
    } catch (e: any) {
      if (e.code === 'auth/requires-recent-login') {
        alert("Por seguridad, necesitas volver a iniciar sesión antes de eliminar tu cuenta.");
        auth.signOut();
      } else {
        console.error(e);
        alert("Hubo un error al eliminar la cuenta.");
      }
    }
  };

  const handleInviteUser = async (email: string) => {
    if (!appUser) return;
    try {
      const inviteId = Date.now().toString();
      await setDoc(doc(db, 'workspace_invites', inviteId), {
        email: email.toLowerCase(),
        workspaceId: appUser.workspaceId,
        inviterName: appUser.displayName || appUser.email,
        createdAt: Date.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `workspace_invites/${email}`);
    }
  };

  const handleSaveProduct = async (product: Product) => {
    try {
      if (!appUser) return;
      const isActuallyAdmin = appUser.role === 'admin' || appUser.email === 'jcbprofesor@gmail.com' || appUser.email === 'juan.codina@murciaeduca.es';
      const productToSave = {
        ...product,
        status: isActuallyAdmin ? 'approved' : (product.status || 'pending'),
        requestedBy: product.requestedBy || appUser.uid
      };
      await setDoc(doc(db, 'products', productToSave.id), productToSave);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `products/${product.id}`);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
    }
  };

  const handleSaveMenu = async (menu: MenuPlan) => {
    try {
      if (!appUser) return;
      const menuToSave = {
        ...menu,
        workspaceId: menu.workspaceId || appUser.workspaceId
      };
      await setDoc(doc(db, 'menuPlans', menuToSave.id), menuToSave);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `menuPlans/${menu.id}`);
    }
  };

  const handleDeleteMenu = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'menuPlans', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `menuPlans/${id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin mb-4 text-amber-500" size={48} />
        <p className="text-slate-400 font-medium">Cargando aplicación...</p>
      </div>
    );
  }

  return (
    <>
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        recipes={recipes}
        productDatabase={productDatabase}
        savedMenus={savedMenus}
        appUser={appUser}
        onSave={handleSaveSettings}
        onUpdateUser={handleUpdateUser}
        onInviteUser={handleInviteUser}
        onDeleteAccount={handleDeleteAccount}
        onRestore={async (backup: any) => {
          try {
            let count = 0;
            const batchLimit = 400; // Keep safely below the 500 Firestore limit
            let batch = writeBatch(db);
            let currentBatchOperations = 0;

            const addRefToBatch = async (ref: any, data: any) => {
              batch.set(ref, data);
              currentBatchOperations++;
              count++;
              if (currentBatchOperations >= batchLimit) {
                await batch.commit();
                batch = writeBatch(db);
                currentBatchOperations = 0;
              }
            };

            if (backup.recipes) {
              for (const r of backup.recipes) {
                await addRefToBatch(doc(db, 'recipes', r.id), r);
              }
            }
            if (backup.productDatabase) {
              for (const p of backup.productDatabase) {
                await addRefToBatch(doc(db, 'products', p.id), p);
              }
            }
            if (backup.savedMenus) {
              for (const m of backup.savedMenus) {
                await addRefToBatch(doc(db, 'menuPlans', m.id), m);
              }
            }
            if (backup.settings) {
              await addRefToBatch(doc(db, 'settings', 'global'), backup.settings);
            }

            // Admin only data
            const isActuallyAdmin = appUser?.role === 'admin' || appUser?.email === 'jcbprofesor@gmail.com' || appUser?.email === 'juan.codina@murciaeduca.es';
            if (isActuallyAdmin) {
              if (backup.users) {
                for (const u of backup.users) {
                  await addRefToBatch(doc(db, 'users', u.uid), u);
                }
              }
              if (backup.invites) {
                for (const i of backup.invites) {
                  const inviteId = i.id || `${i.email}_${i.workspaceId}`;
                  await addRefToBatch(doc(db, 'workspace_invites', inviteId), i);
                }
              }
            }

            // Commit the remaining batch if any
            if (currentBatchOperations > 0) {
              await batch.commit();
            }

            alert(`Restauración completada: ${count} elementos procesados.`);
            setIsSettingsOpen(false);
          } catch (err) {
            console.error("Error restoring backup:", err);
            alert("Error al restaurar la copia de seguridad. Revisa la consola.");
          }
        }}
      />

      {viewState === 'LANDING' ? (
        <LandingPage settings={settings} appUser={appUser} onEnter={handleLogin} />
      ) : viewState === 'PENDING' ? (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-amber-500/10 p-6 rounded-full border border-amber-500/20 mb-8">
            <ShieldAlert size={64} className="text-amber-500" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-white mb-4">Acceso Restringido</h1>
          <p className="text-slate-400 max-w-md mb-8 leading-relaxed">
            Hola <span className="text-white font-bold">{user?.displayName}</span>. Tu cuenta ha sido registrada correctamente, pero necesitas la aprobación de un administrador para acceder al sistema.
          </p>
          <div className="flex flex-col gap-4 w-full max-w-xs">
            <div className="bg-slate-900 border border-white/5 p-4 rounded-xl text-sm text-slate-500 italic">
              "Ponte en contacto con Juan Codina para que autorice tu acceso."
            </div>
            
            <PendingMessageForm appUser={appUser} />

            <button 
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
            >
              <LogOut size={18} /> Cerrar Sesión
            </button>
          </div>
        </div>
      ) : viewState === 'VIEWER' && currentRecipe ? (
        <RecipeView recipe={currentRecipe} onBack={() => setViewState('DASHBOARD')} settings={settings} onEdit={handleEdit} appUser={appUser} />
      ) : viewState === 'EDITOR' ? (
        <RecipeEditor 
          initialRecipe={currentRecipe} 
          productDatabase={productDatabase} 
          settings={settings} 
          appUser={appUser}
          onSave={handleSave} 
          onCancel={() => setViewState('DASHBOARD')} 
          onAddProduct={handleSaveProduct}
        />
      ) : viewState === 'AI_BRIDGE' ? (
        <AIBridge 
          settings={settings}
          appUser={appUser}
          onBack={() => setViewState('DASHBOARD')}
          onImport={async (recipe) => {
            await handleSave(recipe);
            setViewState('DASHBOARD');
          }}
        />
      ) : viewState === 'MENU_PLANNER' ? (
        <MenuPlanner 
          recipes={recipes} 
          settings={settings} 
          appUser={appUser}
          onBack={() => setViewState('DASHBOARD')} 
          productDatabase={productDatabase}
          savedMenus={savedMenus}
          onSaveMenu={handleSaveMenu}
          onDeleteMenu={handleDeleteMenu}
          onUpdateRecipe={handleSave}
        />
      ) : viewState === 'PRODUCT_DB' ? (
        <ProductDatabaseViewer 
          products={productDatabase} 
          appUser={appUser}
          onBack={() => setViewState('DASHBOARD')} 
          onAdd={handleSaveProduct} 
          onEdit={handleSaveProduct} 
          onDelete={handleDeleteProduct} 
          onImport={async (list) => {
            for (const p of list) await handleSaveProduct(p);
          }} 
        />
      ) : viewState === 'USER_MANAGEMENT' ? (
        <UserManagement recipes={recipes} onBack={() => setViewState('DASHBOARD')} />
      ) : (
        <Dashboard 
          recipes={recipes} 
          settings={settings} 
          savedMenus={savedMenus}
          productDatabase={productDatabase}
          appUser={appUser}
          onNew={handleCreateNew} 
          onEdit={handleEdit} 
          onView={handleView} 
          onDelete={handleDeleteRecipe} 
          onTogglePublic={handleTogglePublic}
          onImport={handleSave} 
          onOpenSettings={() => setIsSettingsOpen(true)} 
          onOpenMenuPlanner={() => setViewState('MENU_PLANNER')} 
          onOpenProductDB={() => setViewState('PRODUCT_DB')} 
          onOpenAIBridge={() => setViewState('AI_BRIDGE')}
          onOpenUserManagement={() => setViewState('USER_MANAGEMENT')}
          onLogout={handleLogout} 
        />
      )}
    </>
  );
}

export default App;
