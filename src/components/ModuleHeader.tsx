import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface ModuleHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export default function ModuleHeader({ title, description, icon: Icon }: ModuleHeaderProps) {
  return (
    <header className="mb-10">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-6"
      >
        <div className="w-16 h-16 bg-navy-card border border-navy-border rounded-2xl flex items-center justify-center shadow-lg">
          <Icon className="w-8 h-8 text-gold-accent" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-1">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <div className="px-2 py-0.5 bg-gold-accent/10 border border-gold-accent/20 rounded text-[10px] font-bold text-gold-accent uppercase tracking-widest">
              Active Module
            </div>
          </div>
          <p className="text-gray-400 max-w-2xl">{description}</p>
        </div>
      </motion.div>
      <div className="h-px bg-gradient-to-r from-navy-border via-navy-border to-transparent mt-8" />
    </header>
  );
}
