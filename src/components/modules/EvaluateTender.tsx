import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, 
  Plus, 
  Trash2, 
  Calculator, 
  ArrowRightLeft, 
  FileSearch, 
  Download, 
  Upload, 
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Loader2,
  Flag,
  Copy,
  PlusCircle,
  MessageSquare,
  X,
  LayoutGrid,
  Table as TableIcon,
  FileSpreadsheet
} from 'lucide-react';
import ModuleHeader from '../ModuleHeader';
import { Bidder, BoQItem, ArithmeticCheckResult, RateComparisonResult, GlobalProject, ModuleId } from '../../types';
import { evaluateTenderAI } from '../../services/geminiService';
import { calculateArithmeticCheck, calculateRateComparison } from '../../utils/tenderCalculations';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';

const INITIAL_BIDDERS: Bidder[] = [
  { id: '1', name: 'Bidder A' },
  { id: '2', name: 'Bidder B' },
  { id: '3', name: 'Bidder C' },
];

const INITIAL_ITEMS: BoQItem[] = [
  { id: '1', ref: '1.01', description: 'Mobilization and Demobilization', unit: 'LS', quantity: 1, rates: { '1': 50000, '2': 55000, '3': 48000 } },
  { id: '2', ref: '2.01', description: 'Excavation in soft material', unit: 'm3', quantity: 5000, rates: { '1': 15, '2': 18, '3': 12 } },
  { id: '3', ref: '2.02', description: 'Disposal of surplus material', unit: 'm3', quantity: 5000, rates: { '1': 8, '2': 10, '3': 7 } },
];

interface EvaluateTenderProps {
  globalProject: GlobalProject | null;
  onModuleSelect: (moduleId: ModuleId) => void;
}

