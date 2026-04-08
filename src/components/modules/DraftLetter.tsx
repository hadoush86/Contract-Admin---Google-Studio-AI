import React, { useState, useEffect } from 'react';
import { Mail, Send, FileText, Copy, Download, Loader2, AlertCircle, RefreshCw, PlusCircle } from 'lucide-react';
import ModuleHeader from '../ModuleHeader';
import { motion, AnimatePresence } from 'motion/react';
import { LetterFormData } from '../../types';
import { generateContractualLetter, refineLetterAI } from '../../services/geminiService';

const LETTER_TYPES = [
  "Engineer's Instruction", "Rate of Progress Notice", "EOT Response — Grant", 
  "EOT Response — Rejection", "EOT Response — Partial Grant", "Claim Acknowledgement", 
  "Claim Determination", "Variation Order Instruction", "Request for VO Quotation", 
  "IPC Certification Letter", "Taking-Over Certificate", "Performance Certificate", 
  "Defect Rectification Notice", "Suspension Instruction", "Notice of Delay Damages", 
  "Method Statement Response", "Material Approval Response", "Insurance Compliance Notice", 
  "Draft Letter of Award", "Other"
];

const INITIAL_STATE: LetterFormData = {
  letterType: "Engineer's Instruction",
  fidicBook: 'Red Book 1999',
  jurisdiction: 'UAE',
  projectName: '',
  contractNumber: '',
  letterRef: '',
  date: new Date().toISOString().split('T')[0],
  contractorRep: '',
  contractorCompany: '',
  subject: '',
  background: '',
  instructions: '',
  timeBarRequired: false,
  priorRefs: ''
};

