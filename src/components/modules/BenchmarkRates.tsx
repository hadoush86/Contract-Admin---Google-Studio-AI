import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Search, 
  Plus, 
  History, 
  TrendingUp, 
  MapPin, 
  Calendar, 
  Coins, 
  Loader2, 
  AlertCircle, 
  Save, 
  Trash2,
  Table as TableIcon,
  Info,
  Copy,
  Download,
  PlusCircle,
  FileSpreadsheet
} from 'lucide-react';
import ModuleHeader from '../ModuleHeader';
import { BenchmarkQueryData, BenchmarkEntry, BenchmarkWorkItem, GlobalProject, ModuleId } from '../../types';
import { getBenchmarkRatesAI } from '../../services/geminiService';
import ReactMarkdown from 'react-markdown';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

const WORK_ELEMENTS = {
  "DREDGING": [
    "Capital dredging — soft material",
    "Capital dredging — hard material",
    "Maintenance dredging",
    "Dredge disposal (offshore)",
    "Dredge disposal (reclamation)"
  ],
  "RECLAMATION": [
    "Hydraulic sand fill",
    "Quarry run core fill",
    "Compacted granular fill"
  ],
  "ROCK WORKS": [
    "Rock armour primary (3–6t)",
    "Rock armour secondary (1–3t)",
    "Quarry run core",
    "Concrete armour units (Xbloc/Accropode/Core-Loc)"
  ],
  "PILING": [
    "Steel tubular piling",
    "Sheet piling (GU series)",
    "CFA piling",
    "Bored piling"
  ],
  "CONCRETE": [
    "Quay wall cope beam concrete (C35)",
    "Quay wall panel concrete",
    "Underwater concrete (tremie)",
    "Blinding concrete"
  ],
  "MARINE STRUCTURES": [
    "Precast concrete quay wall panel",
    "Steel fender system",
    "Bollard and mooring hardware"
  ],
  "GEOTEXTILE & FILTER": [
    "Woven geotextile (600g/m²)",
    "Non-woven geotextile",
    "Rock filter layer (50–200kg)"
  ],
  "LANDSIDE": [
    "Asphalt paving",
    "Concrete paving",
    "Site drainage",
    "Security fencing"
  ]
};

const LOCATIONS = [
  "UAE — Abu Dhabi", "UAE — Dubai", "UAE — Other Emirates",
  "KSA — Jeddah", "KSA — Riyadh", "KSA — Eastern Province",
  "Other GCC"
];

const YEARS = Array.from({ length: 10 }, (_, i) => 2015 + i);

const INITIAL_QUERY_STATE: BenchmarkQueryData = {
  workElement: WORK_ELEMENTS.DREDGING[0],
  location: LOCATIONS[0],
  yearFrom: 2020,
  yearTo: 2024,
  currency: 'AED'
};

interface BenchmarkRatesProps {
  globalProject: GlobalProject | null;
  onModuleSelect: (moduleId: ModuleId) => void;
}