export default function EvaluateTender({ globalProject, onModuleSelect }: EvaluateTenderProps) {
  // Form State
  const [projectName, setProjectName] = useState(globalProject?.projectName || '');
  const [numBidders, setNumBidders] = useState(3);
  const [bidders, setBidders] = useState<Bidder[]>(INITIAL_BIDDERS);
  const [currency, setCurrency] = useState(globalProject?.currency || 'AED');
  const [standard, setStandard] = useState('CESMM4');

  useEffect(() => {
    if (globalProject) {
      setProjectName(globalProject.projectName);
      setCurrency(globalProject.currency || 'AED');
    }
  }, [globalProject]);

  // BoQ Items State
  const [items, setItems] = useState<BoQItem[]>(INITIAL_ITEMS);

  // Analysis State
  const [arithmeticResults, setArithmeticResults] = useState<ArithmeticCheckResult[] | null>(null);
  const [comparisonResults, setComparisonResults] = useState<RateComparisonResult[] | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [discussionPoints, setDiscussionPoints] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'visual'>('table');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Handlers
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

        // Map data to BoQItem
        const newItems: BoQItem[] = data.map((row: any, idx: number) => {
          const itemRates: Record<string, number> = {};
          bidders.forEach(b => {
            const rateValue = row[b.name] || row[`${b.name} Rate`] || row[b.id] || 0;
            itemRates[b.id] = parseFloat(rateValue) || 0;
          });

          return {
            id: String(Date.now() + idx),
            ref: String(row.Ref || row.Reference || row.Item || ''),
            description: String(row.Description || row.Desc || ''),
            unit: String(row.Unit || ''),
            quantity: parseFloat(row.Qty || row.Quantity || 0),
            rates: itemRates
          };
        }).filter(item => item.description || item.ref);

        if (newItems.length > 0) {
          setItems(newItems);
          alert(`Successfully imported ${newItems.length} items.`);
        } else {
          alert('No valid items found in the file. Please ensure columns match: Ref, Description, Unit, Qty, and Bidder Names.');
        }
      } catch (err) {
        console.error(err);
        alert('Error parsing file. Please ensure it is a valid Excel or CSV file.');
      }
    };

    if (extension === 'csv') {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
    
    e.target.value = '';
  };

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!isAnalyzing) {
          generateAiSummary();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [projectName, currency, standard, bidders, items, isAnalyzing]);

  const handleNumBiddersChange = (n: number) => {
    const newNum = Math.min(Math.max(n, 2), 8);
    setNumBidders(newNum);
    
    const newBidders = [...bidders];
    if (newNum > bidders.length) {
      for (let i = bidders.length; i < newNum; i++) {
        newBidders.push({ id: String(i + 1), name: `Bidder ${String.fromCharCode(65 + i)}` });
      }
    } else {
      newBidders.splice(newNum);
    }
    setBidders(newBidders);
  };

  const updateBidderName = (id: string, name: string) => {
    setBidders(prev => prev.map(b => b.id === id ? { ...b, name } : b));
  };

  const addItem = () => {
    const newId = String(Date.now());
    setItems(prev => [...prev, {
      id: newId,
      ref: '',
      description: '',
      unit: '',
      quantity: 0,
      rates: bidders.reduce((acc, b) => ({ ...acc, [b.id]: 0 }), {})
    }]);
  };

  const updateItem = (id: string, field: keyof BoQItem, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const updateRate = (itemId: string, bidderId: string, rate: number) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, rates: { ...item.rates, [bidderId]: rate } } : item
    ));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Analysis Logic
  const runArithmeticCheck = () => {
    setArithmeticResults(calculateArithmeticCheck(bidders, items));
  };

  const runRateComparison = () => {
    setComparisonResults(calculateRateComparison(bidders, items));
  };

  const generateAiSummary = async () => {
    setIsAnalyzing(true);
    try {
      const summary = await evaluateTenderAI(projectName, currency, standard, bidders, items);
      setAiSummary(summary);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const flagForDiscussion = (item: RateComparisonResult, bidderName: string, rateData: any) => {
    const point = {
      id: Date.now(),
      ref: item.itemRef,
      description: item.description,
      bidderName,
      rate: rateData.rate,
      deviation: rateData.deviation,
      status: rateData.status
    };
    setDiscussionPoints(prev => [...prev, point]);
  };

  const removeDiscussionPoint = (id: number) => {
    setDiscussionPoints(prev => prev.filter(p => p.id !== id));
  };

  const copyToClipboard = () => {
    if (aiSummary) {
      navigator.clipboard.writeText(aiSummary);
      alert('Copied to clipboard!');
    }
  };

  const downloadAsTxt = () => {
    if (aiSummary) {
      const element = document.createElement("a");
      const file = new Blob([aiSummary], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `Tender_Evaluation_${projectName || 'Summary'}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  const startNew = () => {
    if (window.confirm('Clear all fields and start a new evaluation?')) {
      setProjectName('');
      setNumBidders(3);
      setBidders(INITIAL_BIDDERS);
      setItems(INITIAL_ITEMS);
      setArithmeticResults(null);
      setComparisonResults(null);
      setAiSummary(null);
      setDiscussionPoints([]);
    }
  };

  const exportToCsv = () => {
    if (!comparisonResults) return;
    
    let csv = `Item Ref,Description,Average Rate,${bidders.map(b => `${b.name} Rate,${b.name} Dev %`).join(',')}
`;
    comparisonResults.forEach(res => {
      csv += `"${res.itemRef}","${res.description}",${res.averageRate.toFixed(2)},${bidders.map(b => `${res.bidderRates[b.id].rate},${res.bidderRates[b.id].deviation.toFixed(1)}%`).join(',')}
`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tender_Comparison_${projectName || 'Export'}.csv`;
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 md:px-8">
      <ModuleHeader 
        title="Evaluate Tender" 
        description="Analyze and compare tender submissions for marine and civil works with automated scoring and risk assessment."
        icon={BarChart3}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 relative">
        {/* Left Column: Inputs */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-navy-card border border-navy-border rounded-xl p-6 shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gold-accent mb-6">Tender Parameters</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Project Name</label>
                <input 
                  type="text" 
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. NEOM Coastal Infrastructure" 
                  className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Currency</label>
                  <select 
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                  >
                    <option>AED</option>
                    <option>SAR</option>
                    <option>USD</option>
                    <option>GBP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Standard</label>
                  <select 
                    value={standard}
                    onChange={(e) => setStandard(e.target.value)}
                    className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none"
                  >
                    <option>CESMM4</option>
                    <option>POMI</option>
                    <option>NRM2</option>
                    <option>Hybrid</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Number of Bidders ({numBidders})</label>
                <input 
                  type="range" 
                  min="2" 
                  max="8" 
                  value={numBidders}
                  onChange={(e) => handleNumBiddersChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-navy-deep rounded-lg appearance-none cursor-pointer accent-gold-accent"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-gray-500 uppercase font-bold">Bidder Names</label>
                {bidders.map((bidder, idx) => (
                  <input 
                    key={bidder.id}
                    type="text" 
                    value={bidder.name}
                    onChange={(e) => updateBidderName(bidder.id, e.target.value)}
                    placeholder={`Bidder ${String.fromCharCode(65 + idx)}`}
                    className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-2 text-sm focus:border-gold-accent outline-none" 
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="bg-navy-card border border-navy-border rounded-xl p-6 shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gold-accent mb-6">Analysis Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={runArithmeticCheck}
                className="w-full flex items-center gap-3 px-4 py-3 bg-navy-deep border border-navy-border rounded-lg hover:border-gold-accent/50 transition-all group"
              >
                <Calculator className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold">1. Run Arithmetic Check</span>
              </button>
              <button 
                onClick={runRateComparison}
                className="w-full flex items-center gap-3 px-4 py-3 bg-navy-deep border border-navy-border rounded-lg hover:border-gold-accent/50 transition-all group"
              >
                <ArrowRightLeft className="w-5 h-5 text-gold-accent group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold">2. Run Rate Comparison</span>
              </button>
              <button 
                onClick={generateAiSummary}
                disabled={isAnalyzing}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gold-accent text-navy-deep rounded-lg hover:bg-gold-accent/90 transition-all group disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analysing tender...
                  </>
                ) : (
                  <>
                    <FileSearch className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-bold">3. Generate AI Evaluation (Ctrl+Enter)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Discussion Points Side Panel (Desktop) */}
          <AnimatePresence>
            {discussionPoints.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-navy-card border border-navy-border rounded-xl p-6 shadow-xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-red-400 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Discussion Points ({discussionPoints.length})
                  </h3>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {discussionPoints.map((point) => (
                    <div key={point.id} className="p-3 bg-navy-deep border border-navy-border rounded-lg relative group">
                      <button 
                        onClick={() => removeDiscussionPoint(point.id)}
                        className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="text-[10px] font-mono text-gray-500 mb-1">{point.ref}</div>
                      <div className="text-xs font-bold mb-1 line-clamp-1">{point.description}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-red-400 font-bold">{point.bidderName}</span>
                        <span className="text-[10px] font-mono">Rate: {point.rate.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: BoQ Entry & Results */}
        <div className="xl:col-span-8 space-y-8">
          {/* BoQ Entry Table */}
          <div className="bg-navy-card border border-navy-border rounded-xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-navy-border flex justify-between items-center bg-navy-deep/20">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-gold-accent" />
                <h3 className="font-bold">Bill of Quantities (BoQ) Data</h3>
              </div>
              <div className="flex gap-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".csv, .xlsx, .xls" 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-navy-deep border border-navy-border rounded-lg text-xs flex items-center gap-2 hover:border-gold-accent/50 transition-all"
                >
                  <FileSpreadsheet className="w-3 h-3" />
                  Import Excel/CSV
                </button>
                <button 
                  onClick={addItem}
                  className="px-3 py-1.5 bg-gold-accent text-navy-deep font-bold rounded-lg text-xs flex items-center gap-2 hover:bg-gold-accent/90 transition-all"
                >
                  <Plus className="w-3 h-3" />
                  Add Item
                </button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-navy-deep text-gray-500 uppercase text-[10px] tracking-widest">
                    <th className="px-4 py-3 font-bold w-20">Ref</th>
                    <th className="px-4 py-3 font-bold min-w-[200px]">Description</th>
                    <th className="px-4 py-3 font-bold w-16">Unit</th>
                    <th className="px-4 py-3 font-bold w-24">Qty</th>
                    {bidders.map(b => (
                      <th key={b.id} className="px-4 py-3 font-bold min-w-[120px] text-center">{b.name} Rate</th>
                    ))}
                    <th className="px-4 py-3 font-bold w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-border">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-navy-deep/30 transition-colors">
                      <td className="px-4 py-2">
                        <input 
                          type="text" 
                          value={item.ref}
                          onChange={(e) => updateItem(item.id, 'ref', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 text-xs font-mono" 
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input 
                          type="text" 
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 text-xs" 
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input 
                          type="text" 
                          value={item.unit}
                          onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 text-xs text-center" 
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input 
                          type="number" 
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent border-none focus:ring-0 text-xs text-right font-mono" 
                        />
                      </td>
                      {bidders.map(b => (
                        <td key={b.id} className="px-4 py-2">
                          <input 
                            type="number" 
                            value={item.rates[b.id] || 0}
                            onChange={(e) => updateRate(item.id, b.id, parseFloat(e.target.value) || 0)}
                            className="w-full bg-transparent border-none focus:ring-0 text-xs text-right font-mono text-gold-accent" 
                          />
                        </td>
                      ))}
                      <td className="px-4 py-2 text-center">
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="p-1 text-gray-500 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Results Sections */}
          {arithmeticResults && (
            <div className="bg-navy-card border border-navy-border rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-6 border-b border-navy-border bg-blue-500/5 flex items-center gap-3">
                <Calculator className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold">Arithmetic Check Results</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-navy-deep/40 text-gray-500 uppercase text-[10px] tracking-widest">
                      <th className="px-6 py-4 font-bold">Bidder</th>
                      <th className="px-6 py-4 font-bold text-right">Stated Sum</th>
                      <th className="px-6 py-4 font-bold text-right">Calculated Sum</th>
                      <th className="px-6 py-4 font-bold text-right">Variance</th>
                      <th className="px-6 py-4 font-bold text-center">Errors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-border">
                    {arithmeticResults.map((res, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 font-bold">{res.bidderName}</td>
                        <td className="px-6 py-4 text-right font-mono">{res.statedSum.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-mono">{res.calculatedSum.toLocaleString()}</td>
                        <td className={`px-6 py-4 text-right font-mono ${res.variance !== 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {res.variance.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {res.errors > 0 ? (
                            <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded text-[10px] font-bold">{res.errors} ERRORS</span>
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {comparisonResults && (
            <div className="bg-navy-card border border-navy-border rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-6 border-b border-navy-border bg-gold-accent/5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <ArrowRightLeft className="w-5 h-5 text-gold-accent" />
                  <h3 className="font-bold">Rate Comparison Matrix</h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex p-1 bg-navy-deep rounded-lg border border-navy-border">
                    <button 
                      onClick={() => setViewMode('table')}
                      className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-gold-accent text-navy-deep' : 'text-gray-400 hover:text-white'}`}
                      title="Table View"
                    >
                      <TableIcon className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setViewMode('visual')}
                      className={`p-1.5 rounded-md transition-all ${viewMode === 'visual' ? 'bg-gold-accent text-navy-deep' : 'text-gray-400 hover:text-white'}`}
                      title="Visual View"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                  </div>
                  <button 
                    onClick={exportToCsv}
                    className="text-xs font-bold text-gold-accent flex items-center gap-2 hover:underline"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>
              </div>

              {viewMode === 'table' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-navy-deep/40 text-gray-500 uppercase text-[10px] tracking-widest">
                        <th className="px-6 py-4 font-bold">Item Ref</th>
                        <th className="px-6 py-4 font-bold">Description</th>
                        <th className="px-6 py-4 font-bold text-right">Avg Rate</th>
                        {bidders.map(b => (
                          <th key={b.id} className="px-6 py-4 font-bold text-center">{b.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-navy-border">
                      {comparisonResults.map((res, i) => (
                        <tr key={i}>
                          <td className="px-6 py-4 font-mono text-xs">{res.itemRef}</td>
                          <td className="px-6 py-4 text-xs">{res.description}</td>
                          <td className="px-6 py-4 text-right font-mono text-xs">{res.averageRate.toFixed(2)}</td>
                          {bidders.map(b => {
                            const data = res.bidderRates[b.id];
                            const colorClass = data.status === 'RED' ? 'bg-red-500/20 text-red-400' : data.status === 'AMBER' ? 'bg-yellow-500/20 text-yellow-400' : '';
                            return (
                              <td key={b.id} className={`px-6 py-4 text-center font-mono text-xs relative group ${colorClass}`}>
                                <div>{data.rate.toFixed(2)}</div>
                                <div className="text-[9px] opacity-70">{data.deviation > 0 ? '+' : ''}{data.deviation.toFixed(1)}%</div>
                                
                                {data.status === 'RED' && (
                                  <button 
                                    onClick={() => flagForDiscussion(res, b.name, data)}
                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-red-500 text-white rounded shadow-lg"
                                    title="Flag for Discussion"
                                  >
                                    <Flag className="w-3 h-3" />
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {comparisonResults.map((res, i) => {
                    const chartData = bidders.map(b => ({
                      name: b.name,
                      rate: res.bidderRates[b.id].rate,
                      deviation: res.bidderRates[b.id].deviation,
                      status: res.bidderRates[b.id].status
                    }));

                    return (
                      <div key={i} className="bg-navy-deep/30 border border-navy-border rounded-xl p-4 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{res.itemRef}</div>
                            <div className="text-xs font-bold text-white line-clamp-1">{res.description}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-gray-500 uppercase font-bold">Avg Rate</div>
                            <div className="text-xs font-mono text-gold-accent">{res.averageRate.toFixed(2)}</div>
                          </div>
                        </div>

                        <div className="h-48 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                              <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#94a3b8', fontSize: 10 }} 
                              />
                              <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#94a3b8', fontSize: 10 }} 
                              />
                              <Tooltip 
                                cursor={{ fill: '#1e293b', opacity: 0.4 }}
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '10px' }}
                                itemStyle={{ color: '#d4a843' }}
                              />
                              <ReferenceLine y={res.averageRate} stroke="#d4a843" strokeDasharray="3 3" label={{ position: 'right', value: 'Avg', fill: '#d4a843', fontSize: 8 }} />
                              <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.status === 'RED' ? '#f87171' : entry.status === 'AMBER' ? '#fbbf24' : '#3b82f6'} 
                                    fillOpacity={0.8}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-navy-border/50">
                          {chartData.map((d, idx) => (
                            <div key={idx} className="text-center">
                              <div className="text-[8px] text-gray-500 uppercase font-bold">{d.name}</div>
                              <div className={`text-[10px] font-mono font-bold ${d.status === 'RED' ? 'text-red-400' : d.status === 'AMBER' ? 'text-yellow-400' : 'text-blue-400'}`}>
                                {d.deviation > 0 ? '+' : ''}{d.deviation.toFixed(1)}%
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {aiSummary && (
            <div className="bg-navy-card border border-navy-border rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-6 border-b border-navy-border bg-gold-accent/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-gold-accent" />
                  <h3 className="font-bold">AI Commercial Evaluation Summary</h3>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={copyToClipboard}
                    className="p-2 bg-navy-deep border border-navy-border hover:border-gold-accent/50 rounded-lg transition-all text-gray-400 hover:text-gold-accent"
                    title="Copy to Clipboard"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={downloadAsTxt}
                    className="p-2 bg-navy-deep border border-navy-border hover:border-gold-accent/50 rounded-lg transition-all text-gray-400 hover:text-gold-accent"
                    title="Download as .txt"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={startNew}
                    className="p-2 bg-navy-deep border border-navy-border hover:border-gold-accent/50 rounded-lg transition-all text-gray-400 hover:text-gold-accent"
                    title="Start New"
                  >
                    <PlusCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-8 prose prose-invert prose-sm max-w-none font-sans leading-relaxed">
                <ReactMarkdown>{aiSummary}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
