import React, { useState, useEffect, useMemo } from 'react';
import { 
  GanttChart, 
  Settings, 
  CreditCard, 
  FileEdit, 
  AlertTriangle, 
  Mail, 
  Bell, 
  Plus, 
  Trash2, 
  Download, 
  MessageSquare, 
  X, 
  Send,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  DollarSign,
  ArrowUpRight,
  Filter,
  FileText
} from 'lucide-react';
import { 
  CATrackerProject,
  CATrackerState,
  CAProjectSetup, 
  IPCEntry, 
  ClaimEntry, 
  CorrespondenceEntry, 
  ProjectMilestone,
  LetterFormData,
  GlobalProject,
  ModuleId
} from '../../types';
import { caAssistantChat } from '../../services/geminiService';
import { calculateNetCertified, calculateRetentionDeduction, calculateIPCDueDate, calculateIPCSummary } from '../../utils/ipcCalculations';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import JSZip from 'jszip';

const FIDIC_CLAUSES: Record<string, { title: string; desc: string }> = {
  '1.1': { title: 'Definitions', desc: 'Defines key terms used throughout the contract.' },
  '2.1': { title: 'Right of Access to the Site', desc: 'The Employer shall give the Contractor right of access to, and possession of, all parts of the Site.' },
  '3.3': { title: 'Instructions of the Engineer', desc: 'The Engineer may issue to the Contractor instructions which may be necessary for the execution of the Works.' },
  '3.5': { title: 'Determinations', desc: 'The Engineer shall consult with each Party to reach agreement on any matter.' },
  '4.4': { title: 'Subcontractors', desc: 'The Contractor shall not subcontract the whole of the Works.' },
  '4.12': { title: 'Unforeseeable Physical Conditions', desc: 'Entitlement to EOT and Cost if the Contractor encounters unforeseeable physical conditions.' },
  '8.1': { title: 'Commencement of Works', desc: 'The Engineer shall give the Contractor not less than 7 days\' notice of the Commencement Date.' },
  '8.4': { title: 'Extension of Time for Completion', desc: 'Entitlement to an extension of the Time for Completion.' },
  '8.7': { title: 'Delay Damages', desc: 'If the Contractor fails to comply with Sub-Clause 8.2, the Contractor shall pay delay damages.' },
  '10.1': { title: 'Taking Over of the Works and Sections', desc: 'The Works shall be taken over by the Employer when they have been completed in accordance with the Contract.' },
  '13.1': { title: 'Right to Vary', desc: 'Variations may be initiated by the Engineer at any time prior to issuing the Taking-Over Certificate.' },
  '13.3': { title: 'Variation Procedure', desc: 'The Engineer may request a proposal, prior to instructing a Variation.' },
  '14.3': { title: 'Application for Interim Payment Certificates', desc: 'The Contractor shall submit a Statement in six copies to the Engineer after the end of each month.' },
  '14.7': { title: 'Payment', desc: 'The Employer shall pay the amount certified in each Interim Payment Certificate.' },
  '20.1': { title: 'Contractor\'s Claims', desc: 'Procedure for the Contractor to claim additional payment or extension of time.' },
};

function Tooltip({ clause }: { clause: string }) {
  const info = FIDIC_CLAUSES[clause];
  if (!info) return null;
  return (
    <div className="group relative inline-block ml-1">
      <div className="w-4 h-4 rounded-full bg-navy-border flex items-center justify-center text-[10px] font-bold text-gray-400 cursor-help hover:bg-gold-accent hover:text-navy-deep transition-all">?</div>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-navy-card border border-navy-border rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50">
        <p className="text-[10px] font-bold text-gold-accent mb-1">Sub-Clause {clause}: {info.title}</p>
        <p className="text-[10px] text-gray-400 leading-tight">{info.desc}</p>
      </div>
    </div>
  );
}

interface CATrackerProps {
  onDraftLetter?: (data: Partial<LetterFormData>) => void;
  globalProject: GlobalProject | null;
  onProjectUpdate: (project: GlobalProject) => void;
  onModuleSelect: (moduleId: ModuleId) => void;
}