export default function BenchmarkRates({ globalProject, onModuleSelect }: BenchmarkRatesProps) {
  const [activeTab, setActiveTab] = useState<'query' | 'add'>('query');

  // Query State
  const [queryData, setQueryData] = useState<BenchmarkQueryData>({
    ...INITIAL_QUERY_STATE,
    location: (globalProject?.jurisdiction as any) || INITIAL_QUERY_STATE.location,
    currency: globalProject?.currency || INITIAL_QUERY_STATE.currency
  });

  useEffect(() => {
    if (globalProject) {
      setQueryData(prev => ({
        ...prev,
        location: (globalProject.jurisdiction as any) || prev.location,
        currency: globalProject.currency || prev.currency
      }));
    }
  }, [globalProject]);
  const [queryResult, setQueryResult] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryError, setQueryError] = useState('');

  // Add Data State
  const [sessionData, setSessionData] = useState<BenchmarkEntry[]>([]);
  const [newEntry, setNewEntry] = useState<BenchmarkEntry>({
    id: Date.now().toString(),
    dataType: 'Tender Evaluation',
    projectName: '',
    client: '',
    location: LOCATIONS[0],
    date: new Date().toISOString().split('T')[0],
    contractType: 'Lump Sum',
    measurementStandard: 'CESMM4',
    contractConditions: 'FIDIC Red Book 1999',
    currency: 'AED',
    items: []
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (activeTab === 'query' && !isQuerying) {
          handleRunQuery();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [queryData, isQuerying, activeTab]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setQueryData(prev => ({ ...prev, [name]: value }));
  };

  const handleRunQuery = async () => {
    setIsQuerying(true);
    setQueryError('');
    try {
      const result = await getBenchmarkRatesAI(queryData);
      setQueryResult(result);
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : 'Failed to fetch rates');
    } finally {
      setIsQuerying(false);
    }
  };

  const copyToClipboard = () => {
    if (queryResult) {
      navigator.clipboard.writeText(queryResult);
      alert('Copied to clipboard!');
    }
  };

  const downloadAsTxt = () => {
    if (queryResult) {
      const element = document.createElement("a");
      const file = new Blob([queryResult], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `Benchmark_Rates_${queryData.workElement}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  const startNew = () => {
    if (window.confirm('Clear all fields and start a new query?')) {
      setQueryData(INITIAL_QUERY_STATE);
      setQueryResult('');
      setQueryError('');
    }
  };

  const addWorkItem = () => {
    const newItem: BenchmarkWorkItem = {
      id: Date.now().toString(),
      tag: WORK_ELEMENTS.DREDGING[0],
      unit: 'm3',
      quantity: 0,
      lowestRate: 0,
      highestRate: 0,
      averageRate: 0,
      awardedRate: 0
    };
    setNewEntry(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const updateWorkItem = (id: string, field: keyof BenchmarkWorkItem, value: any) => {
    setNewEntry(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const removeWorkItem = (id: string) => {
    setNewEntry(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const saveEntry = () => {
    if (!newEntry.projectName) {
      alert('Project Name is required');
      return;
    }
    setSessionData(prev => [...prev, { ...newEntry, id: Date.now().toString() }]);
    setNewEntry({
      id: Date.now().toString(),
      dataType: 'Tender Evaluation',
      projectName: '',
      client: '',
      location: LOCATIONS[0],
      date: new Date().toISOString().split('T')[0],
      contractType: 'Lump Sum',
      measurementStandard: 'CESMM4',
      contractConditions: 'FIDIC Red Book 1999',
      currency: 'AED',
      items: []
    });
    alert('Data saved to session database!');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const extension = file.name.split('.').pop()?.toLowerCase();

    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      if (!bstr) return;

      let data: any[] = [];

      try {
        if (extension === 'csv') {
          const results = Papa.parse(bstr as string, { header: true });
          data = results.data;
        } else {
          const workbook = XLSX.read(bstr, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          data = XLSX.utils.sheet_to_json(worksheet);
        }

        const newItems: BenchmarkWorkItem[] = data.map((row: any, idx: number) => {
          return {
            id: String(Date.now() + idx),
            tag: String(row.Tag || row.Element || row.WorkElement || WORK_ELEMENTS.DREDGING[0]),
            unit: String(row.Unit || 'm3'),
            quantity: parseFloat(row.Qty || row.Quantity || 0),
            lowestRate: parseFloat(row.Lowest || 0),
            highestRate: parseFloat(row.Highest || 0),
            averageRate: parseFloat(row.Average || row.Avg || 0),
            awardedRate: parseFloat(row.Awarded || row.Rate || 0)
          };
        });

        if (newItems.length > 0) {
          setNewEntry(prev => ({ ...prev, items: [...prev.items, ...newItems] }));
          alert(`Successfully imported ${newItems.length} work items.`);
        }
      } catch (err) {
        console.error(err);
        alert('Error parsing file.');
      }
    };

    if (extension === 'csv') {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
    
    e.target.value = '';
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 md:px-8">
      <ModuleHeader 
        title="Benchmark Rates" 
        description="Access regional benchmark rates for marine and infrastructure materials and works."
        icon={Database}
      />

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 bg-navy-deep/50 border border-navy-border rounded-xl mb-8 w-fit">
        <button 
          onClick={() => setActiveTab('query')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'query' ? 'bg-gold-accent text-navy-deep' : 'text-gray-400 hover:text-white'}`}
        >
          Query Rates
        </button>
        <button 
          onClick={() => setActiveTab('add')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'add' ? 'bg-gold-accent text-navy-deep' : 'text-gray-400 hover:text-white'}`}
        >
          Add New Data
        </button>
      </div>

      {activeTab === 'query' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Query Form */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-navy-card border border-navy-border rounded-xl p-6 shadow-xl space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gold-accent flex items-center gap-2">
                <Search className="w-4 h-4" />
                Query Parameters
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Work Element</label>
                  <select 
                    name="workElement"
                    value={queryData.workElement}
                    onChange={handleQueryChange}
                    className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                  >
                    {Object.entries(WORK_ELEMENTS).map(([category, elements]) => (
                      <optgroup key={category} label={category}>
                        {elements.map(el => <option key={el} value={el}>{el}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Location</label>
                  <select 
                    name="location"
                    value={queryData.location}
                    onChange={handleQueryChange}
                    className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                  >
                    {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">From Year</label>
                    <select 
                      name="yearFrom"
                      value={queryData.yearFrom}
                      onChange={handleQueryChange}
                      className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                    >
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">To Year</label>
                    <select 
                      name="yearTo"
                      value={queryData.yearTo}
                      onChange={handleQueryChange}
                      className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                    >
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-2 uppercase font-bold">Currency</label>
                  <div className="flex gap-4">
                    {['AED', 'SAR', 'USD'].map(curr => (
                      <label key={curr} className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio" 
                          name="currency" 
                          value={curr}
                          checked={queryData.currency === curr}
                          onChange={handleQueryChange}
                          className="hidden"
                        />
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${queryData.currency === curr ? 'border-gold-accent bg-gold-accent/20' : 'border-navy-border group-hover:border-gray-500'}`}>
                          {queryData.currency === curr && <div className="w-1.5 h-1.5 rounded-full bg-gold-accent" />}
                        </div>
                        <span className="text-xs text-gray-300">{curr}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={handleRunQuery}
              disabled={isQuerying}
              className="w-full bg-gold-accent text-navy-deep font-bold py-4 rounded-xl hover:bg-gold-accent/90 transition-all flex items-center justify-center gap-3 shadow-lg shadow-gold-accent/20 disabled:opacity-50 group"
            >
              {isQuerying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analysing rates...
                </>
              ) : (
                <>
                  <TrendingUp className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Get Benchmark Rates (Ctrl+Enter)
                </>
              )}
            </button>

            {queryError && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex items-center gap-3 text-red-500 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{queryError}</p>
              </div>
            )}

            {sessionData.length > 0 && (
              <div className="bg-navy-card border border-navy-border rounded-xl p-4 space-y-3">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <History className="w-3 h-3" />
                  Session Database ({sessionData.length})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                  {sessionData.map((entry, i) => (
                    <div key={i} className="text-[10px] p-2 bg-navy-deep rounded border border-navy-border flex justify-between items-center">
                      <span className="truncate max-w-[150px]">{entry.projectName}</span>
                      <span className="text-gold-accent font-bold">{entry.currency}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Query Output */}
          <div className="lg:col-span-8">
            <div className="bg-navy-card border border-navy-border rounded-xl overflow-hidden flex flex-col h-full min-h-[600px] shadow-2xl sticky top-20">
              <div className="bg-navy-deep/50 border-b border-navy-border px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-gold-accent" />
                  <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">Benchmark Analysis</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={copyToClipboard}
                    disabled={!queryResult}
                    className="p-2.5 bg-navy-deep border border-navy-border hover:border-gold-accent/50 rounded-lg transition-all text-gray-400 hover:text-gold-accent disabled:opacity-30"
                    title="Copy to Clipboard"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={downloadAsTxt}
                    disabled={!queryResult}
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
              <div className="flex-1 p-10 font-sans text-sm leading-relaxed overflow-y-auto bg-[#0a0f1a] selection:bg-gold-accent/30">
                {!queryResult && !isQuerying ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                    <Database className="w-16 h-16" />
                    <div>
                      <p className="text-lg font-bold">Awaiting Query</p>
                      <p className="text-xs max-w-xs mx-auto">Select a work element and location to retrieve indicative market rates and pricing guidance.</p>
                    </div>
                  </div>
                ) : isQuerying ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 animate-pulse">
                      <div className="w-12 h-12 bg-navy-border rounded-full" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-navy-border rounded w-1/4" />
                        <div className="h-3 bg-navy-border rounded w-1/2" />
                      </div>
                    </div>
                    <div className="space-y-4 animate-pulse pt-8">
                      <div className="h-8 bg-navy-border rounded w-full" />
                      <div className="h-32 bg-navy-border rounded w-full" />
                      <div className="h-24 bg-navy-border rounded w-full" />
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{queryResult}</ReactMarkdown>
                    <div className="mt-10 p-4 bg-navy-deep/50 border border-navy-border rounded-lg flex items-start gap-3">
                      <Info className="w-5 h-5 text-gold-accent flex-shrink-0" />
                      <p className="text-[10px] text-gray-400 italic">
                        Disclaimer: Rates provided are indicative benchmarks based on historical project data (2015–2024) and AI modeling. Actual market rates may vary significantly based on specific site conditions, project scale, and current global economic factors.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Add New Data Form */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-navy-card border border-navy-border rounded-xl p-6 shadow-xl space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-gold-accent flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Project Context
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-2 uppercase font-bold">Data Type</label>
                    <div className="flex gap-4">
                      {['Tender Evaluation', 'Awarded Contract'].map(type => (
                        <label key={type} className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="dataType" 
                            value={type}
                            checked={newEntry.dataType === type}
                            onChange={(e) => setNewEntry(prev => ({ ...prev, dataType: e.target.value as any }))}
                            className="hidden"
                          />
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${newEntry.dataType === type ? 'border-gold-accent bg-gold-accent/20' : 'border-navy-border'}`}>
                            {newEntry.dataType === type && <div className="w-1.5 h-1.5 rounded-full bg-gold-accent" />}
                          </div>
                          <span className="text-xs text-gray-300">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Project Name</label>
                    <input 
                      type="text" 
                      value={newEntry.projectName}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, projectName: e.target.value }))}
                      placeholder="e.g. NEOM Port Expansion"
                      className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Location</label>
                    <select 
                      value={newEntry.location}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                    >
                      {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Month + Year</label>
                      <input 
                        type="month" 
                        value={newEntry.date.substring(0, 7)}
                        onChange={(e) => setNewEntry(prev => ({ ...prev, date: e.target.value + '-01' }))}
                        className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Currency</label>
                      <select 
                        value={newEntry.currency}
                        onChange={(e) => setNewEntry(prev => ({ ...prev, currency: e.target.value }))}
                        className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                      >
                        <option>AED</option>
                        <option>SAR</option>
                        <option>USD</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-navy-card border border-navy-border rounded-xl p-6 shadow-xl space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gold-accent flex items-center gap-2">
                    <TableIcon className="w-4 h-4" />
                    Work Items
                  </h3>
                  <div className="flex gap-3">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      accept=".csv, .xlsx, .xls" 
                      className="hidden" 
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-gold-accent transition-colors"
                    >
                      <FileSpreadsheet className="w-3 h-3" />
                      Import Excel/CSV
                    </button>
                    <button 
                      onClick={addWorkItem}
                      className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gold-accent hover:text-white transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add Row
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-gray-500 border-b border-navy-border">
                        <th className="pb-3 font-bold">Element Tag</th>
                        <th className="pb-3 font-bold w-16">Unit</th>
                        <th className="pb-3 font-bold text-right w-24">Awarded Rate</th>
                        <th className="pb-3 font-bold text-right w-24">Avg Rate</th>
                        <th className="pb-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-navy-border">
                      {newEntry.items.map((item) => (
                        <tr key={item.id} className="group">
                          <td className="py-3 pr-4">
                            <select 
                              value={item.tag}
                              onChange={(e) => updateWorkItem(item.id, 'tag', e.target.value)}
                              className="w-full bg-transparent border-none focus:ring-0 p-0 text-xs"
                            >
                              {Object.values(WORK_ELEMENTS).flat().map(el => <option key={el} value={el}>{el}</option>)}
                            </select>
                          </td>
                          <td className="py-3 pr-4">
                            <input 
                              type="text" 
                              value={item.unit}
                              onChange={(e) => updateWorkItem(item.id, 'unit', e.target.value)}
                              className="w-full bg-transparent border-none focus:ring-0 p-0 text-xs text-center"
                            />
                          </td>
                          <td className="py-3 pr-4 text-right">
                            <input 
                              type="number" 
                              value={item.awardedRate}
                              onChange={(e) => updateWorkItem(item.id, 'awardedRate', parseFloat(e.target.value) || 0)}
                              className="w-full bg-transparent border-none focus:ring-0 p-0 text-xs text-right text-gold-accent font-bold"
                            />
                          </td>
                          <td className="py-3 pr-4 text-right">
                            <input 
                              type="number" 
                              value={item.averageRate}
                              onChange={(e) => updateWorkItem(item.id, 'averageRate', parseFloat(e.target.value) || 0)}
                              className="w-full bg-transparent border-none focus:ring-0 p-0 text-xs text-right"
                            />
                          </td>
                          <td className="py-3 text-center">
                            <button 
                              onClick={() => removeWorkItem(item.id)}
                              className="text-gray-600 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {newEntry.items.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-500 italic">
                            No work items added yet. Click "Add Row" to begin.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <button 
                  onClick={saveEntry}
                  className="bg-gold-accent text-navy-deep font-bold px-8 py-3 rounded-xl hover:bg-gold-accent/90 transition-all flex items-center gap-3 shadow-lg shadow-gold-accent/20"
                >
                  <Save className="w-5 h-5" />
                  Save to Session Database
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