export default function DraftLetter() {
  const [formData, setFormData] = useState<LetterFormData>(INITIAL_STATE);
  const [generatedLetter, setGeneratedLetter] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState('');
  const [refinementText, setRefinementText] = useState('');

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!isGenerating && !isRefining) {
          handleGenerate();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formData, isGenerating, isRefining]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleToggle = () => {
    setFormData(prev => ({ ...prev, timeBarRequired: !prev.timeBarRequired }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError('');
    try {
      const result = await generateContractualLetter(formData);
      setGeneratedLetter(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (!refinementText.trim()) return;
    setIsRefining(true);
    setError('');
    try {
      const result = await refineLetterAI(generatedLetter, refinementText);
      setGeneratedLetter(result);
      setRefinementText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsRefining(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLetter);
    alert('Copied to clipboard!');
  };

  const downloadAsTxt = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedLetter], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${formData.letterRef || 'letter'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const startNew = () => {
    if (window.confirm('Clear all fields and start a new letter?')) {
      setFormData(INITIAL_STATE);
      setGeneratedLetter('');
      setError('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 md:px-8">
      <ModuleHeader 
        title="Draft Letter" 
        description="Generate professional contractual correspondence based on FIDIC standards and regional practices."
        icon={Mail}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-5 space-y-8">
          {/* Section 1: Letter Setup */}
          <div className="bg-navy-card border border-navy-border rounded-xl p-6 shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gold-accent mb-6 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gold-accent/10 flex items-center justify-center text-[10px]">1</span>
              Letter Setup
            </h3>
            <div className="space-y-5">
              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase font-bold">Letter Type</label>
                <select 
                  name="letterType"
                  value={formData.letterType}
                  onChange={handleInputChange}
                  className="w-full bg-navy-deep border border-navy-border rounded-lg px-4 py-2.5 text-sm focus:border-gold-accent outline-none transition-all"
                >
                  {LETTER_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
                {formData.letterType === 'Other' && (
                  <input 
                    type="text" 
                    name="otherLetterType"
                    placeholder="Specify letter type..."
                    className="w-full mt-2 bg-navy-deep border border-navy-border rounded-lg px-4 py-2.5 text-sm focus:border-gold-accent outline-none transition-all"
                    onChange={handleInputChange}
                  />
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase font-bold">FIDIC Book</label>
                  <div className="space-y-2">
                    {['Red Book 1999', 'Yellow Book 1999', 'Both'].map(book => (
                      <label key={book} className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio" 
                          name="fidicBook" 
                          value={book}
                          checked={formData.fidicBook === book}
                          onChange={handleInputChange}
                          className="hidden"
                        />
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${formData.fidicBook === book ? 'border-gold-accent bg-gold-accent/20' : 'border-navy-border group-hover:border-gray-500'}`}>
                          {formData.fidicBook === book && <div className="w-1.5 h-1.5 rounded-full bg-gold-accent" />}
                        </div>
                        <span className="text-xs text-gray-300">{book}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase font-bold">Jurisdiction</label>
                  <div className="space-y-2">
                    {['UAE', 'KSA'].map(j => (
                      <label key={j} className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio" 
                          name="jurisdiction" 
                          value={j}
                          checked={formData.jurisdiction === j}
                          onChange={handleInputChange}
                          className="hidden"
                        />
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${formData.jurisdiction === j ? 'border-gold-accent bg-gold-accent/20' : 'border-navy-border group-hover:border-gray-500'}`}>
                          {formData.jurisdiction === j && <div className="w-1.5 h-1.5 rounded-full bg-gold-accent" />}
                        </div>
                        <span className="text-xs text-gray-300">{j}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Project Details */}
          <div className="bg-navy-card border border-navy-border rounded-xl p-6 shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gold-accent mb-6 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gold-accent/10 flex items-center justify-center text-[10px]">2</span>
              Project Details
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Project Name</label>
                  <input name="projectName" value={formData.projectName} onChange={handleInputChange} type="text" placeholder="e.g. Dubai Marina Quay Wall" className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Contract Number</label>
                  <input name="contractNumber" value={formData.contractNumber} onChange={handleInputChange} type="text" placeholder="e.g. C-2024-001" className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Letter Reference</label>
                <input name="letterRef" value={formData.letterRef} onChange={handleInputChange} type="text" placeholder="e.g. CWP-JAC-CHEC-LET-001" className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Date</label>
                <input name="date" value={formData.date} onChange={handleInputChange} type="date" className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Contractor's Rep</label>
                  <input name="contractorRep" value={formData.contractorRep} onChange={handleInputChange} type="text" placeholder="Name" className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Contractor Company</label>
                  <input name="contractorCompany" value={formData.contractorCompany} onChange={handleInputChange} type="text" placeholder="Company" className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Letter Content */}
          <div className="bg-navy-card border border-navy-border rounded-xl p-6 shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gold-accent mb-6 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gold-accent/10 flex items-center justify-center text-[10px]">3</span>
              Letter Content
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Subject Line</label>
                <input name="subject" value={formData.subject} onChange={handleInputChange} type="text" placeholder="Subject of the letter" className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Key Facts / Background</label>
                <textarea name="background" value={formData.background} onChange={handleInputChange} rows={3} placeholder="Describe the key facts, event, or issue this letter addresses..." className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Instructions / Determinations</label>
                <textarea name="instructions" value={formData.instructions} onChange={handleInputChange} rows={3} placeholder="What action, decision, or determination should the letter contain?" className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none resize-none" />
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-wider">Time Bar Notice</span>
                  <span className="text-[10px] text-gray-500">Include Sub-Clause 20.1 notice?</span>
                </div>
                <button 
                  onClick={handleToggle}
                  className={`w-12 h-6 rounded-full transition-all relative ${formData.timeBarRequired ? 'bg-gold-accent' : 'bg-navy-border'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.timeBarRequired ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Prior Correspondence (Optional)</label>
                <input name="priorRefs" value={formData.priorRefs} onChange={handleInputChange} type="text" placeholder="e.g. Ref-001, Ref-002" className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none" />
              </div>
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={isGenerating || isRefining}
            className="w-full bg-gold-accent text-navy-deep font-bold py-4 rounded-xl hover:bg-gold-accent/90 transition-all flex items-center justify-center gap-3 shadow-lg shadow-gold-accent/20 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating letter...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                Generate Letter (Ctrl+Enter)
              </>
            )}
          </button>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex items-center gap-3 text-red-500 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Output Section */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-navy-card border border-navy-border rounded-xl overflow-hidden flex flex-col h-full min-h-[600px] shadow-2xl sticky top-20">
            <div className="bg-navy-deep/50 border-b border-navy-border px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gold-accent" />
                <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">Formal Draft Preview</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={copyToClipboard}
                  disabled={!generatedLetter}
                  className="p-2.5 bg-navy-deep border border-navy-border hover:border-gold-accent/50 rounded-lg transition-all text-gray-400 hover:text-gold-accent disabled:opacity-30 disabled:hover:text-gray-400"
                  title="Copy to Clipboard"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button 
                  onClick={downloadAsTxt}
                  disabled={!generatedLetter}
                  className="p-2.5 bg-navy-deep border border-navy-border hover:border-gold-accent/50 rounded-lg transition-all text-gray-400 hover:text-gold-accent disabled:opacity-30 disabled:hover:text-gray-400"
                  title="Download as .txt"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button 
                  onClick={startNew}
                  className="p-2.5 bg-navy-deep border border-navy-border hover:border-gold-accent/50 rounded-lg transition-all text-gray-400 hover:text-gold-accent"
                  title="Start New"
                >
                  <PlusCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 p-10 font-mono text-sm leading-relaxed overflow-y-auto bg-[#0a0f1a] selection:bg-gold-accent/30">
              {!generatedLetter && !isGenerating ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                  <Mail className="w-16 h-16" />
                  <div>
                    <p className="text-lg font-bold">Ready to Draft</p>
                    <p className="text-xs max-w-xs mx-auto">Fill in the parameters on the left and click 'Generate Letter' to create your contractual draft.</p>
                  </div>
                </div>
              ) : isGenerating ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-4 bg-navy-border rounded w-1/4" />
                  <div className="h-4 bg-navy-border rounded w-1/3" />
                  <div className="h-4 bg-navy-border rounded w-1/2 mt-8" />
                  <div className="h-4 bg-navy-border rounded w-full" />
                  <div className="h-4 bg-navy-border rounded w-full" />
                  <div className="h-4 bg-navy-border rounded w-3/4" />
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-gray-200">
                  {generatedLetter}
                </div>
              )}
            </div>

            {/* Refinement Area */}
            <AnimatePresence>
              {generatedLetter && (
                <motion.div 
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="bg-navy-deep/80 border-t border-navy-border p-6 backdrop-blur-md"
                >
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-[10px] text-gray-500 mb-1 uppercase font-bold tracking-widest">Refine Letter</label>
                      <textarea 
                        value={refinementText}
                        onChange={(e) => setRefinementText(e.target.value)}
                        placeholder="e.g. 'Make the tone more formal' or 'Add a paragraph about the 14-day deadline'..."
                        className="w-full bg-navy-card border border-navy-border rounded-lg px-3 py-2 text-xs focus:border-gold-accent outline-none resize-none h-20"
                      />
                    </div>
                    <div className="flex flex-col justify-end">
                      <button 
                        onClick={handleRefine}
                        disabled={isRefining || !refinementText.trim()}
                        className="bg-navy-card border border-navy-border hover:border-gold-accent text-gold-accent font-bold px-4 py-3 rounded-lg transition-all flex items-center gap-2 text-xs disabled:opacity-30"
                      >
                        {isRefining ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        Refine →
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
