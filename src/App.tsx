import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DraftLetter from './components/modules/DraftLetter';
import EvaluateTender from './components/modules/EvaluateTender';
import ProduceBoQ from './components/modules/ProduceBoQ';
import TakeOff from './components/modules/TakeOff';
import ReviewContract from './components/modules/ReviewContract';
import BespokeReview from './components/modules/BespokeReview';
import PreAwardReview from './components/modules/PreAwardReview';
import CATracker from './components/modules/CATracker';
import VariationOrder from './components/modules/VariationOrder';
import BenchmarkRates from './components/modules/BenchmarkRates';
import { ModuleId, LetterFormData, GlobalProject } from './types';
import { AnimatePresence, motion } from 'motion/react';
import { Calendar, Eraser, StickyNote, X, ChevronLeft, ChevronRight } from 'lucide-react';

const SESSION_NOTES_KEY = 'contractAdmin_sessionNotes';

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');
  const [sessionNotes, setSessionNotes] = useState(() => localStorage.getItem(SESSION_NOTES_KEY) ?? '');
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [clearKey, setClearKey] = useState(0);
  const [draftLetterInitialData, setDraftLetterInitialData] = useState<Partial<LetterFormData> | undefined>(undefined);
  const [globalProject, setGlobalProject] = useState<GlobalProject | null>(null);

  useEffect(() => {
    localStorage.setItem(SESSION_NOTES_KEY, sessionNotes);
  }, [sessionNotes]);

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all forms? This will reset your current work in all modules.')) {
      setClearKey(prev => prev + 1);
      setActiveModule('dashboard');
    }
  };

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard key={`dashboard-${clearKey}`} onModuleSelect={setActiveModule} />;
      case 'draft-letter':
        return <DraftLetter key={`draft-${clearKey}`} initialData={draftLetterInitialData} globalProject={globalProject} onModuleSelect={setActiveModule} />;
      case 'evaluate-tender':
        return <EvaluateTender key={`tender-${clearKey}`} globalProject={globalProject} onModuleSelect={setActiveModule} />;
      case 'produce-boq':
        return <ProduceBoQ key={`boq-${clearKey}`} globalProject={globalProject} onModuleSelect={setActiveModule} />;
      case 'take-off':
        return <TakeOff key={`takeoff-${clearKey}`} globalProject={globalProject} onModuleSelect={setActiveModule} />;
      case 'review-contract':
        return <ReviewContract key={`review-${clearKey}`} globalProject={globalProject} onModuleSelect={setActiveModule} />;
      case 'bespoke-review':
        return (
          <BespokeReview 
            key={`bespoke-${clearKey}`} 
            globalProject={globalProject}
            onModuleSelect={setActiveModule}
            onGenerateNegotiationLetter={(topRedItems) => {
              setDraftLetterInitialData({
                subject: 'Negotiation of Bespoke Contract Terms',
                background: topRedItems,
                instructions: 'Draft a formal negotiation letter requesting amendments to the identified RED risk items.'
              });
              setActiveModule('draft-letter');
            }}
          />
        );
      case 'pre-award-review':
        return <PreAwardReview key={`preaward-${clearKey}`} globalProject={globalProject} onModuleSelect={setActiveModule} />;
      case 'ca-tracker':
        return (
          <CATracker 
            key={`ca-${clearKey}`} 
            globalProject={globalProject}
            onProjectUpdate={setGlobalProject}
            onDraftLetter={(data) => {
              setDraftLetterInitialData(data);
              setActiveModule('draft-letter');
            }}
            onModuleSelect={setActiveModule}
          />
        );
      case 'variation-order':
        return <VariationOrder key={`vo-${clearKey}`} globalProject={globalProject} onModuleSelect={setActiveModule} />;
      case 'benchmark-rates':
        return <BenchmarkRates key={`benchmark-${clearKey}`} globalProject={globalProject} onModuleSelect={setActiveModule} />;
      default:
        return <Dashboard key={`dashboard-${clearKey}`} onModuleSelect={setActiveModule} />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-navy-deep text-white overflow-hidden">
      <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Persistent Header */}
        <header className="h-16 bg-navy-card border-b border-navy-border flex items-center justify-between px-4 md:px-8 z-20 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="font-bold text-lg hidden md:block">Contract Admin QS</h2>
            <div className="h-4 w-px bg-navy-border hidden md:block" />
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <Calendar className="w-3.5 h-3.5" />
              <span>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={handleClearAll}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-deep border border-navy-border hover:border-red-500/50 hover:text-red-400 transition-all text-xs font-medium"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear All</span>
            </button>
            <button 
              onClick={() => setIsNotesOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gold-accent text-navy-deep hover:bg-gold-accent/90 transition-all text-xs font-bold"
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Session Notes</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeModule}-${clearKey}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="min-h-full"
            >
              {renderModule()}
            </motion.div>
          </AnimatePresence>

          {/* Subtle background decorative elements */}
          <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-gold-accent/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none z-0" />
          <div className="fixed bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none z-0" />
        </main>

        {/* Session Notes Side Panel */}
        <AnimatePresence>
          {isNotesOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsNotesOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              />
              <motion.aside
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 h-full w-full max-w-md bg-navy-card border-l border-navy-border z-50 shadow-2xl flex flex-col"
              >
                <div className="p-6 border-b border-navy-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StickyNote className="w-5 h-5 text-gold-accent" />
                    <h3 className="font-bold text-lg">Session Notes</h3>
                  </div>
                  <button 
                    onClick={() => setIsNotesOpen(false)}
                    className="p-2 hover:bg-navy-deep rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 p-6">
                  <textarea 
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    placeholder="Type your project notes, reminders, or observations here. Notes are saved automatically and will persist across page refreshes..."
                    className="w-full h-full bg-navy-deep border border-navy-border rounded-xl p-4 text-sm focus:border-gold-accent outline-none resize-none font-sans leading-relaxed"
                  />
                </div>
                <div className="p-6 border-t border-navy-border bg-navy-deep/50 text-[10px] text-gray-500 italic">
                  Notes are saved automatically to this browser and will persist across page refreshes.
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
