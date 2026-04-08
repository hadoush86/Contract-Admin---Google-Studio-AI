import React, { useState } from 'react';
import { 
  ClipboardCheck, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Download, 
  Copy, 
  Check,
  Loader2,
  Plus,
  Trash2,
  FileSearch,
  AlertTriangle
} from 'lucide-react';
import { PreAwardReviewData, GlobalProject, ModuleId } from '../../types';
import { preAwardReviewAI } from '../../services/geminiService';
import Markdown from 'react-markdown';

const DOCUMENT_LIST = [
  'Letter of Acceptance (LOA) / Executed Contract Agreement',
  'Conditions of Contract — General Conditions',
  'Conditions of Contract — Particular Conditions',
  'Appendix to Tender (Contract Data / Schedule of Key Data)',
  'Specification (or Employer\'s Requirements — Yellow Book)',
  'Bill of Quantities / Schedule of Prices',
  'Contractor\'s Tender / Offer',
  'Drawings (key drawings only)',
  'Performance Security (bond document)',
  'Advance Payment Guarantee',
  'Insurance Certificates',
  'Programme (Baseline)'
];

const SCOPE_ITEMS = [
  'Contract Data / Appendix completeness — all blanks filled?',
  'Contract documents hierarchy and precedence — conflicts between documents?',
  'Particular Conditions consistency with General Conditions',
  'BoQ / Schedule of Prices — completeness, unpriced items, arithmetic',
  'Performance security — amount, form (on-demand vs conditional), expiry, issuing bank',
  'Advance payment guarantee — amount, amortisation, conditions for reduction',
  'Insurance — scope, limits, named parties, expiry aligned to Contract',
  'Programme — baseline accepted? Key milestones captured?',
  'Specification — design obligations clearly defined? (Critical for Yellow Book)',
  'Letter of Acceptance / Agreement — all defined terms consistent?',
  'Outstanding matters from tender — are any qualifications or exclusions still open?',
  'Key contractual dates (commencement, milestones, completion, DLP expiry)',
  'Time Bar Register — map all notice obligations with deadlines'
];

interface PreAwardReviewProps {
  globalProject: GlobalProject | null;
  onModuleSelect: (moduleId: ModuleId) => void;
}

