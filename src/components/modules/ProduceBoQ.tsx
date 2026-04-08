import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Download, 
  Copy, 
  Loader2, 
  AlertCircle, 
  PlusCircle, 
  CheckCircle2, 
  LayoutGrid, 
  Table as TableIcon,
  Upload,
  FileSpreadsheet,
  Trash2,
  Info,
  ChevronRight,
  ChevronDown,
  Settings,
  Layers,
  FileCheck,
  Database
} from 'lucide-react';
import ModuleHeader from '../ModuleHeader';
import { BoQBuilderData, BoQLibraryItem, GlobalProject, ModuleId } from '../../types';
import { generateBoQAI } from '../../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

const LOCATIONS = [
  "UAE — Abu Dhabi", "UAE — Dubai", "UAE — Fujairah", "UAE — Other Emirates",
  "KSA — Jeddah", "KSA — Jubail", "KSA — Other", "Other GCC"
];

const STANDARDS = [
  "CESMM4", "POMI", "NRM2", "Hybrid CESMM4 + NRM2", "Hybrid CESMM4 + POMI"
];

const CONTRACT_TYPES = [
  "Re-measurable", "Lump Sum", "Target Cost", "EPC/Turnkey"
];

const CURRENCIES = ["AED", "SAR", "USD", "GBP"];

const VAT_OPTIONS = [
  { label: "UAE 5%", value: "UAE 5%" },
  { label: "KSA 15%", value: "KSA 15%" },
  { label: "Not applicable", value: "Not applicable" }
];

const SCOPE_OPTIONS = [
  { id: "dredging", label: "Dredging and Disposal (CESMM4 Class E)" },
  { id: "reclamation", label: "Reclamation Fill (CESMM4 Class E)" },
  { id: "gi", label: "Ground Investigation (CESMM4 Class B)" },
  { id: "piling", label: "Piling (CESMM4 Class P)" },
  { id: "sheetpiling", label: "Sheet Piling (CESMM4 Class F)" },
  { id: "insitu", label: "In-Situ Concrete (CESMM4 Class G)" },
  { id: "precast", label: "Precast Concrete (CESMM4 Class H)" },
  { id: "rock", label: "Rock Armour / Breakwater Works (bespoke marine section)" },
  { id: "geotextile", label: "Geotextile and Filter Layers" },
  { id: "marine", label: "Marine Structures (quay wall, jetty, dolphins)" },
  { id: "metalwork", label: "Metalwork / Steel Structures (CESMM4 Class M)" },
  { id: "roads", label: "Roads and Paving (CESMM4 Class R)" },
  { id: "drainage", label: "Drainage (CESMM4 Class I/J)" },
  { id: "buildings", label: "Buildings / Landside Works (NRM2)" },
  { id: "me", label: "Mechanical and Electrical (NRM2)" },
  { id: "landscaping", label: "Landscaping and External Works" }
];

const INITIAL_BUILDER_STATE: BoQBuilderData = {
  projectName: '',
  location: LOCATIONS[0],
  measurementStandard: STANDARDS[0],
  contractType: CONTRACT_TYPES[0],
  currency: CURRENCIES[0],
  vatApplicable: VAT_OPTIONS[0].value,
  scopeOfWorks: [],
  includePreambles: true,
  includePreliminaries: true,
  includeProvisionalSums: false,
  provisionalSumDescription: '',
  includePCSums: false,
  pcSumDescription: '',
  includeDayworkSchedule: false,
  includeSummaryPage: true,
  scopeInput: ''
};

const LIBRARY_DATA: BoQLibraryItem[] = [
  { id: '1', code: 'E321', description: 'Dredging; soft material; to seabed level; in areas of depth not exceeding 5m', unit: 'm3', coverageNotes: 'Includes disposal to designated offshore area.', reference: 'CESMM4 Class E', category: 'dredging' },
  { id: '2', code: 'E532', description: 'Reclamation fill; sand from offshore source; compacted in layers', unit: 'm3', coverageNotes: 'Excludes dredging of fill material.', reference: 'CESMM4 Class E', category: 'reclamation' },
  { id: '3', code: 'P111', description: 'Steel tubular piles; 600mm diameter; driven; vertical', unit: 'm', coverageNotes: 'Includes pile head preparation.', reference: 'CESMM4 Class P', category: 'piling' },
  { id: '4', code: 'G111', description: 'In-situ concrete; C35/45; mass; blinding', unit: 'm3', coverageNotes: 'Includes all necessary formwork.', reference: 'CESMM4 Class G', category: 'insitu' },
  { id: '5', code: 'M1.1', description: 'Rock armour; primary; 3-6t; igneous rock', unit: 't', coverageNotes: 'Measured by weight from weighbridge tickets.', reference: 'Bespoke Marine', category: 'rock' },
  { id: '6', code: 'A110', description: 'Performance Bond; in accordance with Sub-Clause 4.2', unit: 'SUM', coverageNotes: 'Fixed charge.', reference: 'CESMM4 Class A', category: 'preliminaries' },
];

