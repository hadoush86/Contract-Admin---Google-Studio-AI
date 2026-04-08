import React, { useState, useEffect } from 'react';
import { 
  Ruler, 
  Calculator, 
  FileText, 
  History, 
  Download, 
  Copy, 
  Trash2, 
  Loader2, 
  AlertCircle, 
  PlusCircle, 
  Upload, 
  Search,
  ChevronRight,
  Settings,
  Layers,
  FileCheck,
  Info
} from 'lucide-react';
import ModuleHeader from '../ModuleHeader';
import { TakeOffData, DimensionSheetEntry, GlobalProject, ModuleId } from '../../types';
import { calculateTakeOffAI } from '../../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

const WORK_ELEMENTS = [
  "DREDGING: Capital dredge — grid method",
  "DREDGING: Capital dredge — cross-section method",
  "DREDGING: Channel dredge — cross-section",
  "DREDGING: Maintenance dredge",
  "RECLAMATION: Sand fill — grid method",
  "RECLAMATION: Sand fill — cross-section",
  "RECLAMATION: Rock fill — placed volume",
  "CONCRETE: Cope beam — cubic",
  "CONCRETE: Pile cap — cubic",
  "CONCRETE: Wall panel — cubic",
  "CONCRETE: Slab — cubic",
  "CONCRETE: Underwater concrete",
  "FORMWORK: Vertical formwork",
  "FORMWORK: Soffit formwork",
  "FORMWORK: Sloping formwork",
  "PILING: Tubular piles — linear metres",
  "PILING: Sheet piling — m²",
  "PILING: Bored piling — linear metres",
  "ROCK ARMOUR: Primary armour — tonnage",
  "ROCK ARMOUR: Secondary armour — tonnage",
  "ROCK ARMOUR: Core — tonnage",
  "ROCK ARMOUR: Concrete armour units — count + volume",
  "GEOTEXTILE: Flat laid",
  "GEOTEXTILE: Slope area",
  "REINFORCEMENT: Bar bending schedule"
];

const STANDARDS = ["CESMM4", "POMI", "NRM2"];

const PURPOSES = [
  "New BoQ production",
  "Re-measurement",
  "Claim verification",
  "Cross-check Contractor submission"
];

const OUTPUT_FORMATS = [
  "Dimension sheet",
  "Summary table",
  "Bill-ready quantities"
];

const MATERIALS = [
  { type: "Soft clay/silt", swell: 1.25 },
  { type: "Loose sand", swell: 1.10 },
  { type: "Dense sand", swell: 1.15 },
  { type: "Stiff clay", swell: 1.35 },
  { type: "Weak rock", swell: 1.45 },
  { type: "Hard rock", swell: 1.60 }
];

const INITIAL_STATE: TakeOffData = {
  workElement: WORK_ELEMENTS[0],
  measurementStandard: STANDARDS[0],
  purpose: PURPOSES[0],
  outputFormat: OUTPUT_FORMATS[0],
  inputMode: 'PASTE',
  pastedDimensions: '',
  drawingRef: '',
  scale: '',
  datum: '',
  materialType: MATERIALS[0].type,
  swellFactorInSitu: MATERIALS[0].swell,
  swellFactorPlaced: 1.05
};

interface TakeOffProps {
  globalProject: GlobalProject | null;
  onModuleSelect: (moduleId: ModuleId) => void;
}