export default function PreAwardReview({ globalProject, onModuleSelect }: PreAwardReviewProps) {
  const [formData, setFormData] = useState<PreAwardReviewData>({
    projectName: globalProject?.projectName || '',
    employer: globalProject?.employer || '',
    contractor: globalProject?.contractor || '',
    contractValue: '',
    location: (globalProject?.jurisdiction as any) || 'UAE — Abu Dhabi',
    fidicBook: globalProject?.fidicBook || 'Red Book 1999',
    executionDate: '',
    perspective: 'Employer',
    documents: DOCUMENT_LIST.reduce((acc, doc) => {
      acc[doc] = { available: false, content: '' };
      return acc;
    }, {} as Record<string, { available: boolean; content: string }>),
    reviewScope: []
  });

  React.useEffect(() => {
    if (globalProject) {
      setFormData(prev => ({
        ...prev,
        projectName: globalProject.projectName,
        employer: globalProject.employer || prev.employer,
        contractor: globalProject.contractor || prev.contractor,
        location: (globalProject.jurisdiction as any) || prev.location,
        fidicBook: globalProject.fidicBook || prev.fidicBook
      }));
    }
  }, [globalProject]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleFileUpload = (docName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setFormData(prev => ({
          ...prev,
          documents: {
            ...prev.documents,
            [docName]: { available: true, content }
          }
        }));
      };
      reader.readAsText(file);
    }
  };

  const handlePasteContent = (docName: string, content: string) => {
    setFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [docName]: { available: true, content }
      }
    }));
  };

  const toggleScope = (item: string) => {
    setFormData(prev => {
      if (item === 'Run Full Pre-Award Review (all items below)') {
        const isFull = prev.reviewScope.includes(item);
        return {
          ...prev,
          reviewScope: isFull ? [] : ['Run Full Pre-Award Review (all items below)', ...SCOPE_ITEMS]
        };
      }
      
      const newScope = prev.reviewScope.includes(item)
        ? prev.reviewScope.filter(i => i !== item && i !== 'Run Full Pre-Award Review (all items below)')
        : [...prev.reviewScope, item];
      
      return { ...prev, reviewScope: newScope };
    });
  };

  const handleRunReview = async () => {
    if (!formData.projectName || !formData.contractValue) {
      alert('Please provide at least Project Name and Contract Value.');
      return;
    }

    const availableDocs = Object.values(formData.documents).filter(d => d.available && d.content);
    if (availableDocs.length === 0) {
      alert('Please upload or paste at least one contract document for review.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await preAwardReviewAI(formData);
      setReport(result);
    } catch (error) {
      console.error(error);
      alert('Analysis failed. Please check your API key and try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopy = () => {
    if (report) {
      navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (report) {
      const blob = new Blob([report], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Pre-Award_Review_${formData.projectName.replace(/\s+/g, '_')}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (report) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <button 
              onClick={() => setReport(null)}
              className="text-gold-accent hover:text-gold-accent/80 flex items-center gap-2 text-sm font-bold uppercase tracking-wider mb-2"
            >
              <FileSearch className="w-4 h-4" />
              New Review
            </button>
            <h2 className="text-3xl font-bold">Pre-Award Review Report</h2>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-navy-card border border-navy-border rounded-lg hover:border-gold-accent transition-all text-sm font-bold"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy Report'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-gold-accent text-navy-deep rounded-lg hover:bg-gold-accent/90 transition-all text-sm font-bold"
            >
              <Download className="w-4 h-4" />
              Download MD
            </button>
          </div>
        </div>

        <div className="bg-navy-card border border-navy-border rounded-2xl p-8 shadow-xl prose prose-invert prose-gold max-w-none">
          <div className="flex justify-end mb-6">
            <button 
              onClick={() => onModuleSelect('ca-tracker')}
              className="flex items-center gap-2 px-4 py-2 bg-gold-accent/10 border border-gold-accent/30 rounded-xl text-xs font-bold text-gold-accent hover:bg-gold-accent/20 transition-all"
            >
              Next step: Set up this project in CA Tracker →
            </button>
          </div>
          <Markdown>{report}</Markdown>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-gold-accent/10 border border-gold-accent/20 rounded-xl flex items-center justify-center">
          <ClipboardCheck className="w-6 h-6 text-gold-accent" />
        </div>
        <div>
          <h2 className="text-3xl font-bold">Pre-Award Review</h2>
          <p className="text-gray-400">Complete review of the full contract documents package before execution.</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Section 1: Identification */}
        <section className="bg-navy-card border border-navy-border rounded-2xl p-8 shadow-lg">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-navy-deep border border-navy-border flex items-center justify-center text-gold-accent text-sm">1</span>
            Contract Package Identification
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Project Name</label>
              <input 
                type="text"
                value={formData.projectName}
                onChange={e => setFormData(prev => ({ ...prev, projectName: e.target.value }))}
                placeholder="Enter project name"
                className="w-full bg-navy-deep border border-navy-border rounded-xl px-4 py-3 focus:border-gold-accent outline-none transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Contract Value</label>
              <input 
                type="text"
                value={formData.contractValue}
                onChange={e => setFormData(prev => ({ ...prev, contractValue: e.target.value }))}
                placeholder="e.g. AED 185,000,000"
                className="w-full bg-navy-deep border border-navy-border rounded-xl px-4 py-3 focus:border-gold-accent outline-none transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Employer / Client</label>
              <input 
                type="text"
                value={formData.employer}
                onChange={e => setFormData(prev => ({ ...prev, employer: e.target.value }))}
                placeholder="Enter employer name"
                className="w-full bg-navy-deep border border-navy-border rounded-xl px-4 py-3 focus:border-gold-accent outline-none transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Proposed Contractor</label>
              <input 
                type="text"
                value={formData.contractor}
                onChange={e => setFormData(prev => ({ ...prev, contractor: e.target.value }))}
                placeholder="Enter contractor name"
                className="w-full bg-navy-deep border border-navy-border rounded-xl px-4 py-3 focus:border-gold-accent outline-none transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Project Location</label>
              <select 
                value={formData.location}
                onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full bg-navy-deep border border-navy-border rounded-xl px-4 py-3 focus:border-gold-accent outline-none transition-colors"
              >
                <option>UAE — Abu Dhabi</option>
                <option>UAE — Dubai</option>
                <option>UAE — Fujairah</option>
                <option>UAE — Other</option>
                <option>KSA — Jeddah</option>
                <option>KSA — Jubail</option>
                <option>KSA — NEOM</option>
                <option>Other GCC</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Date of Proposed Execution</label>
              <input 
                type="date"
                value={formData.executionDate}
                onChange={e => setFormData(prev => ({ ...prev, executionDate: e.target.value }))}
                className="w-full bg-navy-deep border border-navy-border rounded-xl px-4 py-3 focus:border-gold-accent outline-none transition-colors"
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">FIDIC Book</label>
              <div className="flex flex-wrap gap-3">
                {['Red Book 1999', 'Yellow Book 1999', 'Red Book 2017', 'Other'].map(book => (
                  <button
                    key={book}
                    onClick={() => setFormData(prev => ({ ...prev, fidicBook: book }))}
                    className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium ${
                      formData.fidicBook === book
                        ? 'bg-gold-accent text-navy-deep border-gold-accent'
                        : 'bg-navy-deep border-navy-border text-gray-400 hover:border-gold-accent/50'
                    }`}
                  >
                    {book}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Review Perspective</label>
              <div className="flex flex-wrap gap-3">
                {['Employer', 'Contractor', 'Engineer/Consultant'].map(p => (
                  <button
                    key={p}
                    onClick={() => setFormData(prev => ({ ...prev, perspective: p as any }))}
                    className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium ${
                      formData.perspective === p
                        ? 'bg-gold-accent text-navy-deep border-gold-accent'
                        : 'bg-navy-deep border-navy-border text-gray-400 hover:border-gold-accent/50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Document Checklist */}
        <section className="bg-navy-card border border-navy-border rounded-2xl p-8 shadow-lg">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-navy-deep border border-navy-border flex items-center justify-center text-gold-accent text-sm">2</span>
            Contract Document Checklist
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-border text-gray-500 text-left">
                  <th className="pb-4 font-bold uppercase tracking-wider">Document</th>
                  <th className="pb-4 font-bold uppercase tracking-wider text-center">Available?</th>
                  <th className="pb-4 font-bold uppercase tracking-wider">Upload / Paste Content</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-border">
                {DOCUMENT_LIST.map((doc) => (
                  <tr key={doc} className="group">
                    <td className="py-4 pr-4 font-medium text-gray-300 group-hover:text-white transition-colors">
                      {doc}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          documents: {
                            ...prev.documents,
                            [doc]: { ...prev.documents[doc], available: !prev.documents[doc].available }
                          }
                        }))}
                        className={`w-6 h-6 rounded border flex items-center justify-center transition-all mx-auto ${
                          formData.documents[doc].available
                            ? 'bg-gold-accent border-gold-accent text-navy-deep'
                            : 'border-navy-border text-transparent hover:border-gold-accent/50'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="py-4 pl-4">
                      <div className="flex items-center gap-3">
                        <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-navy-deep border border-navy-border rounded-lg hover:border-gold-accent transition-all text-xs font-bold text-gray-400 hover:text-white">
                          <Upload className="w-3.5 h-3.5" />
                          Upload
                          <input 
                            type="file" 
                            accept=".txt" 
                            className="hidden" 
                            onChange={(e) => handleFileUpload(doc, e)}
                          />
                        </label>
                        <div className="flex-1 relative">
                          <textarea
                            placeholder="Or paste content here..."
                            value={formData.documents[doc].content}
                            onChange={(e) => handlePasteContent(doc, e.target.value)}
                            className="w-full bg-navy-deep border border-navy-border rounded-lg px-3 py-1.5 text-xs focus:border-gold-accent outline-none transition-colors h-8 resize-none overflow-hidden hover:h-24 focus:h-24"
                          />
                        </div>
                        {formData.documents[doc].content && (
                          <div className="text-green-500">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3: Review Scope */}
        <section className="bg-navy-card border border-navy-border rounded-2xl p-8 shadow-lg">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-navy-deep border border-navy-border flex items-center justify-center text-gold-accent text-sm">3</span>
            Review Scope
          </h3>

          <div className="space-y-4">
            <button
              onClick={() => toggleScope('Run Full Pre-Award Review (all items below)')}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                formData.reviewScope.includes('Run Full Pre-Award Review (all items below)')
                  ? 'bg-gold-accent/10 border-gold-accent text-gold-accent shadow-[0_0_20px_rgba(212,168,67,0.1)]'
                  : 'bg-navy-deep border-navy-border text-gray-400 hover:border-gold-accent/50'
              }`}
            >
              <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                formData.reviewScope.includes('Run Full Pre-Award Review (all items below)')
                  ? 'bg-gold-accent border-gold-accent text-navy-deep'
                  : 'border-navy-border'
              }`}>
                <Check className="w-4 h-4" />
              </div>
              <span className="font-bold">Run Full Pre-Award Review (all items below)</span>
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SCOPE_ITEMS.map((item) => (
                <button
                  key={item}
                  onClick={() => toggleScope(item)}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left text-sm ${
                    formData.reviewScope.includes(item)
                      ? 'bg-navy-deep border-gold-accent text-white'
                      : 'bg-navy-deep border-navy-border text-gray-400 hover:border-gold-accent/30'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0 ${
                    formData.reviewScope.includes(item)
                      ? 'bg-gold-accent border-gold-accent text-navy-deep'
                      : 'border-navy-border'
                  }`}>
                    <Check className="w-3 h-3" />
                  </div>
                  <span>{item}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Action Button */}
        <div className="flex justify-center pt-4">
          <button
            onClick={handleRunReview}
            disabled={isAnalyzing}
            className="group relative flex items-center gap-3 px-12 py-5 bg-gold-accent text-navy-deep rounded-2xl font-bold text-lg hover:bg-gold-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(212,168,67,0.2)] hover:shadow-[0_0_40px_rgba(212,168,67,0.3)]"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Analyzing Contract Package...
              </>
            ) : (
              <>
                <ClipboardCheck className="w-6 h-6" />
                Run Pre-Award Review
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
