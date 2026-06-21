export type ModuleId = 'dashboard' | 'draft-letter' | 'evaluate-tender' | 'produce-boq' | 'take-off' | 'review-contract' | 'bespoke-review' | 'pre-award-review' | 'ca-tracker' | 'variation-order' | 'benchmark-rates';

export interface Module {
  id: ModuleId;
  title: string;
  description: string;
  icon: string;
}

export interface LetterFormData {
  letterType: string;
  otherLetterType?: string;
  fidicBook: 'Red Book 1999' | 'Yellow Book 1999' | 'Both';
  jurisdiction: 'UAE' | 'KSA';
  projectName: string;
  contractNumber: string;
  letterRef: string;
  date: string;
  contractorRep: string;
  contractorCompany: string;
  subject: string;
  background: string;
  instructions: string;
  timeBarRequired: boolean;
  priorRefs: string;
}

export interface BoQItem {
  id: string;
  ref: string;
  description: string;
  unit: string;
  quantity: number;
  rates: Record<string, number>; // bidderId -> rate
  statedAmounts?: Record<string, number>; // bidderId -> bidder's own stated total (from spreadsheet import)
}

export interface Bidder {
  id: string;
  name: string;
}

export interface ArithmeticCheckResult {
  bidderId: string;
  bidderName: string;
  statedSum: number;
  calculatedSum: number;
  variance: number;
  errors: number;
}

export interface RateComparisonResult {
  itemId: string;
  itemRef: string;
  description: string;
  averageRate: number;
  bidderRates: Record<string, {
    rate: number;
    deviation: number; // percentage
    status: 'NORMAL' | 'AMBER' | 'RED';
  }>;
}

export interface ContractReviewData {
  formType: string;
  onBehalfOf: 'Employer' | 'Contractor' | 'Engineer';
  location: 'UAE' | 'KSA' | 'Other GCC';
  clauses: string;
  concerns: string[];
}

export interface BespokeReviewData {
  contractForm: string;
  projectName: string;
  location: string;
  onBehalfOf: 'Employer' | 'Contractor' | 'Engineer' | 'Neutral / Mediator';
  contractValue?: string;
  isExecuted: 'Pre-execution (negotiation stage)' | 'Already executed (post-award review)';
  specificConcerns?: string;
  clauses: string;
  baseVersion: string;
  reviewScope: string[];
}

export interface VOData {
  voRef: string;
  voType: string;
  fidicBook: 'Red Book' | 'Yellow Book';
  projectDetails: string;
  description: string;
  reason: string;
  estimatedValue: number;
  currency: string;
  eotImpact: 'No adjustment' | 'Adjustment required' | 'To be assessed';
  eotDays?: number;
  actionRequired: 'Request for Quotation' | 'Issue VO Directly';
  jurisdiction: 'UAE' | 'KSA';
}

export interface VORegisterEntry {
  id: string;
  voNo: string;
  date: string;
  description: string;
  subClause: string;
  originalSum: number;
  voValue: number;
  eotGranted: number;
  status: 'Draft' | 'Issued' | 'Under Negotiation' | 'Agreed' | 'Rejected';
}

export interface BenchmarkQueryData {
  workElement: string;
  location: string;
  yearFrom: number;
  yearTo: number;
  currency: string;
}

export interface BenchmarkEntry {
  id: string;
  dataType: 'Tender Evaluation' | 'Awarded Contract';
  projectName: string;
  client: string;
  location: string;
  date: string;
  contractType: string;
  measurementStandard: string;
  contractConditions: string;
  currency: string;
  items: BenchmarkWorkItem[];
}

export interface BenchmarkWorkItem {
  id: string;
  tag: string;
  unit: string;
  quantity: number;
  lowestRate: number;
  highestRate: number;
  averageRate: number;
  awardedRate: number;
}

export interface BoQBuilderData {
  projectName: string;
  location: string;
  measurementStandard: string;
  contractType: string;
  currency: string;
  vatApplicable: string;
  scopeOfWorks: string[];
  includePreambles: boolean;
  includePreliminaries: boolean;
  includeProvisionalSums: boolean;
  provisionalSumDescription: string;
  includePCSums: boolean;
  pcSumDescription: string;
  includeDayworkSchedule: boolean;
  includeSummaryPage: boolean;
  scopeInput: string;
}