export default function CATracker({ onDraftLetter, globalProject, onProjectUpdate, onModuleSelect }: CATrackerProps) {
  const [activeTab, setActiveTab] = useState<'setup' | 'ipc' | 'vo' | 'claims' | 'correspondence' | 'alerts'>('setup');
  const [state, setState] = useState<CATrackerState>(() => {
    const saved = sessionStorage.getItem('ca_tracker_state');
    if (saved) return JSON.parse(saved);
    return {
      projects: [],
      activeProjectId: null
    };
  });

  const activeProject = useMemo(() => {
    return state.projects.find(p => p.id === state.activeProjectId) || null;
  }, [state]);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  useEffect(() => {
    sessionStorage.setItem('ca_tracker_state', JSON.stringify(state));
  }, [state]);

  const updateActiveProject = (updater: (project: CATrackerProject) => CATrackerProject) => {
    if (!state.activeProjectId) return;
    setState(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === prev.activeProjectId ? updater(p) : p)
    }));
  };

  const handleSaveSetup = (setup: CAProjectSetup) => {
    const projectId = state.activeProjectId || Math.random().toString(36).substr(2, 9);
    
    const newProject: CATrackerProject = activeProject ? {
      ...activeProject,
      projectSetup: setup
    } : {
      id: projectId,
      projectSetup: setup,
      ipcs: [],
      claims: [],
      correspondence: [],
      milestones: [
        { id: '1', title: 'Commencement Date', plannedDate: '', actualDate: '', status: 'Pending' },
        { id: '2', title: 'Original Completion Date', plannedDate: '', actualDate: '', status: 'Pending' },
        { id: '3', title: 'Taking-Over Certificate Issued', plannedDate: '', actualDate: '', status: 'Pending' },
        { id: '4', title: 'DNP Expiry', plannedDate: '', actualDate: '', status: 'Pending' },
        { id: '5', title: 'Performance Certificate Due', plannedDate: '', actualDate: '', status: 'Pending' },
        { id: '6', title: 'Final Payment Certificate Due', plannedDate: '', actualDate: '', status: 'Pending' },
      ]
    };

    setState(prev => {
      const exists = prev.projects.find(p => p.id === projectId);
      return {
        ...prev,
        projects: exists 
          ? prev.projects.map(p => p.id === projectId ? newProject : p)
          : [...prev.projects, newProject],
        activeProjectId: projectId
      };
    });

    onProjectUpdate({
      projectName: setup.projectName,
      contractNumber: setup.contractNumber,
      fidicBook: setup.fidicBook,
      jurisdiction: setup.jurisdiction,
      employer: setup.employer,
      contractor: setup.contractor
    });

    setActiveTab('ipc');
  };

  const handleAddIPC = () => {
    updateActiveProject(p => ({
      ...p,
      ipcs: [...p.ipcs, {
        id: Math.random().toString(36).substr(2, 9),
        ipcNo: p.ipcs.length + 1,
        periodEnding: '',
        statementDate: '',
        claimedAmount: 0,
        certifiedAmount: 0,
        retentionDeduction: 0,
        advancePaymentRecovery: 0,
        delayDamages: 0,
        otherDeductions: 0,
        otherDeductionsDesc: '',
        netCertified: 0,
        issuedDate: '',
        dueDate: '',
        actualPaymentDate: '',
        status: 'Draft'
      }]
    }));
  };

  const handleAddClaim = () => {
    updateActiveProject(p => ({
      ...p,
      claims: [...p.claims, {
        id: Math.random().toString(36).substr(2, 9),
        refNo: `CL-${String(p.claims.length + 1).padStart(3, '0')}`,
        type: 'EOT',
        subject: '',
        eventDate: '',
        noticeDate: '',
        particularsDate: '',
        contractorEOT: 0,
        contractorCost: 0,
        engineerEOT: 0,
        engineerCost: 0,
        determinationDate: '',
        determinationRef: '',
        eotGranted: 0,
        costCertified: 0,
        status: 'Received',
        notes: ''
      }]
    }));
  };

  const handleAddCorrespondence = () => {
    updateActiveProject(p => ({
      ...p,
      correspondence: [...p.correspondence, {
        id: Math.random().toString(36).substr(2, 9),
        refNo: '',
        date: new Date().toISOString().split('T')[0],
        direction: 'Engineer → Contractor',
        type: 'Notice',
        subject: '',
        subClauses: '',
        responseRequired: false,
        deadline: '',
        responseDate: '',
        responseRef: '',
        status: 'Sent'
      }]
    }));
  };

  const handleAddMilestone = () => {
    updateActiveProject(p => ({
      ...p,
      milestones: [...p.milestones, {
        id: Math.random().toString(36).substr(2, 9),
        title: 'New Milestone',
        plannedDate: '',
        actualDate: '',
        status: 'Pending'
      }]
    }));
  };

  const handleExportZIP = async () => {
    if (!activeProject) return;
    const zip = new JSZip();
    const projectName = activeProject.projectSetup?.projectName || 'Project';
    const date = new Date().toISOString().split('T')[0];

    // IPC CSV
    const ipcHeaders = 'IPC No.,Period Ending,Certified Amount,Net Certified,Status\n';
    const ipcRows = activeProject.ipcs.map(i => `${i.ipcNo},${i.periodEnding},${i.certifiedAmount},${i.netCertified},${i.status}`).join('\n');
    zip.file('IPC_Register.csv', ipcHeaders + ipcRows);

    // Claims CSV
    const claimHeaders = 'Ref No.,Type,Subject,Claimed EOT,Claimed Cost,Granted EOT,Certified Cost,Status\n';
    const claimRows = activeProject.claims.map(c => `${c.refNo},${c.type},${c.subject},${c.contractorEOT},${c.contractorCost},${c.eotGranted},${c.costCertified},${c.status}`).join('\n');
    zip.file('Claims_Register.csv', claimHeaders + claimRows);

    // Correspondence CSV
    const corrHeaders = 'Ref No.,Date,Direction,Subject,Status\n';
    const corrRows = activeProject.correspondence.map(c => `${c.refNo},${c.date},${c.direction},${c.subject},${c.status}`).join('\n');
    zip.file('Correspondence_Register.csv', corrHeaders + corrRows);

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '_')}-CA-Package-${date}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGenerateMonthlyReport = async () => {
    if (!activeProject) return;
    setIsGeneratingReport(true);
    try {
      const prompt = "Generate a comprehensive Monthly CA Report based on the provided contract data. Cover financial summary (IPC status, VO position, claims), programme status (EOT granted, revised completion), correspondence status (overdue items), and upcoming deadlines. Provide a professional narrative summary.";
      const response = await caAssistantChat(activeProject as any, prompt, []);
      
      // Show report in chat or a modal
      setChatMessages(prev => [...prev, { role: 'model', text: response }]);
      setIsChatOpen(true);
    } catch (error) {
      console.error(error);
      alert('Failed to generate monthly report.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !activeProject) return;
    
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const history = chatMessages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      const response = await caAssistantChat(activeProject as any, userMsg, history);
      setChatMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      console.error(error);
      setChatMessages(prev => [...prev, { role: 'model', text: "Error: Failed to get response from CA Assistant." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 relative min-h-[calc(100vh-100px)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gold-accent/10 border border-gold-accent/20 rounded-xl flex items-center justify-center">
            <GanttChart className="w-6 h-6 text-gold-accent" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">CA Tracker</h2>
            <p className="text-gray-400">Live contract administration for construction supervision phase.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {state.projects.length > 0 && (
            <select
              value={state.activeProjectId || ''}
              onChange={e => setState(prev => ({ ...prev, activeProjectId: e.target.value }))}
              className="bg-navy-card border border-navy-border rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-gold-accent transition-all"
            >
              <option value="" disabled>Select Project</option>
              {state.projects.map(p => (
                <option key={p.id} value={p.id}>{p.projectSetup?.projectName || 'Untitled Project'}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => {
              const newId = Math.random().toString(36).substr(2, 9);
              setState(prev => ({ ...prev, activeProjectId: newId }));
              setActiveTab('setup');
            }}
            className="p-2 bg-navy-card border border-navy-border rounded-xl hover:border-gold-accent text-gold-accent transition-all"
            title="Add New Project"
          >
            <Plus className="w-5 h-5" />
          </button>
          {activeProject && (
            <button
              onClick={handleExportZIP}
              className="flex items-center gap-2 px-4 py-2 bg-navy-card border border-navy-border rounded-xl hover:border-gold-accent transition-all text-sm font-bold"
            >
              <Download className="w-4 h-4" />
              Export Package
            </button>
          )}
        </div>
      </div>

      {activeProject?.projectSetup && (
        <div className="flex items-center gap-6 px-6 py-3 bg-navy-card border border-navy-border rounded-xl shadow-lg mb-8">
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Contract Sum</p>
            <p className="text-lg font-bold text-gold-accent">
              {activeProject.projectSetup.currency} {activeProject.projectSetup.originalContractSum.toLocaleString()}
            </p>
          </div>
          <div className="w-px h-8 bg-navy-border" />
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Commencement</p>
            <p className="text-lg font-bold">{activeProject.projectSetup.commencementDate || 'TBC'}</p>
          </div>
          <div className="w-px h-8 bg-navy-border" />
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Completion</p>
            <p className="text-lg font-bold text-blue-400">
              {activeProject.projectSetup.commencementDate ? 'Calculated' : 'TBC'}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-navy-deep p-1 rounded-xl border border-navy-border mb-8 overflow-x-auto no-scrollbar">
        {[
          { id: 'setup', label: 'Project Setup', icon: Settings },
          { id: 'ipc', label: 'IPC Register', icon: CreditCard },
          { id: 'vo', label: 'VO Register', icon: FileEdit },
          { id: 'claims', label: 'Claims Register', icon: AlertTriangle },
          { id: 'correspondence', label: 'Correspondence', icon: Mail },
          { id: 'alerts', label: 'Deadlines & Alerts', icon: Bell },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-gold-accent text-navy-deep shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-navy-card'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {activeTab === 'setup' && (
          <ProjectSetupTab setup={activeProject?.projectSetup || null} onSave={handleSaveSetup} globalProject={globalProject} />
        )}
        {activeTab === 'ipc' && (
          <IPCRegisterTab 
            setup={activeProject?.projectSetup || null} 
            ipcs={activeProject?.ipcs || []} 
            onUpdate={(ipcs) => updateActiveProject(p => ({ ...p, ipcs }))}
            onAdd={handleAddIPC}
            onDraftLetter={onDraftLetter}
          />
        )}
        {activeTab === 'claims' && (
          <ClaimsRegisterTab
            setup={activeProject?.projectSetup || null}
            claims={activeProject?.claims || []}
            onUpdate={(claims) => updateActiveProject(p => ({ ...p, claims }))}
            onAdd={handleAddClaim}
            onDraftLetter={onDraftLetter}
          />
        )}
        {activeTab === 'correspondence' && (
          <CorrespondenceRegisterTab
            correspondence={activeProject?.correspondence || []}
            onUpdate={(correspondence) => updateActiveProject(p => ({ ...p, correspondence }))}
            onAdd={handleAddCorrespondence}
            onDraftLetter={onDraftLetter}
          />
        )}
        {activeTab === 'alerts' && (
          <DeadlinesAlertsTab
            data={activeProject as any}
            onUpdateMilestones={(milestones) => updateActiveProject(p => ({ ...p, milestones }))}
            onAddMilestone={handleAddMilestone}
            onGenerateReport={handleGenerateMonthlyReport}
            isGeneratingReport={isGeneratingReport}
          />
        )}
        {activeTab === 'vo' && (
          <div className="bg-navy-card border border-navy-border rounded-2xl p-12 text-center">
            <FileEdit className="w-16 h-16 text-gold-accent/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">
              VO Register Integration
              <Tooltip clause="13.1" />
            </h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              The VO Register is linked to the Variation Order module. 
              Cumulative VO impact is automatically tracked here.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="p-6 bg-navy-deep border border-navy-border rounded-xl">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Original Sum</p>
                <p className="text-2xl font-bold">{activeProject?.projectSetup?.currency || 'AED'} {activeProject?.projectSetup?.originalContractSum.toLocaleString() || '0'}</p>
              </div>
              <div className="p-6 bg-navy-deep border border-navy-border rounded-xl">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Approved VOs</p>
                <p className="text-2xl font-bold text-green-400">+ 0.00</p>
              </div>
              <div className="p-6 bg-navy-deep border border-navy-border rounded-xl border-gold-accent/30">
                <p className="text-xs font-bold text-gold-accent uppercase mb-2">Current Sum</p>
                <p className="text-2xl font-bold">{activeProject?.projectSetup?.currency || 'AED'} {activeProject?.projectSetup?.originalContractSum.toLocaleString() || '0'}</p>
              </div>
            </div>
            <button 
              onClick={() => onModuleSelect('variation-order')}
              className="mt-8 flex items-center gap-2 px-6 py-3 bg-gold-accent text-navy-deep rounded-xl font-bold mx-auto hover:bg-gold-accent/90 transition-all"
            >
              Update Variation Order Register
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Floating Chat Assistant */}
      <div className="fixed bottom-8 right-8 z-50">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute bottom-20 right-0 w-96 h-[500px] bg-navy-card border border-navy-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-navy-border bg-navy-deep flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gold-accent/10 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-gold-accent" />
                  </div>
                  <span className="font-bold">CA Assistant</span>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">Ask me anything about your contract data.</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-gold-accent text-navy-deep font-medium' 
                        : 'bg-navy-deep border border-navy-border text-gray-200'
                    }`}>
                      {msg.role === 'model' ? (
                        <div className="prose prose-invert prose-sm max-w-none">
                          <Markdown>{msg.text}</Markdown>
                        </div>
                      ) : (
                        msg.text
                      )}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-navy-deep border border-navy-border p-3 rounded-xl">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-navy-border bg-navy-deep">
                <div className="relative">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask a question..."
                    className="w-full bg-navy-card border border-navy-border rounded-xl pl-4 pr-12 py-3 text-sm focus:border-gold-accent outline-none transition-all"
                  />
                  <button 
                    onClick={handleSendMessage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-gold-accent text-navy-deep rounded-lg flex items-center justify-center hover:bg-gold-accent/90 transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 bg-gold-accent text-navy-deep rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all active:scale-95"
        >
          {isChatOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
}

// --- Sub-Tab Components ---

function ProjectSetupTab({ setup, onSave, globalProject }: { setup: CAProjectSetup | null, onSave: (setup: CAProjectSetup) => void, globalProject: GlobalProject | null }) {
  const [formData, setFormData] = useState<CAProjectSetup>(setup || {
    projectName: globalProject?.projectName || '',
    contractNumber: globalProject?.contractNumber || '',
    fidicBook: (globalProject?.fidicBook as any) || 'Red Book 1999',
    jurisdiction: (globalProject?.jurisdiction as any) || 'UAE',
    employer: globalProject?.employer || '',
    contractor: globalProject?.contractor || '',
    engineer: '',
    originalContractSum: 0,
    currency: (globalProject?.currency as any) || 'AED',
    commencementDate: '',
    originalTimeForCompletion: 0,
    timeUnit: 'calendar days',
    dnpPeriod: 12,
    dnpUnit: 'months',
    retentionPercentage: 5,
    retentionCap: 5,
    advancePaymentAmount: 0,
    advancePaymentThreshold: 0,
    performanceBondPercentage: 10,
    performanceBondExpiry: '',
    delayDamagesRate: 0,
    maxDelayDamagesCap: 10
  });

  useEffect(() => {
    if (globalProject && !setup) {
      setFormData(prev => ({
        ...prev,
        projectName: globalProject.projectName,
        contractNumber: globalProject.contractNumber,
        fidicBook: (globalProject.fidicBook as any) || prev.fidicBook,
        jurisdiction: (globalProject.jurisdiction as any) || prev.jurisdiction,
        employer: globalProject.employer || prev.employer,
        contractor: globalProject.contractor || prev.contractor,
        currency: (globalProject.currency as any) || prev.currency
      }));
    }
  }, [globalProject, setup]);

  const calculatedCompletionDate = useMemo(() => {
    if (!formData.commencementDate || !formData.originalTimeForCompletion) return 'TBC';
    const date = new Date(formData.commencementDate);
    date.setDate(date.getDate() + Number(formData.originalTimeForCompletion));
    return date.toISOString().split('T')[0];
  }, [formData.commencementDate, formData.originalTimeForCompletion]);

  const calculatedDNPExpiry = useMemo(() => {
    if (calculatedCompletionDate === 'TBC') return 'TBC';
    const date = new Date(calculatedCompletionDate);
    if (formData.dnpUnit === 'months') {
      date.setMonth(date.getMonth() + Number(formData.dnpPeriod));
    } else {
      date.setDate(date.getDate() + Number(formData.dnpPeriod));
    }
    return date.toISOString().split('T')[0];
  }, [calculatedCompletionDate, formData.dnpPeriod, formData.dnpUnit]);

  return (
    <div className="bg-navy-card border border-navy-border rounded-2xl p-8 shadow-xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h4 className="text-lg font-bold flex items-center gap-2 text-gold-accent">
            <Settings className="w-5 h-5" />
            Basic Information
          </h4>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Project Name</label>
              <input 
                type="text" 
                value={formData.projectName}
                onChange={e => setFormData(prev => ({ ...prev, projectName: e.target.value }))}
                className="w-full bg-navy-deep border border-navy-border rounded-xl px-4 py-3 focus:border-gold-accent outline-none transition-all"
                placeholder="Enter project name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Contract Number</label>
              <input 
                type="text" 
                value={formData.contractNumber}
                onChange={e => setFormData(prev => ({ ...prev, contractNumber: e.target.value }))}
                className="w-full bg-navy-deep border border-navy-border rounded-xl px-4 py-3 focus:border-gold-accent outline-none transition-all"
                placeholder="e.g. CON-2024-001"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">FIDIC Book</label>
                <div className="flex gap-2">
                  {['Red Book 1999', 'Yellow Book 1999'].map(book => (
                    <button
                      key={book}
                      onClick={() => setFormData(prev => ({ ...prev, fidicBook: book as any }))}
                      className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${
                        formData.fidicBook === book ? 'bg-gold-accent text-navy-deep border-gold-accent' : 'bg-navy-deep border-navy-border text-gray-400'
                      }`}
                    >
                      {book.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Jurisdiction</label>
                <div className="flex gap-2">
                  {['UAE', 'KSA'].map(j => (
                    <button
                      key={j}
                      onClick={() => setFormData(prev => ({ ...prev, jurisdiction: j as any }))}
                      className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${
                        formData.jurisdiction === j ? 'bg-gold-accent text-navy-deep border-gold-accent' : 'bg-navy-deep border-navy-border text-gray-400'
                      }`}
                    >
                      {j}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Employer</label>
              <input 
                type="text" 
                value={formData.employer}
                onChange={e => setFormData(prev => ({ ...prev, employer: e.target.value }))}
                className="w-full bg-navy-deep border border-navy-border rounded-xl px-4 py-3 focus:border-gold-accent outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Contractor</label>
              <input 
                type="text" 
                value={formData.contractor}
                onChange={e => setFormData(prev => ({ ...prev, contractor: e.target.value }))}
                className="w-full bg-navy-deep border border-navy-border rounded-xl px-4 py-3 focus:border-gold-accent outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="text-lg font-bold flex items-center gap-2 text-gold-accent">
            <DollarSign className="w-5 h-5" />
            Financial & Time Parameters
          </h4>
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Original Contract Sum</label>
                <input 
                  type="number" 
                  value={formData.originalContractSum}
                  onChange={e => setFormData(prev => ({ ...prev, originalContractSum: Number(e.target.value) }))}
                  className="w-full bg-navy-deep border border-navy-border rounded-xl px-4 py-3 focus:border-gold-accent outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Currency</label>
                <select 
                  value={formData.currency}
                  onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value as any }))}
                  className="w-full bg-navy-deep border border-navy-border rounded-xl px-4 py-3 focus:border-gold-accent outline-none transition-all"
                >
                  <option>AED</option>
                  <option>SAR</option>
                  <option>USD</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Commencement Date
                  <Tooltip clause="8.1" />
                </label>
                <input 
                  type="date" 
                  value={formData.commencementDate}
                  onChange={e => setFormData(prev => ({ ...prev, commencementDate: e.target.value }))}
                  className="w-full bg-navy-deep border border-navy-border rounded-xl px-4 py-3 focus:border-gold-accent outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Time for Completion
                  <Tooltip clause="8.4" />
                </label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={formData.originalTimeForCompletion}
                    onChange={e => setFormData(prev => ({ ...prev, originalTimeForCompletion: Number(e.target.value) }))}
                    className="w-full bg-navy-deep border border-navy-border rounded-xl px-4 py-3 focus:border-gold-accent outline-none transition-all"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Retention %
                  <Tooltip clause="14.3" />
                </label>
                <input 
                  type="number" 
                  value={formData.retentionPercentage}
                  onChange={e => setFormData(prev => ({ ...prev, retentionPercentage: Number(e.target.value) }))}
                  className="w-full bg-navy-deep border border-navy-border rounded-xl px-4 py-3 focus:border-gold-accent outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Delay Damages
                  <Tooltip clause="8.7" />
                </label>
                <input 
                  type="number" 
                  value={formData.delayDamagesRate}
                  onChange={e => setFormData(prev => ({ ...prev, delayDamagesRate: Number(e.target.value) }))}
                  className="w-full bg-navy-deep border border-navy-border rounded-xl px-4 py-3 focus:border-gold-accent outline-none transition-all"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-navy-deep border border-navy-border rounded-xl">
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Calculated Completion</p>
                <p className="text-lg font-bold text-blue-400">{calculatedCompletionDate}</p>
              </div>
              <div className="p-4 bg-navy-deep border border-navy-border rounded-xl">
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">DNP Expiry</p>
                <p className="text-lg font-bold text-purple-400">{calculatedDNPExpiry}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 flex justify-center">
        <button 
          onClick={() => onSave(formData)}
          className="px-12 py-4 bg-gold-accent text-navy-deep rounded-xl font-bold hover:bg-gold-accent/90 transition-all shadow-lg shadow-gold-accent/20"
        >
          Save Project Setup
        </button>
      </div>
    </div>
  );
}

function IPCRegisterTab({ setup, ipcs, onUpdate, onAdd, onDraftLetter }: { 
  setup: CAProjectSetup | null, 
  ipcs: IPCEntry[], 
  onUpdate: (ipcs: IPCEntry[]) => void,
  onAdd: () => void,
  onDraftLetter?: (data: Partial<LetterFormData>) => void
}) {
  const stats = useMemo(() => {
    const summary = calculateIPCSummary(ipcs, {
      originalContractSum: setup?.originalContractSum || 0,
      advancePaymentAmount: setup?.advancePaymentAmount || 0,
    });
    return {
      ...summary,
      currentSum: summary.originalSum, // + VOs
      totalAdvance: summary.advanceBalance,
    };
  }, [ipcs, setup]);

  const handleUpdateIPC = (id: string, field: keyof IPCEntry, value: any) => {
    onUpdate(ipcs.map(ipc => {
      if (ipc.id === id) {
        const updated = { ...ipc, [field]: value };
        // Auto calculations
        if (field === 'certifiedAmount' && setup) {
          updated.retentionDeduction = calculateRetentionDeduction(Number(value), setup.retentionPercentage);
        }
        if (field === 'issuedDate') {
          updated.dueDate = calculateIPCDueDate(value);
        }
        updated.netCertified = calculateNetCertified(updated);
        return updated;
      }
      return ipc;
    }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Original Sum', value: stats.originalSum, color: 'text-white' },
          { label: 'Current Sum', value: stats.currentSum, color: 'text-gold-accent' },
          { label: 'Certified to Date', value: stats.totalCertified, color: 'text-green-400' },
          { label: 'Remaining Sum', value: stats.remaining, color: 'text-blue-400' },
          { label: 'Retention Held', value: stats.totalRetention, color: 'text-purple-400' },
          { label: 'Advance Balance', value: stats.totalAdvance, color: 'text-amber-400' },
        ].map((stat, i) => (
          <div key={i} className="p-4 bg-navy-card border border-navy-border rounded-xl shadow-sm">
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">{stat.label}</p>
            <p className={`text-lg font-bold ${stat.color}`}>
              {setup?.currency || 'AED'} {stat.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-navy-card border border-navy-border rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-navy-border flex items-center justify-between">
          <h4 className="font-bold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gold-accent" />
            Interim Payment Certificates
            <Tooltip clause="14.7" />
          </h4>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-navy-deep border border-navy-border rounded-lg text-xs font-bold hover:border-gold-accent transition-all flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button 
              onClick={onAdd}
              className="px-4 py-2 bg-gold-accent text-navy-deep rounded-lg text-xs font-bold hover:bg-gold-accent/90 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add IPC
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-navy-deep text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <tr>
                <th className="px-6 py-4">No.</th>
                <th className="px-6 py-4">Period Ending</th>
                <th className="px-6 py-4">Certified Amount</th>
                <th className="px-6 py-4">Deductions</th>
                <th className="px-6 py-4">Net Certified</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-border">
              {ipcs.map(ipc => (
                <tr key={ipc.id} className="hover:bg-navy-deep/50 transition-colors">
                  <td className="px-6 py-4 font-bold">{ipc.ipcNo}</td>
                  <td className="px-6 py-4">
                    <input 
                      type="date" 
                      value={ipc.periodEnding}
                      onChange={e => handleUpdateIPC(ipc.id, 'periodEnding', e.target.value)}
                      className="bg-transparent border-none outline-none focus:ring-0 text-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="number" 
                      value={ipc.certifiedAmount}
                      onChange={e => handleUpdateIPC(ipc.id, 'certifiedAmount', Number(e.target.value))}
                      className="bg-transparent border-none outline-none focus:ring-0 font-bold text-white w-32"
                    />
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">
                    <div className="space-y-1">
                      <p>Ret: {ipc.retentionDeduction.toLocaleString()}</p>
                      <p>Adv: {ipc.advancePaymentRecovery.toLocaleString()}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-gold-accent">{ipc.netCertified.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="text-xs">{ipc.dueDate || 'TBC'}</p>
                      {ipc.actualPaymentDate && ipc.dueDate && new Date(ipc.actualPaymentDate) > new Date(ipc.dueDate) && (
                        <p className="text-[10px] text-red-400 font-bold">OVERDUE</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={ipc.status}
                      onChange={e => handleUpdateIPC(ipc.id, 'status', e.target.value)}
                      className="bg-navy-deep border border-navy-border rounded-lg px-2 py-1 text-xs outline-none"
                    >
                      <option>Draft</option>
                      <option>Certified</option>
                      <option>Paid</option>
                      <option>Disputed</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => onDraftLetter?.({
                        subject: `Interim Payment Certificate No. ${ipc.ipcNo}`,
                        background: `We refer to the Contractor's Statement for IPC No. ${ipc.ipcNo} dated ${ipc.statementDate} for the period ending ${ipc.periodEnding}.`,
                        instructions: `The Engineer has certified the amount of ${setup?.currency} ${ipc.certifiedAmount.toLocaleString()} for this period. After deductions for retention and advance payment recovery, the net amount certified is ${setup?.currency} ${ipc.netCertified.toLocaleString()}.`
                      })}
                      className="p-2 hover:bg-gold-accent/10 rounded-lg text-gold-accent transition-all"
                    >
                      <Mail className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ClaimsRegisterTab({ setup, claims, onUpdate, onAdd, onDraftLetter }: {
  setup: CAProjectSetup | null,
  claims: ClaimEntry[],
  onUpdate: (claims: ClaimEntry[]) => void,
  onAdd: () => void,
  onDraftLetter?: (data: Partial<LetterFormData>) => void
}) {
  const handleUpdateClaim = (id: string, field: keyof ClaimEntry, value: any) => {
    onUpdate(claims.map(c => {
      if (c.id === id) {
        return { ...c, [field]: value };
      }
      return c;
    }));
  };

  const totals = useMemo(() => {
    return {
      claimedEOT: claims.reduce((s, c) => s + c.contractorEOT, 0),
      grantedEOT: claims.reduce((s, c) => s + c.eotGranted, 0),
      claimedCost: claims.reduce((s, c) => s + c.contractorCost, 0),
      certifiedCost: claims.reduce((s, c) => s + c.costCertified, 0),
    };
  }, [claims]);

  return (
    <div className="space-y-6">
      <div className="bg-navy-card border border-navy-border rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-navy-border flex items-center justify-between">
          <h4 className="font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-gold-accent" />
            Claims Register
          </h4>
          <button 
            onClick={onAdd}
            className="px-4 py-2 bg-gold-accent text-navy-deep rounded-lg text-xs font-bold hover:bg-gold-accent/90 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Claim
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-navy-deep text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <tr>
                <th className="px-6 py-4">Ref No.</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Notice Date</th>
                <th className="px-6 py-4">Claimed (EOT/Cost)</th>
                <th className="px-6 py-4">Granted (EOT/Cost)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-border">
              {claims.map(claim => {
                const isNoticeCompliant = claim.eventDate && claim.noticeDate && 
                  (new Date(claim.noticeDate).getTime() - new Date(claim.eventDate).getTime()) / (1000 * 60 * 60 * 24) <= 28;

                return (
                  <tr key={claim.id} className="hover:bg-navy-deep/50 transition-colors">
                    <td className="px-6 py-4 font-bold">{claim.refNo}</td>
                    <td className="px-6 py-4 text-xs">{claim.type}</td>
                    <td className="px-6 py-4">
                      <input 
                        type="text" 
                        value={claim.subject}
                        onChange={e => handleUpdateClaim(claim.id, 'subject', e.target.value)}
                        className="bg-transparent border-none outline-none focus:ring-0 text-gray-300 w-full"
                        placeholder="Claim subject..."
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <input 
                          type="date" 
                          value={claim.noticeDate}
                          onChange={e => handleUpdateClaim(claim.id, 'noticeDate', e.target.value)}
                          className="bg-transparent border-none outline-none focus:ring-0 text-xs text-gray-400"
                        />
                        {claim.noticeDate && !isNoticeCompliant && (
                          <p className="text-[10px] text-red-400 font-bold">NON-COMPLIANT</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="space-y-1">
                        <p>{claim.contractorEOT} Days</p>
                        <p>{setup?.currency} {claim.contractorCost.toLocaleString()}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-gold-accent">
                      <div className="space-y-1">
                        <p>{claim.eotGranted} Days</p>
                        <p>{setup?.currency} {claim.costCertified.toLocaleString()}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={claim.status}
                        onChange={e => handleUpdateClaim(claim.id, 'status', e.target.value)}
                        className="bg-navy-deep border border-navy-border rounded-lg px-2 py-1 text-xs outline-none"
                      >
                        <option>Received</option>
                        <option>Under Review</option>
                        <option>Determination Issued</option>
                        <option>Agreed</option>
                        <option>Disputed — DAB</option>
                        <option>Resolved</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => onDraftLetter?.({
                          subject: `Determination of Claim ${claim.refNo}: ${claim.subject}`,
                          background: `We refer to the Contractor's notice of claim dated ${claim.noticeDate} and full particulars submitted on ${claim.particularsDate}.`,
                          instructions: `Pursuant to Sub-Clause 3.5 [Determinations], the Engineer has assessed the claim and determined that an Extension of Time of ${claim.eotGranted} days and additional cost of ${setup?.currency} ${claim.costCertified.toLocaleString()} is fair and reasonable.`
                        })}
                        className="p-2 hover:bg-gold-accent/10 rounded-lg text-gold-accent transition-all"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-6 bg-navy-deep/50 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Total EOT Claimed</p>
            <p className="text-xl font-bold">{totals.claimedEOT} Days</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Total EOT Granted</p>
            <p className="text-xl font-bold text-gold-accent">{totals.grantedEOT} Days</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Total Cost Claimed</p>
            <p className="text-xl font-bold">{setup?.currency} {totals.claimedCost.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Total Cost Certified</p>
            <p className="text-xl font-bold text-green-400">{setup?.currency} {totals.certifiedCost.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CorrespondenceRegisterTab({ correspondence, onUpdate, onAdd, onDraftLetter }: {
  correspondence: CorrespondenceEntry[],
  onUpdate: (corr: CorrespondenceEntry[]) => void,
  onAdd: () => void,
  onDraftLetter?: (data: Partial<LetterFormData>) => void
}) {
  const [filter, setFilter] = useState({ direction: 'All', status: 'All', overdue: false });

  const filtered = useMemo(() => {
    return correspondence.filter(c => {
      if (filter.direction !== 'All' && c.direction !== filter.direction) return false;
      if (filter.status !== 'All' && c.status !== filter.status) return false;
      if (filter.overdue) {
        if (!c.responseRequired || c.responseDate) return false;
        if (!c.deadline || new Date(c.deadline) > new Date()) return false;
      }
      return true;
    });
  }, [correspondence, filter]);

  const handleUpdate = (id: string, field: keyof CorrespondenceEntry, value: any) => {
    onUpdate(correspondence.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 bg-navy-card border border-navy-border p-4 rounded-xl">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Filter className="w-4 h-4" />
          Filters:
        </div>
        <select 
          value={filter.direction}
          onChange={e => setFilter(f => ({ ...f, direction: e.target.value }))}
          className="bg-navy-deep border border-navy-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-gold-accent"
        >
          <option>All Directions</option>
          <option>Engineer → Contractor</option>
          <option>Contractor → Engineer</option>
          <option>Engineer → Employer</option>
          <option>Employer → Engineer</option>
        </select>
        <select 
          value={filter.status}
          onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          className="bg-navy-deep border border-navy-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-gold-accent"
        >
          <option>All Statuses</option>
          <option>Sent</option>
          <option>Awaiting Response</option>
          <option>Response Received</option>
          <option>Closed</option>
        </select>
        <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
          <input 
            type="checkbox" 
            checked={filter.overdue}
            onChange={e => setFilter(f => ({ ...f, overdue: e.target.checked }))}
            className="w-4 h-4 rounded border-navy-border bg-navy-deep text-gold-accent focus:ring-0"
          />
          Show Overdue Only
        </label>
      </div>

      <div className="bg-navy-card border border-navy-border rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-navy-border flex items-center justify-between">
          <h4 className="font-bold flex items-center gap-2">
            <Mail className="w-5 h-5 text-gold-accent" />
            Correspondence Register
          </h4>
          <button 
            onClick={onAdd}
            className="px-4 py-2 bg-gold-accent text-navy-deep rounded-lg text-xs font-bold hover:bg-gold-accent/90 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Letter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-navy-deep text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <tr>
                <th className="px-6 py-4">Ref No.</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Direction</th>
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Deadline</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-border">
              {filtered.map(corr => {
                const isOverdue = corr.responseRequired && !corr.responseDate && corr.deadline && new Date(corr.deadline) < new Date();
                const isUrgent = corr.responseRequired && !corr.responseDate && corr.deadline && 
                  (new Date(corr.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 7;

                return (
                  <tr key={corr.id} className="hover:bg-navy-deep/50 transition-colors">
                    <td className="px-6 py-4 font-bold">{corr.refNo || 'TBC'}</td>
                    <td className="px-6 py-4 text-xs text-gray-400">{corr.date}</td>
                    <td className="px-6 py-4 text-[10px] font-bold">{corr.direction}</td>
                    <td className="px-6 py-4">
                      <input 
                        type="text" 
                        value={corr.subject}
                        onChange={e => handleUpdate(corr.id, 'subject', e.target.value)}
                        className="bg-transparent border-none outline-none focus:ring-0 text-gray-300 w-full"
                        placeholder="Subject..."
                      />
                    </td>
                    <td className="px-6 py-4">
                      {corr.responseRequired ? (
                        <div className="space-y-1">
                          <input 
                            type="date" 
                            value={corr.deadline}
                            onChange={e => handleUpdate(corr.id, 'deadline', e.target.value)}
                            className={`bg-transparent border-none outline-none focus:ring-0 text-xs font-bold ${
                              isOverdue ? 'text-red-400' : isUrgent ? 'text-amber-400' : 'text-gray-400'
                            }`}
                          />
                          {isOverdue && <p className="text-[10px] text-red-400 font-bold">OVERDUE</p>}
                        </div>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={corr.status}
                        onChange={e => handleUpdate(corr.id, 'status', e.target.value)}
                        className="bg-navy-deep border border-navy-border rounded-lg px-2 py-1 text-xs outline-none"
                      >
                        <option>Sent</option>
                        <option>Awaiting Response</option>
                        <option>Response Received</option>
                        <option>Closed</option>
                        <option>Escalated</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => onDraftLetter?.({
                          subject: `RE: ${corr.subject} (${corr.refNo})`,
                          priorRefs: corr.refNo,
                          background: `We refer to your letter ref. ${corr.refNo} dated ${corr.date} regarding ${corr.subject}.`
                        })}
                        className="p-2 hover:bg-gold-accent/10 rounded-lg text-gold-accent transition-all"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DeadlinesAlertsTab({ data, onUpdateMilestones, onAddMilestone, onGenerateReport, isGeneratingReport }: {
  data: CATrackerProject | null,
  onUpdateMilestones: (milestones: ProjectMilestone[]) => void,
  onAddMilestone: () => void,
  onGenerateReport: () => void,
  isGeneratingReport: boolean
}) {
  const alerts = useMemo(() => {
    const overdue: any[] = [];
    const urgent: any[] = [];
    const upcoming: any[] = [];

    if (!data) return { overdue, urgent, upcoming };

    const now = new Date();
    const next14 = new Date();
    next14.setDate(now.getDate() + 14);
    const next30 = new Date();
    next30.setDate(now.getDate() + 30);

    // Check Correspondence
    data.correspondence.forEach(c => {
      if (c.responseRequired && !c.responseDate && c.deadline) {
        const d = new Date(c.deadline);
        const item = { type: 'Correspondence', desc: c.subject, date: c.deadline };
        if (d < now) overdue.push(item);
        else if (d <= next14) urgent.push(item);
        else if (d <= next30) upcoming.push(item);
      }
    });

    // Check IPCs
    data.ipcs.forEach(i => {
      if (i.status !== 'Paid' && i.dueDate) {
        const d = new Date(i.dueDate);
        const item = { type: 'IPC Payment', desc: `IPC No. ${i.ipcNo}`, date: i.dueDate };
        if (d < now) overdue.push(item);
        else if (d <= next14) urgent.push(item);
        else if (d <= next30) upcoming.push(item);
      }
    });

    return { overdue, urgent, upcoming };
  }, [data]);

  return (
    <div className="space-y-8">
      {/* Milestone Tracker */}
      <div className="bg-navy-card border border-navy-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h4 className="font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gold-accent" />
              Project Milestones
            </h4>
            <button
              onClick={onGenerateReport}
              disabled={isGeneratingReport || !data}
              className="flex items-center gap-2 px-4 py-1.5 bg-gold-accent text-navy-deep rounded-lg text-xs font-bold hover:bg-gold-accent/90 transition-all disabled:opacity-50"
            >
              {isGeneratingReport ? (
                <>
                  <div className="w-3 h-3 border-2 border-navy-deep border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  Generate Monthly CA Report
                </>
              )}
            </button>
          </div>
          <button 
            onClick={onAddMilestone}
            className="px-4 py-2 bg-navy-deep border border-navy-border rounded-lg text-xs font-bold hover:border-gold-accent transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Milestone
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.milestones.map(m => (
            <div key={m.id} className="p-4 bg-navy-deep border border-navy-border rounded-xl flex items-center justify-between group">
              <div>
                <p className="text-xs font-bold text-gray-300 mb-1">{m.title}</p>
                <div className="flex items-center gap-3">
                  <input 
                    type="date" 
                    value={m.plannedDate}
                    onChange={e => onUpdateMilestones(data.milestones.map(ms => ms.id === m.id ? { ...ms, plannedDate: e.target.value } : ms))}
                    className="bg-transparent border-none outline-none text-[10px] text-gray-500 p-0"
                  />
                  {m.actualDate ? (
                    <div className="flex items-center gap-1 text-[10px] text-green-400 font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      {m.actualDate}
                    </div>
                  ) : (
                    <input 
                      type="date" 
                      value={m.actualDate}
                      onChange={e => onUpdateMilestones(data.milestones.map(ms => ms.id === m.id ? { ...ms, actualDate: e.target.value, status: e.target.value ? 'Achieved' : 'Pending' } : ms))}
                      className="bg-transparent border-none outline-none text-[10px] text-gold-accent/50 p-0"
                    />
                  )}
                </div>
              </div>
              <div className={`w-2 h-2 rounded-full ${
                m.status === 'Achieved' ? 'bg-green-400' : m.status === 'Delayed' ? 'bg-red-400' : 'bg-gray-600'
              }`} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Overdue */}
        <div className="space-y-4">
          <h5 className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-widest text-xs">
            <AlertTriangle className="w-4 h-4" />
            Overdue
            <span className="ml-auto bg-red-400/10 px-2 py-0.5 rounded text-[10px]">{alerts.overdue.length}</span>
          </h5>
          <div className="space-y-3">
            {alerts.overdue.map((a, i) => (
              <div key={i} className="p-4 bg-navy-card border-l-4 border-red-400 rounded-xl shadow-lg flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-red-400 uppercase mb-1">{a.type}</p>
                  <p className="text-sm font-bold text-gray-200 mb-1">{a.desc}</p>
                  <p className="text-xs text-gray-500">Was due: {a.date}</p>
                </div>
                <button className="p-2 hover:bg-red-400/10 rounded-lg text-red-400 transition-all">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            ))}
            {alerts.overdue.length === 0 && (
              <div className="p-8 text-center bg-navy-card/30 border border-dashed border-navy-border rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-green-400/20 mx-auto mb-2" />
                <p className="text-xs text-gray-500">No overdue items</p>
              </div>
            )}
          </div>
        </div>

        {/* Due Next 14 Days */}
        <div className="space-y-4">
          <h5 className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-widest text-xs">
            <Clock className="w-4 h-4" />
            Due in Next 14 Days
            <span className="ml-auto bg-amber-400/10 px-2 py-0.5 rounded text-[10px]">{alerts.urgent.length}</span>
          </h5>
          <div className="space-y-3">
            {alerts.urgent.map((a, i) => (
              <div key={i} className="p-4 bg-navy-card border-l-4 border-amber-400 rounded-xl shadow-lg flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-amber-400 uppercase mb-1">{a.type}</p>
                  <p className="text-sm font-bold text-gray-200 mb-1">{a.desc}</p>
                  <p className="text-xs text-gray-500">Due: {a.date}</p>
                </div>
                <button className="p-2 hover:bg-amber-400/10 rounded-lg text-amber-400 transition-all">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            ))}
            {alerts.urgent.length === 0 && (
              <div className="p-8 text-center bg-navy-card/30 border border-dashed border-navy-border rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-green-400/20 mx-auto mb-2" />
                <p className="text-xs text-gray-500">No urgent items</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming */}
        <div className="space-y-4">
          <h5 className="flex items-center gap-2 text-blue-400 font-bold uppercase tracking-widest text-xs">
            <Calendar className="w-4 h-4" />
            Upcoming (15-30 Days)
            <span className="ml-auto bg-blue-400/10 px-2 py-0.5 rounded text-[10px]">{alerts.upcoming.length}</span>
          </h5>
          <div className="space-y-3">
            {alerts.upcoming.map((a, i) => (
              <div key={i} className="p-4 bg-navy-card border-l-4 border-blue-400 rounded-xl shadow-lg flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">{a.type}</p>
                  <p className="text-sm font-bold text-gray-200 mb-1">{a.desc}</p>
                  <p className="text-xs text-gray-500">Due: {a.date}</p>
                </div>
                <button className="p-2 hover:bg-blue-400/10 rounded-lg text-blue-400 transition-all">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            ))}
            {alerts.upcoming.length === 0 && (
              <div className="p-8 text-center bg-navy-card/30 border border-dashed border-navy-border rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-green-400/20 mx-auto mb-2" />
                <p className="text-xs text-gray-500">No upcoming items</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
