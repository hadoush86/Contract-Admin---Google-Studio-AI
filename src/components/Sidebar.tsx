import React from 'react';
import { 
  Mail, 
  BarChart3, 
  ShieldCheck, 
  FileEdit, 
  Database, 
  LayoutDashboard,
  ChevronRight
} from 'lucide-react';
import { ModuleId, MODULES } from '../types';
import { motion } from 'motion/react';

interface SidebarProps {
  activeModule: ModuleId;
  setActiveModule: (id: ModuleId) => void;
}

const iconMap: Record<string, React.ElementType> = {
  Mail,
  BarChart3,
  ShieldCheck,
  FileEdit,
  Database,
};

export default function Sidebar({ activeModule, setActiveModule }: SidebarProps) {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 bg-navy-card border-r border-navy-border flex-col h-screen sticky top-0 shrink-0">
        <div className="p-6 border-b border-navy-border">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-gold-accent rounded flex items-center justify-center">
              <ShieldCheck className="text-navy-deep w-5 h-5" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">Contract Admin</h1>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold-accent font-semibold">
            UAE / KSA Edition
          </p>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => setActiveModule('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
              activeModule === 'dashboard'
                ? 'bg-gold-accent text-navy-deep shadow-[0_0_15px_rgba(212,168,67,0.3)]'
                : 'text-gray-400 hover:bg-navy-border hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
            {activeModule === 'dashboard' && (
              <motion.div layoutId="active-indicator" className="ml-auto">
                <ChevronRight className="w-4 h-4" />
              </motion.div>
            )}
          </button>

          <div className="pt-4 pb-2 px-4">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Modules</span>
          </div>

          {MODULES.map((module) => {
            const Icon = iconMap[module.icon];
            const isActive = activeModule === module.id;

            return (
              <button
                key={module.id}
                onClick={() => setActiveModule(module.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-gold-accent text-navy-deep shadow-[0_0_15px_rgba(212,168,67,0.3)]'
                    : 'text-gray-400 hover:bg-navy-border hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{module.title}</span>
                {isActive && (
                  <motion.div layoutId="active-indicator" className="ml-auto">
                    <ChevronRight className="w-4 h-4" />
                  </motion.div>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-navy-border bg-navy-deep/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-navy-border flex items-center justify-center border border-gold-accent/30">
              <span className="text-xs font-bold text-gold-accent">QS</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Senior Admin</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">FIDIC Specialist</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-navy-card border-t border-navy-border flex items-center justify-around px-2 z-50">
        <button
          onClick={() => setActiveModule('dashboard')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
            activeModule === 'dashboard' ? 'text-gold-accent' : 'text-gray-500'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase tracking-tighter">Home</span>
        </button>

        {MODULES.map((module) => {
          const Icon = iconMap[module.icon];
          const isActive = activeModule === module.id;

          return (
            <button
              key={module.id}
              onClick={() => setActiveModule(module.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                isActive ? 'text-gold-accent' : 'text-gray-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase tracking-tighter truncate w-12 text-center">
                {module.title.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
