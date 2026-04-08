import React, { useState, useEffect } from 'react';
import { ShieldCheck, FileCheck, AlertTriangle, Search, Loader2, Send, FileText, CheckSquare, Square, Copy, Download, PlusCircle } from 'lucide-react';
import ModuleHeader from '../ModuleHeader';
import { ContractReviewData } from '../../types';
import { reviewContractAI } from '../../services/geminiService';
import ReactMarkdown from 'react-markdown';

const CONTRACT_FORMS = [
  "FIDIC Red Book 1999 — Modified",
  "FIDIC Yellow Book 1999 — Modified",
  "FIDIC Red Book 2017",
  "NEC3 ECC",
  "NEC4 ECC",
  "JCT Standard",
  "Bespoke / Employer-Drafted",
  "Other"
];

const RISK_AREAS = [
  "Payment Terms", "Time Bars", "Variation Mechanism", "Risk Allocation", 
  "Delay Damages & EOT", "Termination", "Dispute Resolution", "Defects & DLP", 
  "Insurance", "Performance Security", "IP & Design", "Compliance & HSSE"
];

const INITIAL_STATE: ContractReviewData = {
  formType: CONTRACT_FORMS[0],
  onBehalfOf: 'Contractor',
  location: 'UAE',
  clauses: '',
  concerns: []
};

