import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileEdit, 
  Plus, 
  Download, 
  Calculator, 
  Send, 
  FileText, 
  Trash2, 
  Copy, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Table as TableIcon,
  PlusCircle
} from 'lucide-react';
import ModuleHeader from '../ModuleHeader';
import { VOData, VORegisterEntry } from '../../types';
import { generateVODocumentAI } from '../../services/geminiService';
import ReactMarkdown from 'react-markdown';

const VO_TYPES = [
  "Engineer-Initiated (Sub-Clause 13.1)",
  "Contractor-Requested (Sub-Clause 13.2)",
  "Provisional Sum (Sub-Clause 13.5)",
  "Daywork (Sub-Clause 13.6)"
];

const INITIAL_VO_STATE: VOData = {
  voRef: '',
  voType: VO_TYPES[0],
  fidicBook: 'Red Book',
  projectDetails: '',
  description: '',
  reason: '',
  estimatedValue: 0,
  currency: 'AED',
  eotImpact: 'No adjustment',
  eotDays: 0,
  actionRequired: 'Request for Quotation',
  jurisdiction: 'UAE'
};

export default function VariationOrder() {
  const [activeTab, setActiveTab] = useState<'issue' | 'register'>('issue');

  // Issue VO State
  const [voFormData, setVoFormData] = useState<VOData>(INITIAL_VO_STATE);
  const [generatedDoc, setGeneratedDoc] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  // Register State
  const [register, setRegister] = useState<VORegisterEntry[]>([
    { id: '1', voNo: 'VO-001', date: '2026-03-15', description: 'Additional Piling Works', subClause: '13.1', originalSum: 10000000, voValue: 250000, eotGranted: 5, status: 'Agreed' },
    { id: '2', voNo: 'VO-002', date: '2026-03-28', description: 'Relocation of Utilities', subClause: '13.1', originalSum: 10000000, voValue: 120000, eotGranted: 2, status: 'Issued' },
  ]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (activeTab === 'issue' && !isGenerating) {
          handleGenerate();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [voFormData, isGenerating, activeTab]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setVoFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError('');
    try {
      const result = await generateVODocumentAI(voFormData);
      setGeneratedDoc(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedDoc) {
      navigator.clipboard.writeText(generatedDoc);
      alert('Copied to clipboard!');
    }
  };

  const downloadAsTxt = () => {
    if (generatedDoc) {
      const element = document.createElement("a");
      const file = new Blob([generatedDoc], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `VO_Document_${voFormData.voRef || 'Draft'}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  const startNew = () => {
    if (window.confirm('Clear all fields and start a new VO document?')) {
      setVoFormData(INITIAL_VO_STATE);
      setGeneratedDoc('');
      setError('');
    }
  };

  const addRegisterRow = () => {
    const newRow: VORegisterEntry = {
      id: Date.now().toString(),
      voNo: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      subClause: '13.1',
      originalSum: register[0]?.originalSum || 0,
      voValue: 0,
      eotGranted: 0,
      status: 'Draft'
    };
    setRegister([...register, newRow]);
  };

  const updateRegisterRow = (id: string, field: keyof VORegisterEntry, value: any) => {
    setRegister(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const removeRegisterRow = (id: string) => {
    setRegister(prev => prev.filter(row => row.id !== id));
  };

  const totals = useMemo(() => {
    const totalVO = register.reduce((sum, row) => sum + (row.status === 'Agreed' || row.status === 'Issued' ? row.voValue : 0), 0);
    const originalSum = register[0]?.originalSum || 0;
    const totalEOT = register.reduce((sum, row) => sum + row.eotGranted, 0);
    return {
      totalVO,
      currentSum: originalSum + totalVO,
      totalEOT
    };
  }, [register]);

  const exportRegister = () => {
    const headers = ['VO No.', 'Date', 'Description', 'Sub-Clause', 'Original Sum', 'VO Value', 'EOT Granted', 'Status'];
    const rows = register.map(r => [r.voNo, r.date, r.description, r.subClause, r.originalSum, r.voValue, r.eotGranted, r.status]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "VO_Register.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 md:px-8">
      <ModuleHeader 
        title="Variation Order" 
        description="Process and track variations, claims, and new rate approvals for infrastructure projects."
        icon={FileEdit}
      />

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 bg-navy-deep/50 border border-navy-border rounded-xl mb-8 w-fit">
        <button 
          onClick={() => setActiveTab('issue')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'issue' ? 'bg-gold-accent text-navy-deep' : 'text-gray-400 hover:text-white'}`}
        >
          Issue a VO
        </button>
        <button 
          onClick={() => setActiveTab('register')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'register' ? 'bg-gold-accent text-navy-deep' : 'text-gray-400 hover:text-white'}`}
        >
          VO Register
        </button>
      </div>

      {activeTab === 'issue' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-navy-card border border-navy-border rounded-xl p-6 shadow-xl space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gold-accent flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gold-accent/10 flex items-center justify-center text-[10px]">1</span>
                VO Details
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">VO Reference</label>
                    <input name="voRef" value={voFormData.voRef} onChange={handleInputChange} type="text" placeholder="e.g. VO-001" className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">VO Type</label>
                    <select name="voType" value={voFormData.voType} onChange={handleInputChange} className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none">
                      {VO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-2 uppercase font-bold">FIDIC Book</label>
                    <div className="flex gap-4">
                      {['Red Book', 'Yellow Book'].map(book => (
                        <label key={book} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="fidicBook" value={book} checked={voFormData.fidicBook === book} onChange={handleInputChange} className="hidden" />
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${voFormData.fidicBook === book ? 'border-gold-accent bg-gold-accent/20' : 'border-navy-border'}`}>
                            {voFormData.fidicBook === book && <div className="w-1.5 h-1.5 rounded-full bg-gold-accent" />}
                          </div>
                          <span className="text-xs text-gray-300">{book}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-2 uppercase font-bold">Jurisdiction</label>
                    <div className="flex gap-4">
                      {['UAE', 'KSA'].map(j => (
                        <label key={j} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="jurisdiction" value={j} checked={voFormData.jurisdiction === j} onChange={handleInputChange} className="hidden" />
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${voFormData.jurisdiction === j ? 'border-gold-accent bg-gold-accent/20' : 'border-navy-border'}`}>
                            {voFormData.jurisdiction === j && <div className="w-1.5 h-1.5 rounded-full bg-gold-accent" />}
                          </div>
                          <span className="text-xs text-gray-300">{j}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Project Name + Contract No.</label>
                  <input name="projectDetails" value={voFormData.projectDetails} onChange={handleInputChange} type="text" placeholder="e.g. Dubai Marina Quay Wall - C-2024-001" className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none" />
                </div>
              </div>
            </div>

            <div className="bg-navy-card border border-navy-border rounded-xl p-6 shadow-xl space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gold-accent flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gold-accent/10 flex items-center justify-center text-[10px]">2</span>
                Scope & Value
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Description of Variation</label>
                  <textarea name="description" value={voFormData.description} onChange={handleInputChange} rows={3} placeholder="Describe the changes to the scope of work..." className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none resize-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Reason for Variation</label>
                  <input name="reason" value={voFormData.reason} onChange={handleInputChange} type="text" placeholder="e.g. Client request for additional capacity" className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Estimated Value</label>
                    <input name="estimatedValue" value={voFormData.estimatedValue} onChange={(e) => setVoFormData(prev => ({ ...prev, estimatedValue: parseFloat(e.target.value) || 0 }))} type="number" className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Currency</label>
                    <select name="currency" value={voFormData.currency} onChange={handleInputChange} className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none">
                      <option>AED</option>
                      <option>SAR</option>
                      <option>USD</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-navy-card border border-navy-border rounded-xl p-6 shadow-xl space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gold-accent flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gold-accent/10 flex items-center justify-center text-[10px]">3</span>
                Impact & Action
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase font-bold">EOT Impact</label>
                  <div className="space-y-2">
                    {['No adjustment', 'Adjustment required', 'To be assessed'].map(opt => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="eotImpact" value={opt} checked={voFormData.eotImpact === opt} onChange={handleInputChange} className="hidden" />
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${voFormData.eotImpact === opt ? 'border-gold-accent bg-gold-accent/20' : 'border-navy-border'}`}>
                          {voFormData.eotImpact === opt && <div className="w-1.5 h-1.5 rounded-full bg-gold-accent" />}
                        </div>
                        <span className="text-xs text-gray-300">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {voFormData.eotImpact === 'Adjustment required' && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">EOT Days</label>
                    <input name="eotDays" value={voFormData.eotDays} onChange={(e) => setVoFormData(prev => ({ ...prev, eotDays: parseInt(e.target.value) || 0 }))} type="number" className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none" />
                  </div>
                )}

                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase font-bold">Action Required</label>
                  <div className="flex gap-4">
                    {['Request for Quotation', 'Issue VO Directly'].map(act => (
                      <label key={act} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="actionRequired" value={act} checked={voFormData.actionRequired === act} onChange={handleInputChange} className="hidden" />
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${voFormData.actionRequired === act ? 'border-gold-accent bg-gold-accent/20' : 'border-navy-border'}`}>
                          {voFormData.actionRequired === act && <div className="w-1.5 h-1.5 rounded-full bg-gold-accent" />}
                        </div>
                        <span className="text-xs text-gray-300">{act}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-gold-accent text-navy-deep font-bold py-4 rounded-xl hover:bg-gold-accent/90 transition-all flex items-center justify-center gap-3 shadow-lg shadow-gold-accent/20 disabled:opacity-50 group"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analysing VO...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Generate VO Document (Ctrl+Enter)
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

          {/* Output Column */}
          <div className="lg:col-span-7">
            <div className="bg-navy-card border border-navy-border rounded-xl overflow-hidden flex flex-col h-full min-h-[800px] shadow-2xl sticky top-20">
              <div className="bg-navy-deep/50 border-b border-navy-border px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gold-accent" />
                  <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">Document Preview</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={copyToClipboard}
                    disabled={!generatedDoc}
                    className="p-2.5 bg-navy-deep border border-navy-border hover:border-gold-accent/50 rounded-lg transition-all text-gray-400 hover:text-gold-accent disabled:opacity-30"
                    title="Copy to Clipboard"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={downloadAsTxt}
                    disabled={!generatedDoc}
                    className="p-2.5 bg-navy-deep border border-navy-border hover:border-gold-accent/50 rounded-lg transition-all text-gray-400 hover:text-gold-accent disabled:opacity-30"
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
                {!generatedDoc && !isGenerating ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                    <FileEdit className="w-16 h-16" />
                    <div>
                      <p className="text-lg font-bold">Ready to Draft</p>
                      <p className="text-xs max-w-xs mx-auto">Fill in the VO details and click 'Generate' to create your formal document.</p>
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
                    {generatedDoc}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold flex items-center gap-3">
              <TableIcon className="w-6 h-6 text-gold-accent" />
              Variation Order Register
            </h3>
            <div className="flex gap-3">
              <button 
                onClick={exportRegister}
                className="px-4 py-2 bg-navy-card border border-navy-border rounded-lg text-sm hover:bg-navy-border transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export to CSV
              </button>
              <button 
                onClick={addRegisterRow}
                className="px-6 py-2 bg-gold-accent text-navy-deep font-bold rounded-lg hover:bg-gold-accent/90 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add VO Row
              </button>
            </div>
          </div>

          <div className="bg-navy-card border border-navy-border rounded-xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-navy-deep/40 text-gray-500 uppercase text-[10px] tracking-widest">
                    <th className="px-4 py-4 font-bold w-24">VO No.</th>
                    <th className="px-4 py-4 font-bold w-32">Date</th>
                    <th className="px-4 py-4 font-bold min-w-[200px]">Description</th>
                    <th className="px-4 py-4 font-bold w-24">Sub-Clause</th>
                    <th className="px-4 py-4 font-bold text-right w-40">Contract Sum</th>
                    <th className="px-4 py-4 font-bold text-right w-32">VO Value</th>
                    <th className="px-4 py-4 font-bold text-center w-24">EOT</th>
                    <th className="px-4 py-4 font-bold w-40">Status</th>
                    <th className="px-4 py-4 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-border">
                  {register.map((row) => (
                    <tr key={row.id} className="hover:bg-navy-deep/30 transition-colors">
                      <td className="px-4 py-3">
                        <input type="text" value={row.voNo} onChange={(e) => updateRegisterRow(row.id, 'voNo', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 text-xs font-mono text-gold-accent" />
                      </td>
                      <td className="px-4 py-3">
                        <input type="date" value={row.date} onChange={(e) => updateRegisterRow(row.id, 'date', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 text-xs" />
                      </td>
                      <td className="px-4 py-3">
                        <input type="text" value={row.description} onChange={(e) => updateRegisterRow(row.id, 'description', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 text-xs" />
                      </td>
                      <td className="px-4 py-3">
                        <input type="text" value={row.subClause} onChange={(e) => updateRegisterRow(row.id, 'subClause', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 text-xs text-center" />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        <input type="number" value={row.originalSum} onChange={(e) => updateRegisterRow(row.id, 'originalSum', parseFloat(e.target.value) || 0)} className="w-full bg-transparent border-none focus:ring-0 text-right" />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        <input type="number" value={row.voValue} onChange={(e) => updateRegisterRow(row.id, 'voValue', parseFloat(e.target.value) || 0)} className={`w-full bg-transparent border-none focus:ring-0 text-right ${row.voValue > 0 ? 'text-green-400' : row.voValue < 0 ? 'text-red-400' : ''}`} />
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs">
                        <input type="number" value={row.eotGranted} onChange={(e) => updateRegisterRow(row.id, 'eotGranted', parseInt(e.target.value) || 0)} className="w-full bg-transparent border-none focus:ring-0 text-center" />
                      </td>
                      <td className="px-4 py-3">
                        <select value={row.status} onChange={(e) => updateRegisterRow(row.id, 'status', e.target.value)} className="w-full bg-navy-deep border border-navy-border rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider outline-none">
                          <option>Draft</option>
                          <option>Issued</option>
                          <option>Under Negotiation</option>
                          <option>Agreed</option>
                          <option>Rejected</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => removeRegisterRow(row.id)} className="text-gray-500 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-navy-deep/60 font-bold">
                    <td colSpan={5} className="px-4 py-4 text-right uppercase tracking-widest text-[10px] text-gray-500">Totals</td>
                    <td className="px-4 py-4 text-right font-mono text-xs text-gold-accent">{totals.totalVO.toLocaleString()}</td>
                    <td className="px-4 py-4 text-center font-mono text-xs text-gold-accent">{totals.totalEOT}</td>
                    <td colSpan={2} className="px-4 py-4 text-xs">
                      <span className="text-gray-500 uppercase text-[10px] mr-2">Current Sum:</span>
                      <span className="font-mono text-gold-accent">{totals.currentSum.toLocaleString()}</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
