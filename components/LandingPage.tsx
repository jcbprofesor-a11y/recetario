import React from 'react';
import { AppSettings, AppUser } from '../types';
import { 
  ArrowRight, 
  School, 
  User, 
  BookOpen, 
  ShieldAlert, 
  CalendarDays, 
  Database,
  UtensilsCrossed
} from 'lucide-react';

interface LandingPageProps {
  settings: AppSettings;
  appUser: AppUser | null;
  onEnter: () => void;
}

const FEATURES = [
  {
    icon: <BookOpen className="text-amber-400" size={32} />,
    title: "Fichas Técnicas",
    desc: "Crea recetas compuestas con escandallos precisos, fotos y control de costes."
  },
  {
    icon: <ShieldAlert className="text-red-400" size={32} />,
    title: "Control Alérgenos",
    desc: "Detección automática de alérgenos basada en la base de datos de ingredientes."
  },
  {
    icon: <CalendarDays className="text-blue-400" size={32} />,
    title: "Planificador de Menús",
    desc: "Organiza servicios completos y genera órdenes de trabajo al instante."
  },
  {
    icon: <Database className="text-emerald-400" size={32} />,
    title: "Base de Datos",
    desc: "Gestión centralizada de más de 1700 materias primas y productos."
  }
];

export const LandingPage: React.FC<LandingPageProps> = ({ settings, appUser, onEnter }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 relative overflow-hidden flex flex-col font-sans selection:bg-amber-500/30">
      
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-indigo-900/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-900/10 rounded-full blur-3xl pointer-events-none"></div>
      
      {/* Texture overlay */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>

      {/* Header / Navbar */}
      <nav className="relative z-10 w-full px-6 py-6 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-white/5 bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
           <div className="bg-white/10 p-2 rounded-lg border border-white/10">
              {settings.instituteLogo ? (
                <img src={settings.instituteLogo} alt="IES" className="h-10 w-auto object-contain" />
              ) : (
                <School className="text-slate-400" size={32} />
              )}
           </div>
           <div className="text-left">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Centro Educativo</p>
              <h2 className="text-lg font-serif font-bold text-white leading-none">{settings.instituteName}</h2>
           </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="text-right hidden md:block">
              <p className="text-[10px] uppercase tracking-widest text-amber-500 font-bold">Profesor Responsable</p>
              <h2 className="text-lg font-medium text-white leading-none">{appUser?.teacherName || appUser?.displayName}</h2>
           </div>
           <div className="h-12 w-12 rounded-full border-2 border-slate-700 overflow-hidden bg-slate-800 shadow-lg">
              {appUser?.teacherLogo ? (
                <img src={appUser.teacherLogo} alt="Profe" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><User size={20} className="text-slate-500"/></div>
              )}
           </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center relative z-10 px-4 py-16 md:py-20">
        
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-20 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest mb-6 shadow-sm shadow-amber-900/20">
            <UtensilsCrossed size={12} /> Gestión Gastronómica Integral v2.0
          </div>
          
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 leading-tight tracking-tight">
            Digitaliza tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">Cocina</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            La herramienta definitiva para escuelas de hostelería. 
            Crea fichas técnicas profesionales, gestiona alérgenos automáticamente y planifica tus servicios con precisión milimétrica.
          </p>

          <button 
            onClick={onEnter}
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-slate-900 rounded-xl font-bold text-lg hover:bg-amber-50 transition-all hover:scale-105 shadow-xl"
          >
            Iniciar Sesión con Google
            <div className="bg-slate-900 rounded-full p-1 group-hover:translate-x-1 transition-transform">
               <ArrowRight size={16} className="text-white" />
            </div>
          </button>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl mx-auto px-4">
          {FEATURES.map((feat, idx) => (
            <div 
              key={idx} 
              className="bg-slate-900/50 backdrop-blur-sm border border-white/5 p-6 rounded-2xl hover:bg-slate-800/50 hover:border-amber-500/30 transition-all duration-300 group hover:-translate-y-2 shadow-lg"
            >
              <div className="bg-slate-950 w-14 h-14 rounded-xl flex items-center justify-center mb-4 border border-white/5 group-hover:border-amber-500/20 shadow-inner transition-colors">
                {feat.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-2 font-serif">{feat.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>

      </main>

      {/* Author Footer */}
      <footer className="relative z-10 bg-slate-950 py-12 flex flex-col items-center border-t border-white/5">
        
        <p className="text-[10px] uppercase tracking-[0.2em] text-indigo-400 font-bold mb-6">Created by</p>
        
        <div className="bg-slate-900 rounded-2xl p-1.5 pr-8 flex items-center gap-4 border border-slate-800 shadow-2xl hover:border-indigo-500/30 transition-all duration-300 group">
          <div className="h-16 w-16 rounded-xl bg-white p-0.5 flex items-center justify-center overflow-hidden relative shadow-inner">
             <img 
               src="https://lh3.googleusercontent.com/d/1DkCOqFGdw3PZbyNUnTQNgeaAGjBfv1_e" 
               alt="Juan Codina" 
               className="w-full h-full object-contain"
             />
          </div>
          
          <div className="text-left">
            <h3 className="text-xl font-serif font-bold text-white leading-tight group-hover:text-indigo-200 transition-colors">Juan Codina</h3>
            <p className="text-xs text-slate-500 font-medium">Original Design & Development</p>
          </div>
        </div>

        <div className="mt-12 text-[10px] text-slate-600">
          © {new Date().getFullYear()} {settings.instituteName} • Departamento de Hostelería
        </div>
      </footer>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
};