export default function ReviewContract() {
  const [formData, setFormData] = useState<ContractReviewData>(INITIAL_STATE);
  const [reviewOutput, setReviewOutput] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [error, setError] = useState('');

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!isReviewing) {
          handleRunReview();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formData, isReviewing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleConcern = (concern: string) => {
    setFormData(prev => ({
      ...prev,
      concerns: prev.concerns.includes(concern)
        ? prev.concerns.filter(c => c !== concern)
        : [...prev.concerns, concern]
    }));
  };

  const handleRunReview = async () => {
    if (!formData.clauses.trim()) {
      setError('Please paste key clauses or contract text to review.');
      return;
    }

    setIsReviewing(true);
    setError('');
    try {
      const result = await reviewContractAI(formData);
      setReviewOutput(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run review');
    } finally {
      setIsReviewing(false);
    }
  };

  const copyToClipboard = () => {
    if (reviewOutput) {
      navigator.clipboard.writeText(reviewOutput);
      alert('Copied to clipboard!');
    }
  };

  const downloadAsTxt = () => {
    if (reviewOutput) {
      const element = document.createElement("a");
      const file = new Blob([reviewOutput], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `Contract_Review_${formData.location}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  const startNew = () => {
    if (window.confirm('Clear all fields and start a new review?')) {
      setFormData(INITIAL_STATE);
      setReviewOutput('');
      setError('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 md:px-8">
      <ModuleHeader 
        title="Review Contract" 
        description="Review contract clauses and identify risks in FIDIC-based agreements with regional law considerations."
        icon={ShieldCheck}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Input Form */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-navy-card border border-navy-border rounded-xl p-6 shadow-xl space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gold-accent flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gold-accent/10 flex items-center justify-center text-[10px]">1</span>
              Review Parameters
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Contract Form Type</label>
                <select 
                  name="formType"
                  value={formData.formType}
                  onChange={handleInputChange}
                  className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                >
                  {CONTRACT_FORMS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase font-bold">Reviewed on behalf of</label>
                  <div className="space-y-2">
                    {['Employer', 'Contractor', 'Engineer'].map(role => (
                      <label key={role} className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio" 
                          name="onBehalfOf" 
                          value={role}
                          checked={formData.onBehalfOf === role}
                          onChange={handleInputChange}
                          className="hidden"
                        />
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${formData.onBehalfOf === role ? 'border-gold-accent bg-gold-accent/20' : 'border-navy-border group-hover:border-gray-500'}`}>
                          {formData.onBehalfOf === role && <div className="w-1.5 h-1.5 rounded-full bg-gold-accent" />}
                        </div>
                        <span className="text-xs text-gray-300">{role}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase font-bold">Project Location</label>
                  <div className="space-y-2">
                    {['UAE', 'KSA', 'Other GCC'].map(loc => (
                      <label key={loc} className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio" 
                          name="location" 
                          value={loc}
                          checked={formData.location === loc}
                          onChange={handleInputChange}
                          className="hidden"
                        />
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${formData.location === loc ? 'border-gold-accent bg-gold-accent/20' : 'border-navy-border group-hover:border-gray-500'}`}>
                          {formData.location === loc && <div className="w-1.5 h-1.5 rounded-full bg-gold-accent" />}
                        </div>
                        <span className="text-xs text-gray-300">{loc}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-navy-card border border-navy-border rounded-xl p-6 shadow-xl space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gold-accent flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gold-accent/10 flex items-center justify-center text-[10px]">2</span>
              Contract Content
            </h3>
            
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-navy-border rounded-xl bg-navy-deep/20 hover:border-gold-accent/30 transition-colors cursor-pointer group">
                <FileCheck className="w-8 h-8 text-gold-accent mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">Upload Document (PDF/TXT)</span>
                <span className="text-[10px] text-gray-500 mt-1">Optional</span>
              </div>

              <div className="relative">
                <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Paste Key Clauses</label>
                <textarea 
                  name="clauses"
                  value={formData.clauses}
                  onChange={handleInputChange}
                  rows={8}
                  placeholder="Paste the contract text or specific clauses you wish to review..."
                  className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none resize-none font-mono"
                />
              </div>
            </div>
          </div>

          <div className="bg-navy-card border border-navy-border rounded-xl p-6 shadow-xl space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gold-accent flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gold-accent/10 flex items-center justify-center text-[10px]">3</span>
              Specific Areas of Concern
            </h3>
            
            <div className="grid grid-cols-2 gap-y-3">
              {RISK_AREAS.map(area => (
                <button 
                  key={area}
                  onClick={() => toggleConcern(area)}
                  className="flex items-center gap-2 text-left group"
                >
                  {formData.concerns.includes(area) ? (
                    <CheckSquare className="w-4 h-4 text-gold-accent" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
                  )}
                  <span className={`text-xs transition-colors ${formData.concerns.includes(area) ? 'text-white' : 'text-gray-400'}`}>
                    {area}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleRunReview}
            disabled={isReviewing}
            className="w-full bg-gold-accent text-navy-deep font-bold py-4 rounded-xl hover:bg-gold-accent/90 transition-all flex items-center justify-center gap-3 shadow-lg shadow-gold-accent/20 disabled:opacity-50 group"
          >
            {isReviewing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analysing contract...
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Run Contract Review (Ctrl+Enter)
              </>
            )}
          </button>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex items-center gap-3 text-red-500 text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Output Section */}
        <div className="xl:col-span-7">
          <div className="bg-navy-card border border-navy-border rounded-xl overflow-hidden flex flex-col h-full min-h-[800px] shadow-2xl sticky top-20">
            <div className="bg-navy-deep/50 border-b border-navy-border px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gold-accent" />
                <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">Review Output</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={copyToClipboard}
                  disabled={!reviewOutput}
                  className="p-2.5 bg-navy-deep border border-navy-border hover:border-gold-accent/50 rounded-lg transition-all text-gray-400 hover:text-gold-accent disabled:opacity-30 disabled:hover:text-gray-400"
                  title="Copy to Clipboard"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button 
                  onClick={downloadAsTxt}
                  disabled={!reviewOutput}
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
            <div className="flex-1 p-10 font-sans text-sm leading-relaxed overflow-y-auto bg-[#0a0f1a] selection:bg-gold-accent/30">
              {!reviewOutput && !isReviewing ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                  <ShieldCheck className="w-16 h-16" />
                  <div>
                    <p className="text-lg font-bold">Awaiting Input</p>
                    <p className="text-xs max-w-xs mx-auto">Configure the review parameters and paste the contract text to begin the AI-powered risk assessment.</p>
                  </div>
                </div>
              ) : isReviewing ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 animate-pulse">
                    <div className="w-12 h-12 bg-navy-border rounded-full" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-navy-border rounded w-1/4" />
                      <div className="h-3 bg-navy-border rounded w-1/2" />
                    </div>
                  </div>
                  <div className="space-y-4 animate-pulse pt-8">
                    <div className="h-10 bg-navy-border rounded w-full" />
                    <div className="h-64 bg-navy-border rounded w-full" />
                    <div className="h-32 bg-navy-border rounded w-full" />
                  </div>
                </div>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-6">
                          <table className="w-full border-collapse border border-navy-border text-xs">
                            {children}
                          </table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="border border-navy-border bg-navy-deep p-3 text-left font-bold uppercase tracking-wider text-gray-400">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => {
                        const content = String(children);
                        if (content.toUpperCase() === 'RED') {
                          return <td className="border border-navy-border p-3"><span className="px-2 py-0.5 bg-red-500/20 text-red-500 rounded-full font-bold text-[10px]">RED</span></td>;
                        }
                        if (content.toUpperCase() === 'AMBER') {
                          return <td className="border border-navy-border p-3"><span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded-full font-bold text-[10px]">AMBER</span></td>;
                        }
                        if (content.toUpperCase() === 'GREEN') {
                          return <td className="border border-navy-border p-3"><span className="px-2 py-0.5 bg-green-500/20 text-green-500 rounded-full font-bold text-[10px]">GREEN</span></td>;
                        }
                        return <td className="border border-navy-border p-3">{children}</td>;
                      }
                    }}
                  >
                    {reviewOutput}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
