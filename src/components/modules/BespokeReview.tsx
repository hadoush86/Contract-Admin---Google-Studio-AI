import React, { useState, useEffect } from 'react';
import { ShieldAlert, FileCheck, AlertTriangle, Loader2, Send, FileText, CheckSquare, Square, Copy, Download, PlusCircle, PenTool, Upload } from 'lucide-react';
import ModuleHeader from '../ModuleHeader';
import { BespokeReviewData, GlobalProject, ModuleId } from '../../types';
import { bespokeContractReviewAI } from '../../services/geminiService';
import ReactMarkdown from 'react-markdown';

const CONTRACT_FORMS = [
  "FIDIC Red Book 1999 + Bespoke Particular Conditions",
  "FIDIC Yellow Book 1999 + Bespoke PC",
  "FIDIC Red Book 2017 + Bespoke PC",
  "FIDIC Silver Book 1999 (EPC)",
  "NEC3 ECC",
  "NEC4 ECC",
  "JCT Standard Building Contract",
  "JCT Design and Build",
  "ICE 7th Edition",
  "LOGIC Offshore Construction",
  "IChemE Red/Green Book",
  "Abu Dhabi Government Standard Conditions",
  "Dubai Municipality / RTA Standard",
  "DEWA / ADNOC Bespoke Form",
  "NEOM / Red Sea Global Bespoke",
  "Saudi Aramco Bespoke",
  "Mawani / Port Authority Bespoke",
  "Other employer-drafted"
];

const LOCATIONS = [
  "UAE — Abu Dhabi",
  "UAE — Dubai",
  "UAE — Other Emirates",
  "KSA",
  "Other GCC"
];

const REVIEW_AREAS = [
  "1. Payment Terms and Certification",
  "2. Time Bar and Notice Obligations",
  "3. Variation / Change Order Mechanism",
  "4. Risk Allocation and Liability",
  "5. Delay Damages and Extensions of Time",
  "6. Termination Provisions",
  "7. Dispute Resolution Mechanism",
  "8. Defects and Defects Liability Period",
  "9. Insurance Requirements",
  "10. Performance Security and Bonds",
  "11. Intellectual Property and Design Ownership",
  "12. Compliance, HSSE and Regulatory",
  "Marine-Specific Checklist"
];

const INITIAL_STATE: BespokeReviewData = {
  contractForm: CONTRACT_FORMS[0],
  projectName: '',
  location: LOCATIONS[0],
  onBehalfOf: 'Contractor',
  contractValue: '',
  isExecuted: 'Pre-execution (negotiation stage)',
  specificConcerns: '',
  clauses: '',
  baseVersion: '',
  reviewScope: REVIEW_AREAS
};

interface BespokeReviewProps {
  onGenerateNegotiationLetter?: (topRedItems: string) => void;
  globalProject: GlobalProject | null;
  onModuleSelect: (moduleId: ModuleId) => void;
}