interface ProduceBoQProps {
  globalProject: GlobalProject | null;
  onModuleSelect: (moduleId: ModuleId) => void;
}

export default function ProduceBoQ({ globalProject, onModuleSelect }: ProduceBoQProps) {
  const [activeTab, setActiveTab] = useState<'builder' | 'library'>('builder');
  
  // Builder State
  const [formData, setFormData] = useState<BoQBuilderData>({
    ...INITIAL_BUILDER_STATE,
    projectName: globalProject?.projectName || INITIAL_BUILDER_STATE.projectName,
    location: (globalProject?.jurisdiction as any) || INITIAL_BUILDER_STATE.location,
    currency: globalProject?.currency || INITIAL_BUILDER_STATE.currency,
  });

  useEffect(() => {
    if (globalProject) {
      setFormData(prev => ({
        ...prev,
        projectName: globalProject.projectName,
        location: (globalProject.jurisdiction as any) || prev.location,
        currency: globalProject.currency || prev.currency
      }));
    }
  }, [globalProject]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBoQ, setGeneratedBoQ] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [outputTabs, setOutputTabs] = useState<{ id: string; label: string; content: string }[]>([]);
  const [activeOutputTab, setActiveOutputTab] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Library State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (activeTab === 'builder' && !isGenerating) {
          handleGenerate('FULL');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formData, isGenerating, activeTab]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      if (name === 'scopeOfWorks') {
        setFormData(prev => ({
          ...prev,
          scopeOfWorks: checkbox.checked 
            ? [...prev.scopeOfWorks, value]
            : prev.scopeOfWorks.filter(s => s !== value)
        }));
      } else {
        setFormData(prev => ({ ...prev, [name]: checkbox.checked }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const extension = file.name.split('.').pop()?.toLowerCase();

    reader.onload = (evt) => {
      const result = evt.target?.result;
      if (!result) return;

      try {
        let extractedText = '';
        if (extension === 'txt') {
          extractedText = result as string;
        } else if (extension === 'csv') {
          const parsed = Papa.parse(result as string, { header: true });
          extractedText = JSON.stringify(parsed.data, null, 2);
        } else if (extension === 'xlsx' || extension === 'xls') {
          const workbook = XLSX.read(result, { type: 'binary' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          extractedText = JSON.stringify(jsonData, null, 2);
        } else {
          alert('Unsupported file type for text extraction. Please use .txt, .csv, or Excel.');
          return;
        }

        setFormData(prev => ({
          ...prev,
          scopeInput: prev.scopeInput 
            ? `${prev.scopeInput}\n\n[Imported from ${file.name}]:\n${extractedText}`
            : `[Imported from ${file.name}]:\n${extractedText}`
        }));
        alert(`Successfully imported data from ${file.name}`);
      } catch (err) {
        console.error(err);
        alert('Error processing file.');
      }
    };

    if (extension === 'txt' || extension === 'csv') {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
    
    e.target.value = '';
  };

  const handleGenerate = async (mode: 'STRUCTURE' | 'FULL' | 'PREAMBLES' | 'PRELIMINARIES' | 'DESCRIPTIONS') => {
    setIsGenerating(true);
    setError('');
    try {
      const result = await generateBoQAI(formData, mode);
      setGeneratedBoQ(result);
      
      // Parse markdown to extract sections (rough parsing for tabs)
      const sections = result.split(/(?=### Bill|### Summary|### Preambles|### Preliminaries)/g);
      const tabs = sections.map((s, i) => {
        const titleMatch = s.match(/### (.*?)\n/);
        const title = titleMatch ? titleMatch[1] : `Section ${i + 1}`;
        return { id: `tab-${i}`, label: title, content: s };
      });
      
      setOutputTabs(tabs);
      if (tabs.length > 0) setActiveOutputTab(tabs[0].id);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate BoQ');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyBill = (content: string) => {
    navigator.clipboard.writeText(content);
    alert('Bill section copied to clipboard!');
  };

  const downloadAllAsCSV = () => {
    if (!generatedBoQ) return;
    const blob = new Blob([generatedBoQ], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formData.projectName || 'BoQ'}_Full.csv`;
    a.click();
  };

  const startNew = () => {
    if (window.confirm('Clear all fields and start a new BoQ?')) {
      setFormData(INITIAL_BUILDER_STATE);
      setGeneratedBoQ(null);
      setOutputTabs([]);
    }
  };

  const filteredLibrary = useMemo(() => {
    return LIBRARY_DATA.filter(item => {
      const matchesSearch = item.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           item.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, categoryFilter]);

  const addToBoQ = (item: BoQLibraryItem) => {
    setFormData(prev => ({
      ...prev,
      scopeInput: prev.scopeInput + `\n- ${item.code}: ${item.description} (${item.unit})`
    }));
    alert(`Added ${item.code} to BoQ scope input.`);
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 md:px-8">
      <ModuleHeader 
        title="Produce BoQ" 
        description="Generate structured Bills of Quantities for marine and civil infrastructure works."
        icon={FileText}
      />

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 bg-navy-deep/50 border border-navy-border rounded-xl mb-8 w-fit">
        <button 
          onClick={() => setActiveTab('builder')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'builder' ? 'bg-gold-accent text-navy-deep' : 'text-gray-400 hover:text-white'}`}
        >
          BoQ Builder
        </button>
        <button 
          onClick={() => setActiveTab('library')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'library' ? 'bg-gold-accent text-navy-deep' : 'text-gray-400 hover:text-white'}`}
        >
          Item Library
        </button>
      </div>

      {activeTab === 'builder' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-5 space-y-6">
            {/* Section 1: Project Setup */}
            <div className="bg-navy-card border border-navy-border rounded-xl p-6 shadow-xl space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gold-accent flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Project Setup
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Project Name</label>
                  <input 
                    name="projectName"
                    value={formData.projectName}
                    onChange={handleInputChange}
                    type="text" 
                    placeholder="e.g. Khalifa Port Berth 5"
                    className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Location</label>
                    <select 
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                    >
                      {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
                  </div>
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Contract Type</label>
                    <select 
                      name="contractType"
                      value={formData.contractType}
                      onChange={handleInputChange}
                      className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                    >
                      {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Currency</label>
                    <select 
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                    >
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase font-bold">VAT Applicable</label>
                  <div className="flex flex-wrap gap-4">
                    {VAT_OPTIONS.map(opt => (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio" 
                          name="vatApplicable" 
                          value={opt.value}
                          checked={formData.vatApplicable === opt.value}
                          onChange={handleInputChange}
                          className="hidden"
                        />
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${formData.vatApplicable === opt.value ? 'border-gold-accent bg-gold-accent/20' : 'border-navy-border group-hover:border-gray-500'}`}>
                          {formData.vatApplicable === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-gold-accent" />}
                        </div>
                        <span className="text-xs text-gray-300">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Scope of Works */}
            <div className="bg-navy-card border border-navy-border rounded-xl p-6 shadow-xl space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gold-accent flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Scope of Works
              </h3>
              
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {SCOPE_OPTIONS.map(opt => (
                  <label key={opt.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-navy-deep/50 transition-colors cursor-pointer group">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        name="scopeOfWorks"
                        value={opt.label}
                        checked={formData.scopeOfWorks.includes(opt.label)}
                        onChange={handleInputChange}
                        className="peer hidden"
                      />
                      <div className="w-5 h-5 border-2 border-navy-border rounded transition-all peer-checked:bg-gold-accent peer-checked:border-gold-accent flex items-center justify-center">
                        <CheckCircle2 className={`w-3.5 h-3.5 text-navy-deep transition-all ${formData.scopeOfWorks.includes(opt.label) ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} />
                      </div>
                    </div>
                    <span className="text-xs text-gray-300 group-hover:text-white transition-colors">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Section 3: Bill Structure Options */}
            <div className="bg-navy-card border border-navy-border rounded-xl p-6 shadow-xl space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gold-accent flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                Bill Structure Options
              </h3>
              
              <div className="space-y-4">
                {[
                  { id: 'includePreambles', label: 'Include Preambles?' },
                  { id: 'includePreliminaries', label: 'Include Preliminaries (Class A)?' },
                  { id: 'includeProvisionalSums', label: 'Include Provisional Sums?' },
                  { id: 'includePCSums', label: 'Include PC Sums?' },
                  { id: 'includeDayworkSchedule', label: 'Include Daywork Schedule?' },
                  { id: 'includeSummaryPage', label: 'Include Summary / Collection Page?' },
                ].map(opt => (
                  <div key={opt.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-300">{opt.label}</span>
                      <button 
                        onClick={() => setFormData(prev => ({ ...prev, [opt.id]: !prev[opt.id as keyof BoQBuilderData] }))}
                        className={`w-10 h-5 rounded-full transition-all relative ${formData[opt.id as keyof BoQBuilderData] ? 'bg-gold-accent' : 'bg-navy-border'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${formData[opt.id as keyof BoQBuilderData] ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                    
                    {opt.id === 'includeProvisionalSums' && formData.includeProvisionalSums && (
                      <input 
                        type="text"
                        name="provisionalSumDescription"
                        value={formData.provisionalSumDescription}
                        onChange={handleInputChange}
                        placeholder="Describe provisional sum items..."
                        className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-xs focus:border-gold-accent outline-none animate-in fade-in slide-in-from-top-1"
                      />
                    )}
                    
                    {opt.id === 'includePCSums' && formData.includePCSums && (
                      <input 
                        type="text"
                        name="pcSumDescription"
                        value={formData.pcSumDescription}
                        onChange={handleInputChange}
                        placeholder="Describe PC sum items..."
                        className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-xs focus:border-gold-accent outline-none animate-in fade-in slide-in-from-top-1"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4: Drawings / Scope Input */}
            <div className="bg-navy-card border border-navy-border rounded-xl p-6 shadow-xl space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gold-accent flex items-center gap-2">
                <FileCheck className="w-4 h-4" />
                Drawings / Scope Input
              </h3>
              
              <div className="space-y-4">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".txt, .csv, .xlsx, .xls" 
                  className="hidden" 
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-navy-border rounded-xl bg-navy-deep/20 hover:border-gold-accent/30 transition-colors cursor-pointer group"
                >
                  <Upload className="w-8 h-8 text-gold-accent mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold">Upload drawings or scope</span>
                  <span className="text-[10px] text-gray-500 mt-1">TXT, CSV, Excel</span>
                </div>

                <div className="relative">
                  <div className="absolute -top-2 left-3 px-2 bg-navy-card text-[10px] font-bold text-gray-500 uppercase tracking-widest">OR PASTE SCOPE</div>
                  <textarea 
                    name="scopeInput"
                    value={formData.scopeInput}
                    onChange={handleInputChange}
                    rows={6}
                    placeholder="Paste key dimensions, quantities, or scope notes here — Claude will extract quantities where possible..."
                    className="w-full bg-navy-deep border border-navy-border rounded-xl p-4 text-sm focus:border-gold-accent outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => handleGenerate('STRUCTURE')}
                disabled={isGenerating}
                className="w-full bg-navy-card border border-navy-border text-gold-accent font-bold py-3 rounded-xl hover:border-gold-accent transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <LayoutGrid className="w-5 h-5" />}
                Generate Bill Structure
              </button>
              
              <button 
                onClick={() => handleGenerate('FULL')}
                disabled={isGenerating}
                className="w-full bg-gold-accent text-navy-deep font-bold py-4 rounded-xl hover:bg-gold-accent/90 transition-all flex items-center justify-center gap-3 shadow-lg shadow-gold-accent/20 disabled:opacity-50 group"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Full BoQ...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Generate Full BoQ (Ctrl+Enter)
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleGenerate('PREAMBLES')}
                  className="bg-navy-deep border border-navy-border text-xs py-2 rounded-lg hover:border-gold-accent/50 transition-all"
                >
                  Preambles Only
                </button>
                <button 
                  onClick={() => handleGenerate('PRELIMINARIES')}
                  className="bg-navy-deep border border-navy-border text-xs py-2 rounded-lg hover:border-gold-accent/50 transition-all"
                >
                  Preliminaries Only
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex items-center gap-3 text-red-500 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>

          {/* Output Section */}
          <div className="lg:col-span-7">
            <div className="bg-navy-card border border-navy-border rounded-xl overflow-hidden flex flex-col h-full min-h-[800px] shadow-2xl sticky top-20">
              <div className="bg-navy-deep/50 border-b border-navy-border px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gold-accent" />
                  <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">BoQ Output</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={downloadAllAsCSV}
                    disabled={!generatedBoQ}
                    className="p-2.5 bg-navy-deep border border-navy-border hover:border-gold-accent/50 rounded-lg transition-all text-gray-400 hover:text-gold-accent disabled:opacity-30"
                    title="Download All as CSV"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
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

              {/* Output Tabs */}
              {outputTabs.length > 0 && (
                <div className="bg-navy-deep/30 border-b border-navy-border px-4 flex gap-1 overflow-x-auto no-scrollbar">
                  {outputTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveOutputTab(tab.id)}
                      className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeOutputTab === tab.id ? 'border-gold-accent text-gold-accent' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex-1 p-10 font-sans text-sm leading-relaxed overflow-y-auto bg-[#0a0f1a] selection:bg-gold-accent/30">
                {!generatedBoQ && !isGenerating ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                    <FileText className="w-16 h-16" />
                    <div>
                      <p className="text-lg font-bold">Awaiting BoQ Generation</p>
                      <p className="text-xs max-w-xs mx-auto">Configure your project setup and scope on the left to generate a structured Bill of Quantities.</p>
                    </div>
                  </div>
                ) : isGenerating ? (
                  <div className="space-y-8 animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-navy-border rounded-full" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-navy-border rounded w-1/4" />
                        <div className="h-3 bg-navy-border rounded w-1/2" />
                      </div>
                    </div>
                    <div className="space-y-4 pt-8">
                      <div className="h-8 bg-navy-border rounded w-full" />
                      <div className="h-64 bg-navy-border rounded w-full" />
                      <div className="h-32 bg-navy-border rounded w-full" />
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <div className="flex flex-col sm:flex-row justify-end items-center gap-4 mb-4">
                      {generatedBoQ && (
                        <button 
                          onClick={() => onModuleSelect('evaluate-tender')}
                          className="flex items-center gap-2 px-4 py-2 bg-gold-accent/10 border border-gold-accent/30 rounded-xl text-xs font-bold text-gold-accent hover:bg-gold-accent/20 transition-all"
                        >
                          Next step: Evaluate Tender with this BoQ →
                        </button>
                      )}
                      <button 
                        onClick={() => copyBill(outputTabs.find(t => t.id === activeOutputTab)?.content || '')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-navy-deep border border-navy-border rounded-lg text-[10px] font-bold uppercase tracking-widest hover:border-gold-accent transition-all"
                      >
                        <Copy className="w-3 h-3" />
                        Copy Bill
                      </button>
                    </div>
                    <ReactMarkdown>
                      {outputTabs.find(t => t.id === activeOutputTab)?.content || ''}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Item Library */}
          <div className="bg-navy-card border border-navy-border rounded-xl p-8 shadow-2xl">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center mb-10">
              <div className="space-y-1">
                <h3 className="text-xl font-bold flex items-center gap-3">
                  <Database className="w-6 h-6 text-gold-accent" />
                  Standard Item Library
                </h3>
                <p className="text-xs text-gray-500">Search and add standard marine and civil work descriptions to your BoQ.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search item descriptions..."
                    className="pl-10 pr-4 py-2.5 bg-navy-deep border border-navy-border rounded-xl text-sm focus:border-gold-accent outline-none w-full sm:w-64 transition-all"
                  />
                </div>
                <select 
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2.5 bg-navy-deep border border-navy-border rounded-xl text-sm focus:border-gold-accent outline-none transition-all"
                >
                  <option value="all">All Sections</option>
                  {SCOPE_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label.split(' (')[0]}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredLibrary.map((item) => (
                <div key={item.id} className="bg-navy-deep/40 border border-navy-border rounded-xl p-5 hover:border-gold-accent/30 transition-all group flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-2 py-1 bg-gold-accent/10 text-gold-accent text-[10px] font-bold rounded uppercase tracking-widest">{item.code}</span>
                    <span className="text-[10px] text-gray-500 font-mono">{item.reference}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-200 mb-4 flex-1">{item.description}</p>
                  
                  <div className="space-y-3 pt-4 border-t border-navy-border/50">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-gray-500 uppercase font-bold">Unit</span>
                      <span className="text-gray-300">{item.unit}</span>
                    </div>
                    <div className="flex items-start gap-2 text-[10px]">
                      <Info className="w-3 h-3 text-gold-accent shrink-0 mt-0.5" />
                      <span className="text-gray-500 italic">{item.coverageNotes}</span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(item.description);
                          alert('Description copied!');
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-navy-card border border-navy-border rounded-lg text-[10px] font-bold uppercase tracking-widest hover:border-gold-accent transition-all"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                      <button 
                        onClick={() => addToBoQ(item)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-gold-accent text-navy-deep rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-gold-accent/90 transition-all"
                      >
                        <Plus className="w-3 h-3" />
                        Add to BoQ
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredLibrary.length === 0 && (
                <div className="col-span-full py-20 text-center space-y-4 opacity-30">
                  <Search className="w-12 h-12 mx-auto" />
                  <p className="text-lg font-bold">No items found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
