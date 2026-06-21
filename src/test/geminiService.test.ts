import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted above variable declarations, so mockGenerateContent must
// be created with vi.hoisted() to ensure it is defined when the mock factory runs.
const mockGenerateContent = vi.hoisted(() => vi.fn());

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent };
  },
}));

import {
  generateContractualLetter,
  evaluateTenderAI,
  reviewContractAI,
  generateVODocumentAI,
  getBenchmarkRatesAI,
  refineLetterAI,
  generateBoQAI,
  calculateTakeOffAI,
  bespokeContractReviewAI,
  preAwardReviewAI,
} from '../services/geminiService';

import { LetterFormData, ContractReviewData, VOData, BenchmarkQueryData, BoQBuilderData, TakeOffData, BespokeReviewData, PreAwardReviewData, Bidder, BoQItem } from '../types';

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockSuccess(text: string) {
  mockGenerateContent.mockResolvedValue({ text });
}

function mockFailure(message: string) {
  mockGenerateContent.mockRejectedValue(new Error(message));
}

// ─── generateContractualLetter ────────────────────────────────────────────────

describe('generateContractualLetter', () => {
  const letterData: LetterFormData = {
    letterType: 'Extension of Time',
    fidicBook: 'Red Book 1999',
    jurisdiction: 'UAE',
    projectName: 'Test Project',
    contractNumber: 'CT-001',
    letterRef: 'LR-001',
    date: '2025-01-01',
    contractorRep: 'J. Smith',
    contractorCompany: 'Acme Contracting',
    subject: 'EOT Request',
    background: 'Background text',
    instructions: 'Grant 28 days',
    timeBarRequired: true,
    priorRefs: '',
  };

  it('returns the text from the AI response', async () => {
    mockSuccess('Generated letter content');
    const result = await generateContractualLetter(letterData);
    expect(result).toBe('Generated letter content');
  });

  it('throws a user-friendly error when the AI call fails', async () => {
    mockFailure('Network timeout');
    await expect(generateContractualLetter(letterData)).rejects.toThrow(
      'Failed to connect to AI service. Please check your API key.'
    );
  });

  it('falls back to a default string when response text is empty', async () => {
    mockGenerateContent.mockResolvedValue({ text: '' });
    const result = await generateContractualLetter(letterData);
    expect(result).toBe('Failed to generate letter content.');
  });

  it('includes key letter fields in the prompt sent to the API', async () => {
    mockSuccess('ok');
    await generateContractualLetter(letterData);
    const callArgs = mockGenerateContent.mock.calls[0][0];
    const prompt: string = callArgs.contents;
    expect(prompt).toContain('Test Project');
    expect(prompt).toContain('CT-001');
    expect(prompt).toContain('Extension of Time');
    expect(prompt).toContain('UAE');
  });

  it('uses otherLetterType in the prompt when letterType is "Other"', async () => {
    mockSuccess('ok');
    await generateContractualLetter({ ...letterData, letterType: 'Other', otherLetterType: 'Custom Letter Type' });
    const prompt: string = mockGenerateContent.mock.calls[0][0].contents;
    expect(prompt).toContain('Custom Letter Type');
  });
});

// ─── evaluateTenderAI ─────────────────────────────────────────────────────────

describe('evaluateTenderAI', () => {
  const bidders: Bidder[] = [{ id: '1', name: 'Bidder A' }, { id: '2', name: 'Bidder B' }];
  const items: BoQItem[] = [
    { id: 'i1', ref: '1.01', description: 'Mobilisation', unit: 'LS', quantity: 1, rates: { '1': 50000, '2': 55000 } },
  ];

  it('returns AI evaluation text on success', async () => {
    mockSuccess('Evaluation result');
    const result = await evaluateTenderAI('Project X', 'AED', 'CESMM4', bidders, items);
    expect(result).toBe('Evaluation result');
  });

  it('throws a user-friendly error on API failure', async () => {
    mockFailure('API error');
    await expect(evaluateTenderAI('Project X', 'AED', 'CESMM4', bidders, items)).rejects.toThrow(
      'Failed to generate AI evaluation.'
    );
  });

  it('includes bidder names and item descriptions in the prompt', async () => {
    mockSuccess('ok');
    await evaluateTenderAI('Project X', 'AED', 'CESMM4', bidders, items);
    const prompt: string = mockGenerateContent.mock.calls[0][0].contents;
    expect(prompt).toContain('Bidder A');
    expect(prompt).toContain('Bidder B');
    expect(prompt).toContain('Mobilisation');
  });
});

// ─── reviewContractAI ─────────────────────────────────────────────────────────

describe('reviewContractAI', () => {
  const reviewData: ContractReviewData = {
    formType: 'FIDIC Red Book 1999',
    onBehalfOf: 'Contractor',
    location: 'UAE',
    clauses: 'Sub-Clause 14.3 payment terms...',
    concerns: ['Payment Terms', 'Delay Damages'],
  };

  it('returns AI review text on success', async () => {
    mockSuccess('RAG review table');
    expect(await reviewContractAI(reviewData)).toBe('RAG review table');
  });

  it('throws a user-friendly error on API failure', async () => {
    mockFailure('timeout');
    await expect(reviewContractAI(reviewData)).rejects.toThrow('Failed to generate AI contract review.');
  });

  it('includes concerns and location in the prompt', async () => {
    mockSuccess('ok');
    await reviewContractAI(reviewData);
    const prompt: string = mockGenerateContent.mock.calls[0][0].contents;
    expect(prompt).toContain('Payment Terms');
    expect(prompt).toContain('UAE');
  });
});

// ─── generateVODocumentAI ────────────────────────────────────────────────────