export interface BoQLibraryItem {
  id: string;
  code: string;
  description: string;
  unit: string;
  coverageNotes: string;
  reference: string;
  category: string;
}

export interface TakeOffData {
  workElement: string;
  measurementStandard: string;
  purpose: string;
  outputFormat: string;
  inputMode: 'PASTE' | 'UPLOAD';
  pastedDimensions: string;
  drawingRef: string;
  scale: string;
  datum: string;
  materialType: string;
  swellFactorInSitu: number;
  swellFactorPlaced: number;
}

export interface DimensionSheetEntry {
  id: string;
  workElement: string;
  date: string;
  quantity: string;
  content: string;
}

export interface PreAwardReviewData {
  projectName: string;
  employer: string;
  contractor: string;
  contractValue: string;
  location: string;
  fidicBook: string;
  executionDate: string;
  perspective: 'Employer' | 'Contractor' | 'Engineer/Consultant';
  documents: Record<string, { available: boolean; content: string }>;
  reviewScope: string[];
}

export interface CAProjectSetup {
  projectName: string;
  contractNumber: string;
  fidicBook: 'Red Book 1999' | 'Yellow Book 1999';
  jurisdiction: 'UAE' | 'KSA';
  employer: string;
  contractor: string;
  engineer: string;
  originalContractSum: number;
  currency: 'AED' | 'SAR' | 'USD';
  commencementDate: string;
  originalTimeForCompletion: number;
  timeUnit: 'calendar days' | 'working days';
  dnpPeriod: number;
  dnpUnit: 'months' | 'days';
  retentionPercentage: number;
  retentionCap: number;
  advancePaymentAmount: number;
  advancePaymentThreshold: number;
  performanceBondPercentage: number;
  performanceBondExpiry: string;
  delayDamagesRate: number;
  maxDelayDamagesCap: number;
}

export interface IPCEntry {
  id: string;
  ipcNo: number;
  periodEnding: string;
  statementDate: string;
  claimedAmount: number;
  certifiedAmount: number;
  retentionDeduction: number;
  advancePaymentRecovery: number;
  delayDamages: number;
  otherDeductions: number;
  otherDeductionsDesc: string;
  netCertified: number;
  issuedDate: string;
  dueDate: string;
  actualPaymentDate: string;
  status: 'Draft' | 'Certified' | 'Paid' | 'Disputed';
}

export interface ClaimEntry {
  id: string;
  refNo: string;
  type: 'EOT' | 'Additional Payment' | 'EOT + Additional Payment' | 'Employer Counterclaim';
  subject: string;
  eventDate: string;
  noticeDate: string;
  particularsDate: string;
  contractorEOT: number;
  contractorCost: number;
  engineerEOT: number;
  engineerCost: number;
  determinationDate: string;
  determinationRef: string;
  eotGranted: number;
  costCertified: number;
  status: 'Received' | 'Under Review' | 'Determination Issued' | 'Agreed' | 'Disputed — DAB' | 'Resolved';
  notes: string;
}

export interface CorrespondenceEntry {
  id: string;
  refNo: string;
  date: string;
  direction: 'Engineer → Contractor' | 'Contractor → Engineer' | 'Engineer → Employer' | 'Employer → Engineer';
  type: string;
  subject: string;
  subClauses: string;
  responseRequired: boolean;
  deadline: string;
  responseDate: string;
  responseRef: string;
  status: 'Sent' | 'Awaiting Response' | 'Response Received' | 'Closed' | 'Escalated';
}

export interface ProjectMilestone {
  id: string;
  title: string;
  plannedDate: string;
  actualDate: string;
  status: 'Pending' | 'Achieved' | 'Delayed';
}

export interface CATrackerProject {
  id: string;
  projectSetup: CAProjectSetup | null;
  ipcs: IPCEntry[];
  claims: ClaimEntry[];
  correspondence: CorrespondenceEntry[];
  milestones: ProjectMilestone[];
}

export interface CATrackerState {
  projects: CATrackerProject[];
  activeProjectId: string | null;
}

export interface GlobalProject {
  projectName: string;
  contractNumber: string;
  fidicBook: string;
  jurisdiction: string;
  employer?: string;
  contractor?: string;
  currency?: string;
}