export default function BespokeReview({ onGenerateNegotiationLetter, globalProject, onModuleSelect }: BespokeReviewProps) {
  const [formData, setFormData] = useState<BespokeReviewData>({
    ...INITIAL_STATE,
    projectName: globalProject?.projectName || INITIAL_STATE.projectName,
    location: (globalProject?.jurisdiction as any) || INITIAL_STATE.location,
  });

  useEffect(() => {
    if (globalProject) {
      setFormData(prev => ({
        ...prev,
        projectName: globalProject.projectName,
        location: (globalProject.jurisdiction as any) || prev.location
      }));
    }
  }, [globalProject]);
  const [reviewOutput, setReviewOutput] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  const toggleArea = (area: string) => {
    setFormData(prev => ({
      ...prev,
      reviewScope: prev.reviewScope.includes(area)
        ? prev.reviewScope.filter(a => a !== area)
        : [...prev.reviewScope, area]
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const extension = file.name.split('.').pop()?.toLowerCase();

    reader.onload = (evt) => {
      const content = evt.target?.result;
      if (typeof content === 'string') {
        setFormData(prev => ({ ...prev, clauses: content }));
        alert(`Successfully loaded text from ${file.name}`);
      }
    };

    if (extension === 'txt') {
      reader.readAsText(file);
    } else {
      alert('Currently only .txt files are supported for direct text extraction. For other formats, please copy and paste the text.');
    }
    
    e.target.value = '';
  };

  const handleRunReview = async () => {
    if (!formData.clauses.trim()) {
      setError('Please paste contract clauses or upload a document to review.');
      return;
    }

    setIsReviewing(true);
    setError('');
    try {
      const result = await bespokeContractReviewAI(formData);
      setReviewOutput(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run bespoke review');
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
      element.download = `Bespoke_Contract_Review_${formData.projectName || 'Report'}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  const startNew = () => {
    if (window.confirm('Clear all fields and start a new bespoke review?')) {
      setFormData(INITIAL_STATE);
      setReviewOutput('');
      setError('');
    }
  };

  const handleGenerateNegotiationLetter = () => {
    if (!reviewOutput) return;
    
    // Extract top 3 RED items from Section 2 or Section 3
    // For now, we'll just pass a summary instruction.
    const topRedItems = "Top 3 RED items identified in the Bespoke Contract Review for " + formData.projectName;
    onGenerateNegotiationLetter?.(topRedItems);
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 md:px-8">
      <ModuleHeader 
        title="Bespoke Contract Review" 
        description="In-depth review of non-FIDIC, heavily modified, or employer-drafted bespoke contracts."
        icon={ShieldAlert}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Input Form */}
        <div className="xl:col-span-5 space-y-6">
          {/* Section 1: Identification */}
          <div className="bg-navy-card border border-navy-border rounded-xl p-6 shadow-xl space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gold-accent flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gold-accent/10 flex items-center justify-center text-[10px]">1</span>
              Contract Identification
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Contract Form</label>
                <select 
                  name="contractForm"
                  value={formData.contractForm}
                  onChange={handleInputChange}
                  className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                >
                  {CONTRACT_FORMS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Project Name</label>
                <input 
                  type="text"
                  name="projectName"
                  value={formData.projectName}
                  onChange={handleInputChange}
                  placeholder="e.g. NEOM Green Hydrogen Project"
                  className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Project Location</label>
                <select 
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                >
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase font-bold">Reviewing on behalf of</label>
                  <div className="space-y-2">
                    {['Employer', 'Contractor', 'Engineer', 'Neutral / Mediator'].map(role => (
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
                  <label className="block text-xs text-gray-500 mb-2 uppercase font-bold">Execution Status</label>
                  <div className="space-y-2">
                    {['Pre-execution (negotiation stage)', 'Already executed (post-award review)'].map(status => (
                      <label key={status} className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio" 
                          name="isExecuted" 
                          value={status}
                          checked={formData.isExecuted === status}
                          onChange={handleInputChange}
                          className="hidden"
                        />
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${formData.isExecuted === status ? 'border-gold-accent bg-gold-accent/20' : 'border-navy-border group-hover:border-gray-500'}`}>
                          {formData.isExecuted === status && <div className="w-1.5 h-1.5 rounded-full bg-gold-accent" />}
                        </div>
                        <span className="text-[10px] text-gray-300 leading-tight">{status}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Contract Value (Optional)</label>
                  <input 
                    type="text"
                    name="contractValue"
                    value={formData.contractValue}
                    onChange={handleInputChange}
                    placeholder="e.g. AED 250,000,000"
                    className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Clauses of Concern (Optional)</label>
                  <input 
                    type="text"
                    name="specificConcerns"
                    value={formData.specificConcerns}
                    onChange={handleInputChange}
                    placeholder="e.g. Payment, termination"
                    className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Document */}
          <div className="bg-navy-card border border-navy-border rounded-xl p-6 shadow-xl space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gold-accent flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gold-accent/10 flex items-center justify-center text-[10px]">2</span>
              Contract Document
            </h3>
            
            <div className="space-y-4">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".txt" 
                className="hidden" 
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-navy-border rounded-xl bg-navy-deep/20 hover:border-gold-accent/30 transition-colors cursor-pointer group"
              >
                <Upload className="w-8 h-8 text-gold-accent mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">Upload Contract (.txt)</span>
                <span className="text-[10px] text-gray-500 mt-1">AI will read the full text</span>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Paste Contract Clauses</label>
                <textarea 
                  name="clauses"
                  value={formData.clauses}
                  onChange={handleInputChange}
                  rows={10}
                  placeholder="Paste the full contract text, Particular Conditions, or specific clauses for review..."
                  className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none resize-none font-mono min-h-[200px]"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Contract Base Version</label>
                <input 
                  type="text"
                  name="baseVersion"
                  value={formData.baseVersion}
                  onChange={handleInputChange}
                  placeholder="e.g. FIDIC Red Book 1999 as amended by PC dated..."
                  className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Scope */}
          <div className="bg-navy-card border border-navy-border rounded-xl p-6 shadow-xl space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gold-accent flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gold-accent/10 flex items-center justify-center text-[10px]">3</span>
              Review Scope
            </h3>
            
            <div className="grid grid-cols-1 gap-y-3">
              {REVIEW_AREAS.map(area => (
                <button 
                  key={area}
                  onClick={() => toggleArea(area)}
                  className="flex items-center gap-3 text-left group"
                >
                  {formData.reviewScope.includes(area) ? (
                    <CheckSquare className="w-5 h-5 text-gold-accent" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-600 group-hover:text-gray-400" />
                  )}
                  <span className={`text-xs transition-colors ${formData.reviewScope.includes(area) ? 'text-white' : 'text-gray-400'}`}>
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
                Running Bespoke Review...
              </>
            ) : (
              <>
                <ShieldAlert className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Run Bespoke Contract Review (Ctrl+Enter)
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
                <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">Bespoke Review Report</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={copyToClipboard}
                  disabled={!reviewOutput}
                  className="p-2.5 bg-navy-deep border border-navy-border hover:border-gold-accent/50 rounded-lg transition-all text-gray-400 hover:text-gold-accent disabled:opacity-30 disabled:hover:text-gray-400"
                  title="Copy Full Report"
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
                  <ShieldAlert className="w-16 h-16" />
                  <div>
                    <p className="text-lg font-bold">Awaiting Bespoke Input</p>
                    <p className="text-xs max-w-xs mx-auto">Upload the bespoke contract or paste the clauses to generate a deep-dive risk assessment and redline recommendations.</p>
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
                        if (content.toUpperCase().includes('RED')) {
                          return <td className="border border-navy-border p-3"><span className="px-2 py-0.5 bg-red-500/20 text-red-500 rounded-full font-bold text-[10px]">RED</span></td>;
                        }
                        if (content.toUpperCase().includes('AMBER')) {
                          return <td className="border border-navy-border p-3"><span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded-full font-bold text-[10px]">AMBER</span></td>;
                        }
                        if (content.toUpperCase().includes('GREEN')) {
                          return <td className="border border-navy-border p-3"><span className="px-2 py-0.5 bg-green-500/20 text-green-500 rounded-full font-bold text-[10px]">GREEN</span></td>;
                        }
                        return <td className="border border-navy-border p-3">{children}</td>;
                      }
                    }}
                  >
                    {reviewOutput}
                  </ReactMarkdown>

                  <div className="mt-12 pt-8 border-t border-navy-border space-y-4">
                    {reviewOutput && (
                      <button 
                        onClick={() => onModuleSelect('pre-award-review')}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gold-accent/10 border border-gold-accent/30 rounded-xl text-xs font-bold text-gold-accent hover:bg-gold-accent/20 transition-all"
                      >
                        Next step: Proceed to Pre-Award Review →
                      </button>
                    )}
                    <button 
                      onClick={handleGenerateNegotiationLetter}
                      className="w-full flex items-center gap-3 px-6 py-4 bg-navy-deep border border-gold-accent/30 hover:border-gold-accent text-gold-accent rounded-xl transition-all group"
                    >
                      <PenTool className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                      <div className="text-left">
                        <p className="text-xs font-bold uppercase tracking-wider">Generate Negotiation Letter</p>
                        <p className="text-[10px] text-gray-500">Draft a formal letter based on top 3 RED items</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
