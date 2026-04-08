import React from 'react';
import { 
  Mail, 
  BarChart3, 
  ShieldCheck, 
  FileEdit, 
  Database,
  ArrowUpRight
} from 'lucide-react';
import { ModuleId, MODULES } from '../types';
import { motion } from 'motion/react';

interface DashboardProps {
  onModuleSelect: (id: ModuleId) => void;
}

const iconMap: Record<string, React.ElementType> = {
  Mail,
  BarChart3,
  ShieldCheck,
  FileEdit,
  Database,
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function Dashboard({ onModuleSelect }: DashboardProps) {
  return (
    <div className="max-w-6xl mx-auto py-12 px-8">
      <header className="mb-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-5xl font-bold mb-2 tracking-tight">Contract Admin QS</h1>
          <div className="flex items-center gap-4">
            <h2 className="text-xl text-gold-accent font-medium">FIDIC Marine & Infrastructure | UAE & KSA</h2>
            <div className="h-px flex-1 bg-navy-border" />
          </div>
        </motion.div>
      </header>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {MODULES.map((module) => {
          const Icon = iconMap[module.icon];
          return (
            <motion.button
              key={module.id}
              variants={item}
              onClick={() => onModuleSelect(module.id)}
              className="group relative bg-navy-card border border-navy-border p-8 rounded-2xl text-left transition-all duration-300 hover:border-gold-accent/50 hover:shadow-[0_0_30px_rgba(212,168,67,0.1)] overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowUpRight className="w-5 h-5 text-gold-accent" />
              </div>
              
              <div className="w-14 h-14 bg-navy-deep border border-navy-border rounded-xl flex items-center justify-center mb-6 group-hover:border-gold-accent/50 transition-colors">
                <Icon className="w-7 h-7 text-gold-accent" />
              </div>
              
              <h3 className="text-xl font-bold mb-3 group-hover:text-gold-accent transition-colors">{module.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {module.description}
              </p>
              
              <div className="mt-8 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-gold-accent transition-colors">
                <span>Launch Module</span>
                <div className="h-px w-8 bg-navy-border group-hover:bg-gold-accent/50 transition-colors" />
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      <footer className="mt-20 pt-8 border-t border-navy-border flex justify-between items-center text-gray-500 text-xs font-mono">
        <div>SYSTEM STATUS: <span className="text-green-500">OPERATIONAL</span></div>
        <div>REF: FIDIC-RED-BOOK-2017-V2</div>
        <div>© 2026 CONTRACT ADMIN QS</div>
      </footer>
    </div>
  );
}