export const FIDIC_CLAUSES: Record<string, { title: string; description: string }> = {
  '1.1': { title: 'Definitions', description: 'Defines key terms used throughout the contract.' },
  '2.1': { title: 'Right of Access to the Site', description: 'The Employer shall give the Contractor right of access to, and possession of, all parts of the Site within the time (or times) stated in the Appendix to Tender.' },
  '3.1': { title: 'Engineer\'s Duties and Authority', description: 'The Employer shall appoint the Engineer who shall carry out the duties assigned to him in the Contract.' },
  '4.2': { title: 'Performance Security', description: 'The Contractor shall obtain (at his cost) a Performance Security for proper performance, in the amount and currencies stated in the Appendix to Tender.' },
  '4.4': { title: 'Subcontractors', description: 'The Contractor shall not subcontract the whole of the Works.' },
  '8.1': { title: 'Commencement of Works', description: 'The Engineer shall give the Contractor not less than 7 days\' notice of the Commencement Date.' },
  '8.4': { title: 'Extension of Time for Completion', description: 'The Contractor shall be entitled subject to Sub-Clause 20.1 [Contractor\'s Claims] to an extension of the Time for Completion.' },
  '8.7': { title: 'Delay Damages', description: 'If the Contractor fails to comply with Sub-Clause 8.2 [Time for Completion], the Contractor shall subject to Sub-Clause 2.5 [Employer\'s Claims] pay delay damages to the Employer.' },
  '13.1': { title: 'Right to Vary', description: 'Variations may be initiated by the Engineer at any time prior to issuing the Taking-Over Certificate for the Works.' },
  '13.3': { title: 'Variation Procedure', description: 'If the Engineer requests a proposal, prior to instructing a Variation, the Contractor shall respond in writing as soon as practicable.' },
  '14.2': { title: 'Advance Payment', description: 'The Employer shall make an advance payment, as an interest-free loan for mobilisation, when the Contractor submits a guarantee.' },
  '14.3': { title: 'Application for Interim Payment Certificates', description: 'The Contractor shall submit a Statement in six copies to the Engineer after the end of each month.' },
  '20.1': { title: 'Contractor\'s Claims', description: 'If the Contractor considers himself to be entitled to any extension of the Time for Completion and/or any additional payment, the Contractor shall give notice to the Engineer, describing the event or circumstance giving rise to the claim.' }
};

export const MODULES: Module[] = [
  {
    id: 'draft-letter',
    title: 'Draft Letter',
    description: 'Generate professional contractual correspondence based on FIDIC standards.',
    icon: 'Mail',
  },
  {
    id: 'produce-boq',
    title: 'Produce BoQ',
    description: 'Generate structured Bills of Quantities for marine and civil works.',
    icon: 'FileText',
  },
  {
    id: 'take-off',
    title: 'Quantities Take-Off',
    description: 'Perform detailed quantities take-off and dimension sheet production.',
    icon: 'Ruler',
  },
  {
    id: 'evaluate-tender',
    title: 'Evaluate Tender',
    description: 'Analyze and compare tender submissions for marine and civil works.',
    icon: 'BarChart3',
  },
  {
    id: 'review-contract',
    title: 'Review Contract',
    description: 'Review contract clauses and identify risks in FIDIC-based agreements.',
    icon: 'ShieldCheck',
  },
  {
    id: 'bespoke-review',
    title: 'Bespoke Review',
    description: 'In-depth review of non-standard, employer-drafted, or heavily modified contracts.',
    icon: 'AlertTriangle',
  },
  {
    id: 'pre-award-review',
    title: 'Pre-Award Review',
    description: 'Complete review of the full contract documents package before execution.',
    icon: 'ClipboardCheck',
  },
  {
    id: 'variation-order',
    title: 'Variation Order',
    description: 'Process and track variations, claims, and new rate approvals.',
    icon: 'FileEdit',
  },
  {
    id: 'benchmark-rates',
    title: 'Benchmark Rates',
    description: 'Access regional benchmark rates for marine and infrastructure materials.',
    icon: 'Database',
  },
  {
    id: 'ca-tracker',
    title: 'CA Tracker',
    description: 'Live contract administration tracker for construction supervision phase.',
    icon: 'GanttChart',
  },
];
