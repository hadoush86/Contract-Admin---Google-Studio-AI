export type ModuleId = 'dashboard' | 'draft-letter' | 'evaluate-tender' | 'review-contract' | 'variation-order' | 'benchmark-rates';

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

export const MODULES: Module[] = [
  {
    id: 'draft-letter',
    title: 'Draft Letter',
    description: 'Generate professional contractual correspondence based on FIDIC standards.',
    icon: 'Mail',
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
];