export default function TakeOff({ globalProject, onModuleSelect }: TakeOffProps) {
  const [activeTab, setActiveTab] = useState<'calculator' | 'sheets'>('calculator');
  const [formData, setFormData] = useState<TakeOffData>(INITIAL_STATE);
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<DimensionSheetEntry[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Load history from session storage
  useEffect(() => {
    const saved = sessionStorage.getItem('takeoff_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  // Save history to session storage
  useEffect(() => {
    sessionStorage.setItem('takeoff_history', JSON.stringify(history));
  }, [history]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (activeTab === 'calculator' && !isCalculating) {
          handleCalculate();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formData, isCalculating, activeTab]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'materialType') {
      const mat = MATERIALS.find(m => m.type === value);
      if (mat) {
        setFormData(prev => ({ 
          ...prev, 
          materialType: value, 
          swellFactorInSitu: mat.swell 
        }));
        return;
      }
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setFormData(prev => ({
        ...prev,
        drawingRef: file.name
      }));
      alert(`File "${file.name}" uploaded successfully. The AI will analyze this drawing during calculation.`);
    }
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    setError('');
    try {
      const output = await calculateTakeOffAI(formData);
      setResult(output);
      
      // Extract key quantity (rough heuristic)
      const qtyMatch = output.match(/Total Quantity:?\s*([\d,.]+\s*\w+)/i) || 
                      output.match(/=\s*([\d,.]+\s*\w+)/i);
      const quantity = qtyMatch ? qtyMatch[1] : 'Calculated';

      const newEntry: DimensionSheetEntry = {
        id: Date.now().toString(),
        workElement: formData.workElement,
        date: new Date().toLocaleString(),
        quantity,
        content: output
      };
      
      setHistory(prev => [newEntry, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate quantities');
    } finally {
      setIsCalculating(false);
    }
  };

  const copyResult = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      alert('Result copied to clipboard!');
    }
  };

  const downloadResult = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TakeOff_${formData.workElement.split(':')[0]}_${Date.now()}.txt`;
    a.click();
  };

  const deleteHistoryItem = (id: string) => {
    if (window.confirm('Delete this dimension sheet?')) {
      setHistory(prev => prev.filter(item => item.id !== id));
    }
  };

  const exportAllToCSV = () => {
    if (history.length === 0) return;
    const headers = ['Work Element', 'Date', 'Quantity', 'Content'];
    const rows = history.map(item => [
      item.workElement,
      item.date,
      item.quantity,
      `"${item.content.replace(/"/g, '""')}"`
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TakeOff_History_${Date.now()}.csv`;
    a.click();
  };

  const isDredgingOrReclamation = formData.workElement.startsWith('DREDGING') || formData.workElement.startsWith('RECLAMATION');

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 md:px-8">
      <ModuleHeader 
        title="Quantities Take-Off" 
        description="Detailed quantities take-off and dimension sheet production for marine and civil works."
        icon={Ruler}
      />

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 bg-navy-deep/50 border border-navy-border rounded-xl mb-8 w-fit">
        <button 
          onClick={() => setActiveTab('calculator')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'calculator' ? 'bg-gold-accent text-navy-deep' : 'text-gray-400 hover:text-white'}`}
        >
          Take-Off Calculator
        </button>
        <button 
          onClick={() => setActiveTab('sheets')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'sheets' ? 'bg-gold-accent text-navy-deep' : 'text-gray-400 hover:text-white'}`}
        >
          Dimension Sheets
        </button>
      </div>

      {activeTab === 'calculator' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-5 space-y-6">
            {/* Section 1: Setup */}
            <div className="bg-navy-card border border-navy-border rounded-xl p-6 shadow-xl space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gold-accent flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Take-Off Setup
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Work Element</label>
                  <select 
                    name="workElement"
                    value={formData.workElement}
                    onChange={handleInputChange}
                    className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                  >
                    {WORK_ELEMENTS.map(el => <option key={el} value={el}>{el}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Standard</label>
                    <select 
                      name="measurementStandard"
                      value={formData.measurementStandard}
                      onChange={handleInputChange}
                      className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                    >
                      {STANDARDS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Purpose</label>
                    <select 
                      name="purpose"
                      value={formData.purpose}
                      onChange={handleInputChange}
                      className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                    >
                      {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Output Format</label>
                  <select 
                    name="outputFormat"
                    value={formData.outputFormat}
                    onChange={handleInputChange}
                    className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                  >
                    {OUTPUT_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Dimensions Input */}
            <div className="bg-navy-card border border-navy-border rounded-xl p-6 shadow-xl space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gold-accent flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Dimensions Input
              </h3>
              
              <div className="flex p-1 bg-navy-deep border border-navy-border rounded-lg mb-4">
                <button 
                  onClick={() => setFormData(prev => ({ ...prev, inputMode: 'PASTE' }))}
                  className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${formData.inputMode === 'PASTE' ? 'bg-gold-accent text-navy-deep' : 'text-gray-500'}`}
                >
                  Paste Dimensions
                </button>
                <button 
                  onClick={() => setFormData(prev => ({ ...prev, inputMode: 'UPLOAD' }))}
                  className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${formData.inputMode === 'UPLOAD' ? 'bg-gold-accent text-navy-deep' : 'text-gray-500'}`}
                >
                  Upload Drawing
                </button>
              </div>

              {formData.inputMode === 'PASTE' ? (
                <div className="space-y-2">
                  <textarea 
                    name="pastedDimensions"
                    value={formData.pastedDimensions}
                    onChange={handleInputChange}
                    rows={8}
                    placeholder="Paste your dimensions here — label each dimension clearly.&#10;Example:&#10;Basin dredge:&#10;Length = 450 m&#10;Width = 120 m..."
                    className="w-full bg-navy-deep border border-navy-border rounded-xl p-4 text-sm focus:border-gold-accent outline-none resize-none font-mono"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*,application/pdf"
                    className="hidden"
                  />
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center py-6 border-2 border-dashed rounded-xl transition-all cursor-pointer group ${uploadedFile ? 'border-gold-accent bg-gold-accent/5' : 'border-navy-border bg-navy-deep/20 hover:border-gold-accent/30'}`}
                  >
                    <Upload className={`w-8 h-8 mb-2 transition-transform group-hover:scale-110 ${uploadedFile ? 'text-gold-accent' : 'text-gray-500'}`} />
                    <span className="text-xs font-bold">
                      {uploadedFile ? uploadedFile.name : 'Upload Drawing'}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-1">
                      {uploadedFile ? `${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB` : 'PDF, Image'}
                    </span>
                    {uploadedFile && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedFile(null);
                        }}
                        className="mt-2 text-[10px] text-red-500 hover:underline"
                      >
                        Remove file
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <input 
                      name="drawingRef"
                      value={formData.drawingRef}
                      onChange={handleInputChange}
                      placeholder="Drawing title and number"
                      className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-xs focus:border-gold-accent outline-none"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        name="scale"
                        value={formData.scale}
                        onChange={handleInputChange}
                        placeholder="Scale (e.g. 1:500)"
                        className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-xs focus:border-gold-accent outline-none"
                      />
                      <input 
                        name="datum"
                        value={formData.datum}
                        onChange={handleInputChange}
                        placeholder="Datum reference"
                        className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-xs focus:border-gold-accent outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Swell Factors */}
            {isDredgingOrReclamation && (
              <div className="bg-navy-card border border-navy-border rounded-xl p-6 shadow-xl space-y-6 animate-in fade-in slide-in-from-top-2">
                <h3 className="text-sm font-bold uppercase tracking-widest text-gold-accent flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Swell Factors
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Material Type</label>
                    <select 
                      name="materialType"
                      value={formData.materialType}
                      onChange={handleInputChange}
                      className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                    >
                      {MATERIALS.map(m => <option key={m.type} value={m.type}>{m.type}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">In-situ to Barge</label>
                      <input 
                        type="number"
                        name="swellFactorInSitu"
                        value={formData.swellFactorInSitu}
                        onChange={handleInputChange}
                        step="0.01"
                        className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Barge to Placed</label>
                      <input 
                        type="number"
                        name="swellFactorPlaced"
                        value={formData.swellFactorPlaced}
                        onChange={handleInputChange}
                        step="0.01"
                        className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button 
              onClick={handleCalculate}
              disabled={isCalculating}
              className="w-full bg-gold-accent text-navy-deep font-bold py-4 rounded-xl hover:bg-gold-accent/90 transition-all flex items-center justify-center gap-3 shadow-lg shadow-gold-accent/20 disabled:opacity-50 group"
            >
              {isCalculating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Calculating Quantities...
                </>
              ) : (
                <>
                  <Calculator className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Calculate Quantities (Ctrl+Enter)
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
          <div className="lg:col-span-7">
            <div className="bg-navy-card border border-navy-border rounded-xl overflow-hidden flex flex-col h-full min-h-[700px] shadow-2xl sticky top-20">
              <div className="bg-navy-deep/50 border-b border-navy-border px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gold-accent" />
                  <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">Dimension Sheet</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={copyResult}
                    disabled={!result}
                    className="p-2.5 bg-navy-deep border border-navy-border hover:border-gold-accent/50 rounded-lg transition-all text-gray-400 hover:text-gold-accent disabled:opacity-30"
                    title="Copy to Clipboard"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={downloadResult}
                    disabled={!result}
                    className="p-2.5 bg-navy-deep border border-navy-border hover:border-gold-accent/50 rounded-lg transition-all text-gray-400 hover:text-gold-accent disabled:opacity-30"
                    title="Download as .txt"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 p-10 font-mono text-xs leading-relaxed overflow-y-auto bg-[#0a0f1a] selection:bg-gold-accent/30">
                {!result && !isCalculating ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                    <Calculator className="w-16 h-16" />
                    <div>
                      <p className="text-lg font-bold">Awaiting Calculation</p>
                      <p className="text-xs max-w-xs mx-auto">Enter dimensions or upload a drawing to generate an auditable dimension sheet.</p>
                    </div>
                  </div>
                ) : isCalculating ? (
                  <div className="space-y-8 animate-pulse">
                    <div className="h-4 bg-navy-border rounded w-1/4" />
                    <div className="h-4 bg-navy-border rounded w-1/2" />
                    <div className="space-y-4 pt-8">
                      <div className="h-64 bg-navy-border rounded w-full" />
                      <div className="h-32 bg-navy-border rounded w-full" />
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none">
                    {result && (
                      <div className="flex justify-end mb-4">
                        <button 
                          onClick={() => onModuleSelect('evaluate-tender')}
                          className="flex items-center gap-2 px-4 py-2 bg-gold-accent/10 border border-gold-accent/30 rounded-xl text-xs font-bold text-gold-accent hover:bg-gold-accent/20 transition-all"
                        >
                          Next step: Evaluate Tender with this Take-Off →
                        </button>
                      </div>
                    )}
                    <ReactMarkdown>{result || ''}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold flex items-center gap-3">
              <History className="w-6 h-6 text-gold-accent" />
              Session Dimension Sheets
            </h3>
            <button 
              onClick={exportAllToCSV}
              disabled={history.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-navy-card border border-navy-border rounded-xl text-xs font-bold uppercase tracking-widest hover:border-gold-accent transition-all disabled:opacity-30"
            >
              <Download className="w-4 h-4" />
              Export All to CSV
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {history.map((item) => (
              <div key={item.id} className="bg-navy-card border border-navy-border rounded-xl p-6 hover:border-gold-accent/30 transition-all group">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-200">{item.workElement}</span>
                      <span className="text-[10px] text-gold-accent font-bold px-2 py-0.5 bg-gold-accent/10 rounded uppercase tracking-widest">{item.quantity}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-mono">{item.date}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setResult(item.content);
                        setActiveTab('calculator');
                      }}
                      className="p-2 bg-navy-deep border border-navy-border rounded-lg text-gray-400 hover:text-gold-accent transition-all"
                      title="View Sheet"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(item.content);
                        alert('Sheet copied!');
                      }}
                      className="p-2 bg-navy-deep border border-navy-border rounded-lg text-gray-400 hover:text-gold-accent transition-all"
                      title="Copy Content"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteHistoryItem(item.id)}
                      className="p-2 bg-navy-deep border border-navy-border rounded-lg text-gray-400 hover:text-red-500 transition-all"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <div className="py-20 text-center space-y-4 opacity-30 border-2 border-dashed border-navy-border rounded-2xl">
                <History className="w-12 h-12 mx-auto" />
                <p className="text-lg font-bold">No dimension sheets in this session</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