describe('generateVODocumentAI', () => {
  const voData: VOData = {
    voRef: 'VO-001',
    voType: 'Addition',
    fidicBook: 'Red Book',
    projectDetails: 'Test project',
    description: 'Additional piling works',
    reason: 'Client instruction',
    estimatedValue: 250000,
    currency: 'AED',
    eotImpact: 'No adjustment',
    actionRequired: 'Issue VO Directly',
    jurisdiction: 'UAE',
  };

  it('returns VO document text on success', async () => {
    mockSuccess('VO document text');
    expect(await generateVODocumentAI(voData)).toBe('VO document text');
  });

  it('throws a user-friendly error on API failure', async () => {
    mockFailure('error');
    await expect(generateVODocumentAI(voData)).rejects.toThrow('Failed to generate AI VO document.');
  });
});

// ─── getBenchmarkRatesAI ──────────────────────────────────────────────────────

describe('getBenchmarkRatesAI', () => {
  const benchmarkData: BenchmarkQueryData = {
    workElement: 'Rock Armour',
    location: 'Dubai, UAE',
    yearFrom: 2020,
    yearTo: 2024,
    currency: 'AED',
  };

  it('returns benchmark rate text on success', async () => {
    mockSuccess('Rate range: 300-450 AED/t');
    expect(await getBenchmarkRatesAI(benchmarkData)).toBe('Rate range: 300-450 AED/t');
  });

  it('throws a user-friendly error on API failure', async () => {
    mockFailure('error');
    await expect(getBenchmarkRatesAI(benchmarkData)).rejects.toThrow('Failed to fetch AI benchmark rates.');
  });

  it('includes work element and location in the prompt', async () => {
    mockSuccess('ok');
    await getBenchmarkRatesAI(benchmarkData);
    const prompt: string = mockGenerateContent.mock.calls[0][0].contents;
    expect(prompt).toContain('Rock Armour');
    expect(prompt).toContain('Dubai, UAE');
  });
});

// ─── refineLetterAI ───────────────────────────────────────────────────────────

describe('refineLetterAI', () => {
  it('returns refined letter text on success', async () => {
    mockSuccess('Refined letter');
    expect(await refineLetterAI('Original letter', 'Make it more formal')).toBe('Refined letter');
  });

  it('throws a user-friendly error on API failure', async () => {
    mockFailure('error');
    await expect(refineLetterAI('Original', 'Instructions')).rejects.toThrow('Failed to refine AI letter.');
  });

  it('includes original letter and instructions in the prompt', async () => {
    mockSuccess('ok');
    await refineLetterAI('Dear Sir, ...', 'Add reference to Sub-Clause 8.4');
    const prompt: string = mockGenerateContent.mock.calls[0][0].contents;
    expect(prompt).toContain('Dear Sir, ...');
    expect(prompt).toContain('Add reference to Sub-Clause 8.4');
  });
});

// ─── generateBoQAI ───────────────────────────────────────────────────────────

describe('generateBoQAI', () => {
  const boqData: BoQBuilderData = {
    projectName: 'Marina Development',
    location: 'Abu Dhabi, UAE',
    measurementStandard: 'CESMM4',
    contractType: 'FIDIC Red Book',
    currency: 'AED',
    vatApplicable: '5%',
    scopeOfWorks: ['Dredging', 'Rock Armour'],
    includePreambles: true,
    includePreliminaries: true,
    includeProvisionalSums: false,
    provisionalSumDescription: '',
    includePCSums: false,
    pcSumDescription: '',
    includeDayworkSchedule: false,
    includeSummaryPage: true,
    scopeInput: '1000m3 dredging to -5m CD',
  };

  it('returns BoQ text on success', async () => {
    mockSuccess('| Item | Desc | Qty |');
    expect(await generateBoQAI(boqData, 'STRUCTURE')).toBe('| Item | Desc | Qty |');
  });

  it('throws a user-friendly error on API failure', async () => {
    mockFailure('error');
    await expect(generateBoQAI(boqData, 'FULL')).rejects.toThrow('Failed to generate AI BoQ.');
  });

  it('includes the generation mode in the prompt', async () => {
    mockSuccess('ok');
    await generateBoQAI(boqData, 'PREAMBLES');
    const prompt: string = mockGenerateContent.mock.calls[0][0].contents;
    expect(prompt).toContain('PREAMBLES');
  });
});

// ─── calculateTakeOffAI ───────────────────────────────────────────────────────

describe('calculateTakeOffAI', () => {
  const takeOffData: TakeOffData = {
    workElement: 'Dredging',
    measurementStandard: 'CESMM4',
    purpose: 'Engineer\'s Estimate',
    outputFormat: 'Dimension Sheet',
    inputMode: 'PASTE',
    pastedDimensions: 'L=500m, W=20m, D=3m',
    drawingRef: '',
    scale: '',
    datum: '',
    materialType: 'Soft material',
    swellFactorInSitu: 1.1,
    swellFactorPlaced: 1.0,
  };

  it('returns take-off calculation text on success', async () => {
    mockSuccess('Volume = 30,000 m3');
    expect(await calculateTakeOffAI(takeOffData)).toBe('Volume = 30,000 m3');
  });

  it('throws a user-friendly error on API failure', async () => {
    mockFailure('error');
    await expect(calculateTakeOffAI(takeOffData)).rejects.toThrow('Failed to calculate AI quantities.');
  });

  it('includes pasted dimensions in the prompt', async () => {
    mockSuccess('ok');
    await calculateTakeOffAI(takeOffData);
    const prompt: string = mockGenerateContent.mock.calls[0][0].contents;
    expect(prompt).toContain('L=500m, W=20m, D=3m');
  });
});
