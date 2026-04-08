import { GoogleGenAI } from "@google/genai";
import { LetterFormData, Bidder, BoQItem, ContractReviewData, BespokeReviewData, VOData, BenchmarkQueryData, BoQBuilderData, TakeOffData, PreAwardReviewData, CATrackerProject } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateContractualLetter(data: LetterFormData): Promise<string> {
  const systemInstruction = `You are a Senior Contract Administrator acting as the Engineer under FIDIC Red Book (1999) or Yellow Book (1999) for construction projects in the UAE or KSA. Draft a formal contractual letter using the inputs provided. Always cite the correct Sub-Clause(s) for the letter type. Use the style: open with reference to context, use 'To begin with,...' for first substantive point, cite Sub-Clauses as 'Sub-Clause X.X [Title]', close with 'Yours faithfully,' and 'Kind regards,'. If time bar required, add a bold notice: 'NOTE: Pursuant to Sub-Clause 20.1, the Contractor must submit notice of any claim within 28 days.' Format as a proper business letter with all header fields filled from the form inputs.`;

  const prompt = `
    Letter Setup:
    - Letter Type: ${data.letterType === 'Other' ? data.otherLetterType : data.letterType}
    - FIDIC Book: ${data.fidicBook}
    - Jurisdiction: ${data.jurisdiction}

    Project Details:
    - Project Name: ${data.projectName}
    - Contract Number: ${data.contractNumber}
    - Letter Reference: ${data.letterRef}
    - Date: ${data.date}
    - Contractor's Representative: ${data.contractorRep}
    - Contractor Company: ${data.contractorCompany}

    Content:
    - Subject: ${data.subject}
    - Background: ${data.background}
    - Instructions/Determinations: ${data.instructions}
    - Time Bar Required: ${data.timeBarRequired ? 'Yes' : 'No'}
    - Prior Correspondence: ${data.priorRefs || 'None'}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text || "Failed to generate letter content.";
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Failed to connect to AI service. Please check your API key.");
  }
}

export async function evaluateTenderAI(
  projectName: string,
  currency: string,
  standard: string,
  bidders: Bidder[],
  items: BoQItem[]
): Promise<string> {
  const systemInstruction = `You are a Senior QS evaluating a tender BoQ for marine/civil infrastructure works in the UAE or KSA. Perform arithmetic verification (Rate × Qty = Amount), detect spike rates (AMBER >15%, RED >30% deviation from average), identify unbalanced pricing, and produce a ranked commercial evaluation. Currency is ${currency}. Measurement standard is ${standard}. Present results in clearly labelled tables. Conclude with a recommendation of the preferred bidder based on commercial merit.`;

  const prompt = `
    Project: ${projectName}
    Currency: ${currency}
    Standard: ${standard}

    Bidders:
    ${bidders.map(b => `- ${b.name} (ID: ${b.id})`).join('\n')}

    BoQ Items and Rates:
    ${items.map(item => `
      Item ${item.ref}: ${item.description}
      Qty: ${item.quantity} ${item.unit}
      Rates: ${bidders.map(b => `${b.name}: ${item.rates[b.id] || 0}`).join(', ')}
    `).join('\n')}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2, // Lower temperature for more analytical output
      },
    });

    return response.text || "Failed to generate evaluation summary.";
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Failed to generate AI evaluation.");
  }
}

export async function reviewContractAI(data: ContractReviewData): Promise<string> {
  const systemInstruction = `You are a Senior Contracts Specialist reviewing a construction contract for marine and infrastructure works in the UAE or KSA. Review the uploaded or pasted contract text across all 12 risk areas: Payment Terms, Time Bar & Notice Obligations, Variation Mechanism, Risk Allocation & Liability, Delay Damages & EOT, Termination, Dispute Resolution, Defects & DLP, Insurance, Performance Security, IP & Design Ownership, Compliance & HSSE. Assign RAG status (RED = serious risk, AMBER = moderate concern, GREEN = acceptable) to each area. Cite specific sub-clause references. Flag any deviations from FIDIC 1999 market-standard positions in the GCC. Produce a markdown table with columns: Area | Sub-Clause(s) | RAG | Issue | Recommendation. Follow with a 3-paragraph Executive Summary of top risks.`;

  const prompt = `
    Contract Form Type: ${data.formType}
    Reviewed on behalf of: ${data.onBehalfOf}
    Project Location: ${data.location}
    Specific Areas of Concern: ${data.concerns.join(', ')}

    Contract Text / Key Clauses:
    ${data.clauses}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3,
      },
    });

    return response.text || "Failed to generate contract review.";
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Failed to generate AI contract review.");
  }
}

export async function generateVODocumentAI(data: VOData): Promise<string> {
  const systemInstruction = `You are acting as the Engineer under FIDIC ${data.fidicBook} 1999 for a project in ${data.jurisdiction}. Draft a formal ${data.actionRequired === 'Request for Quotation' ? 'RFQ letter under Sub-Clause 13.3' : 'Variation Order instruction under Sub-Clause 13.1'} for the variation described. Use formal correspondence format. Cite all applicable Sub-Clauses. Include: description of variation, contractual basis, valuation method or agreed value, EOT effect, instructions to Contractor. Close with Engineer's signature block.`;

  const prompt = `
    VO Reference: ${data.voRef}
    VO Type: ${data.voType}
    Project Details: ${data.projectDetails}
    Description: ${data.description}
    Reason: ${data.reason}
    Estimated Value: ${data.estimatedValue} ${data.currency}
    EOT Impact: ${data.eotImpact} ${data.eotImpact === 'Adjustment required' ? `(${data.eotDays} days)` : ''}
    Action: ${data.actionRequired}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3,
      },
    });

    return response.text || "Failed to generate VO document.";
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Failed to generate AI VO document.");
  }
}

export async function getBenchmarkRatesAI(data: BenchmarkQueryData): Promise<string> {
  const systemInstruction = `You are a Senior QS with a benchmarking database of UAE and KSA marine infrastructure projects (2015–2024). For the requested work element and location, provide: the indicative rate range (min–max), a typical market rate for the Engineer's Estimate, and commentary on factors that affect pricing (material source, haul distance, market conditions, contractor availability, project scale). Rates in ${data.currency}. Note that rates are indicative and should be verified against current market conditions. Use Markdown for formatting.`;

  const prompt = `
    Work Element: ${data.workElement}
    Location: ${data.location}
    Year Range: ${data.yearFrom} to ${data.yearTo}
    Currency: ${data.currency}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2,
      },
    });

    return response.text || "Failed to fetch benchmark rates.";
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Failed to fetch AI benchmark rates.");
  }
}

export async function refineLetterAI(originalLetter: string, instructions: string): Promise<string> {
  const systemInstruction = `You are a Senior Contracts Specialist. You are refining an existing contractual letter based on specific user instructions. Maintain the formal tone and FIDIC standards. Return ONLY the refined letter text.`;

  const prompt = `
    Original Letter:
    ${originalLetter}

    Refinement Instructions:
    ${instructions}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3,
      },
    });

    return response.text || "Failed to refine letter.";
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Failed to refine AI letter.");
  }
}

export async function generateBoQAI(data: BoQBuilderData, mode: 'STRUCTURE' | 'FULL' | 'PREAMBLES' | 'PRELIMINARIES' | 'DESCRIPTIONS'): Promise<string> {
  const systemInstruction = `You are a Senior Quantity Surveyor producing a Bill of Quantities for marine and civil infrastructure works in the UAE or KSA. Measurement standard: ${data.measurementStandard}. Contract type: ${data.contractType}. Currency: ${data.currency}. Scope: ${data.scopeOfWorks.join(', ')}.

Produce the BoQ following these rules:
- CESMM4: items coded with Class letter + three-digit number (e.g. E321); descriptions built from Feature 1 + Feature 2 + Feature 3 per Section 4 of CESMM4
- POMI: sequential numbering; descriptions follow POMI measurement rules
- All items measured NET in place unless stated otherwise
- Provisional quantities flagged with (P) in the quantity column
- Preambles must state the measurement standard, definitions of net/provisional/PS/PC, pricing instructions, and coverage rules for key items
- Preliminaries must include all Class A items: contractual requirements (bonds, insurances), method-related charges fixed (mobilisation, establishment), method-related charges time-related (supervision, site management, vessels), and Employer's requirements (as-builts, O&M manuals, reporting)
- If drawings or dimensions are provided, extract quantities. If not, leave quantity column as 'ITEM' or 'TBC'
- Flag UAE VAT at 5% or KSA VAT at 15% in the summary sheet where applicable
- Output each bill as a formatted markdown table. After all bills, produce the Summary of Bills with sub-totals and Grand Total (Tender Total)`;

  const prompt = `
    Project Setup:
    - Project Name: ${data.projectName}
    - Location: ${data.location}
    - Measurement Standard: ${data.measurementStandard}
    - Contract Type: ${data.contractType}
    - Currency: ${data.currency}
    - VAT: ${data.vatApplicable}

    Scope of Works:
    ${data.scopeOfWorks.join(', ')}

    Bill Structure Options:
    - Preambles: ${data.includePreambles ? 'Yes' : 'No'}
    - Preliminaries: ${data.includePreliminaries ? 'Yes' : 'No'}
    - Provisional Sums: ${data.includeProvisionalSums ? `Yes (${data.provisionalSumDescription})` : 'No'}
    - PC Sums: ${data.includePCSums ? `Yes (${data.pcSumDescription})` : 'No'}
    - Daywork Schedule: ${data.includeDayworkSchedule ? 'Yes' : 'No'}
    - Summary Page: ${data.includeSummaryPage ? 'Yes' : 'No'}

    Scope Input / Dimensions:
    ${data.scopeInput}

    Generation Mode: ${mode}
    ${mode === 'STRUCTURE' ? 'Produce ONLY the BoQ framework and bill-by-bill structure for confirmation.' : ''}
    ${mode === 'FULL' ? 'Produce the full BoQ including preambles, preliminaries, and all work bills.' : ''}
    ${mode === 'PREAMBLES' ? 'Produce ONLY the Preambles section.' : ''}
    ${mode === 'PRELIMINARIES' ? 'Produce ONLY the Preliminaries section.' : ''}
    ${mode === 'DESCRIPTIONS' ? 'Produce ONLY the item description framework with no quantities.' : ''}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3,
      },
    });

    return response.text || "Failed to generate BoQ.";
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Failed to generate AI BoQ.");
  }
}

export async function calculateTakeOffAI(data: TakeOffData): Promise<string> {
  const systemInstruction = `You are a Senior Quantity Surveyor performing quantities take-off for ${data.workElement} to ${data.measurementStandard} for ${data.purpose}.

Calculation methods:
- Dredging (grid method): Volume = Length × Width × Depth (use average depth across grid where levels vary); apply over-dredge allowance; apply swell factor to convert in-situ to barge measure
- Dredging (cross-section method): Volume = Sum of (Cross-sectional Area × Distance between sections); apply prismoidal correction if significant taper
- Concrete: Decompose into rectangular elements; calculate gross volume; deduct voids, openings, pile intrusions (each stated); net in-situ m³ per CESMM4 Rule G1
- Formwork: Contact area only; measure to inside face of permanent structure; no deductions for openings < 0.5 m²; no additions for bolt holes or tie holes
- Rock armour: Tonnage = Volume (m³) × In-place density (t/m³); state density used; cross-check by: Count × Nominal mass per unit
- Sheet piling: Plan length (m) × Pile depth below cut-off (m) = m²; add cut-off length separately
- Piling: Count × Length per pile = total linear metres; also count nr items (pile caps, test piles, etc.)
- Geotextile: Measure slope area (not plan area); include all seams but note no deduction for overlaps (overlaps included in waste)
- Bar bending schedule: List each bar mark, diameter, number, shape code, length; calculate total mass per diameter then total mass

Present output as a structured dimension sheet with: dimensions column, squaring column, description column, and a summary abstract at the bottom.
Show ALL working — the output must be auditable.
State datum, drawing reference, and measurement standard on every sheet.
Flag any provisional quantities with (P).
Flag any assumptions made where dimensions were not stated.`;

  const prompt = `
    Take-Off Setup:
    - Work Element: ${data.workElement}
    - Measurement Standard: ${data.measurementStandard}
    - Purpose: ${data.purpose}
    - Output Format: ${data.outputFormat}

    Dimensions Input:
    ${data.inputMode === 'PASTE' ? `Pasted Dimensions:\n${data.pastedDimensions}` : `Drawing Ref: ${data.drawingRef}\nScale: ${data.scale}\nDatum: ${data.datum}`}

    Swell Factors (if applicable):
    - Material: ${data.materialType}
    - In-situ to Barge: ${data.swellFactorInSitu}
    - Barge to Placed: ${data.swellFactorPlaced}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2,
      },
    });

    return response.text || "Failed to calculate quantities.";
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Failed to calculate AI quantities.");
  }
}

export async function bespokeContractReviewAI(data: BespokeReviewData): Promise<string> {
  const systemInstruction = `You are a Senior Contracts Specialist reviewing a ${data.contractForm} for ${data.projectName} in ${data.location} on behalf of the ${data.onBehalfOf}.

Review all selected areas. For each area:
1. Identify the relevant clause(s)
2. Compare to FIDIC 1999 Red/Yellow Book GCC market-standard position (or NEC4/JCT market standard as applicable)
3. Assign RAG: RED = serious risk requiring immediate action; AMBER = moderate concern requiring negotiation or mitigation; GREEN = acceptable, no action needed
4. State the specific issue concisely
5. State the recommended amendment or redline wording
6. Flag as Deal-Breaker (refuse to proceed without amendment) or Negotiating Position (push for change but can accept if refused)

Key RED flags to always check:
- Payment period exceeding 56 days without justification
- Time bars shorter than 14 days for Contractor claims
- Employer's right to unlimited variations without cap
- Deletion of Sub-Clause 4.12 equivalent (unforeseeable physical conditions)
- On-demand performance bond with no expiry
- Employer's right to terminate for convenience with no compensation
- Dispute resolution by local courts only (no arbitration)
- No Engineer's impartiality obligation
- Pay-when-paid provisions (check if void under UAE law)

For the marine-specific checklist, apply the same RAG methodology to each of these items:
- Survey and hydrographic data ownership and risk
- Over-dredge and tolerance allowances — is the risk allocation clear?
- Unforeseeable seabed conditions (is Sub-Clause 4.12 equivalent present?)
- Environmental and disposal consents — who bears delay/cost?
- Vessel and marine equipment day rate provisions
- Tide, weather, and sea state force majeure definition
- Exclusion zones, traffic separation, and port authority permissions
- Interface with concurrent marine operations

Produce output in five sections as specified: Contract Summary | Executive Summary + Top 5 | RAG Table | Redlines | Risk Register.
Use markdown tables throughout. Label each RED item prominently.`;

  const prompt = `
    Contract Identification:
    - Contract Form: ${data.contractForm}
    - Project Name: ${data.projectName}
    - Project Location: ${data.location}
    - Reviewing on behalf of: ${data.onBehalfOf}
    - Contract Value: ${data.contractValue || 'Not stated'}
    - Execution Status: ${data.isExecuted}
    - Specific Clauses of Concern: ${data.specificConcerns || 'None stated'}
    - Contract Form Base Version: ${data.baseVersion}

    Review Scope:
    ${data.reviewScope.join(', ')}

    Contract Text / Clauses:
    ${data.clauses}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3,
      },
    });

    return response.text || "Failed to generate bespoke contract review.";
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Failed to generate AI bespoke contract review.");
  }
}

export async function preAwardReviewAI(data: PreAwardReviewData): Promise<string> {
  const systemInstruction = `You are a Senior Contracts Specialist performing a pre-award review of the full contract documents package for ${data.projectName} in ${data.location} on behalf of the ${data.perspective}. Contract value: ${data.contractValue}. FIDIC ${data.fidicBook}.

Review all uploaded/pasted documents. Identify:
1. Incomplete contract data — blank fields in the Appendix to Tender that should be filled before execution
2. Conflicts between documents — identify any inconsistency in defined terms, obligations, or data across the document set
3. Unresolved tender qualifications — flag any contractor qualifications that were not formally accepted or rejected
4. Performance security defects — check amount (typically 10%), form (on-demand preferred for Employer), expiry date (must extend to minimum 28 days after Final Payment Certificate), and issuing bank acceptability
5. Insurance gaps — check CAR insurance covers the full Contract Sum; check third-party limit is adequate for marine works; check named parties include Employer and Engineer
6. Programme realism — does the baseline programme reflect the Time for Completion? Are key milestones contractually binding?
7. Extract ALL time bars and notice obligations into a Time Bar Register
8. Extract ALL key contract data values and present in a summary table

Conclude with a clear executive recommendation: READY TO EXECUTE, EXECUTE WITH CONDITIONS (list conditions), or DO NOT EXECUTE (list reasons).
All findings must be cited to the specific clause, document, and page/section reference.

Output structure:
Section 1: Pre-Award Checklist Summary (Table: Document | Status | Issue | Action Required)
Section 2: Contract Data Extract (Table: Parameter | Value Stated | Expected Range | Flag)
Section 3: Document Consistency Check (List of conflicts)
Section 4: Outstanding Pre-Execution Actions (Numbered list ranked by urgency)
Section 5: Time Bar Register (Table: Obligation | Party | Period | Sub-Clause | Calendar or Working Days | Trigger Event)
Section 6: Executive Recommendation (Recommendation + Rationale)`;

  const prompt = `
    Project Details:
    - Project Name: ${data.projectName}
    - Employer: ${data.employer}
    - Contractor: ${data.contractor}
    - Contract Value: ${data.contractValue}
    - Location: ${data.location}
    - FIDIC Book: ${data.fidicBook}
    - Execution Date: ${data.executionDate}
    - Perspective: ${data.perspective}

    Review Scope:
    ${data.reviewScope.join(', ')}

    Documents Provided:
    ${Object.entries(data.documents)
      .filter(([_, doc]) => doc.available && doc.content)
      .map(([name, doc]) => `--- DOCUMENT: ${name} ---\n${doc.content}`)
      .join('\n\n')}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3,
      },
    });

    return response.text || "Failed to generate pre-award review.";
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Failed to generate AI pre-award review.");
  }
}

export async function caAssistantChat(data: CATrackerProject, message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]): Promise<string> {
  const systemInstruction = `You are a Senior Contract Administrator acting as the Engineer under FIDIC ${data.projectSetup?.fidicBook || '1999'} for ${data.projectSetup?.projectName || 'the project'} in ${data.projectSetup?.jurisdiction || 'the region'}. 
  
  You have access to the following live contract data:
  - Project Setup: ${JSON.stringify(data.projectSetup)}
  - IPC Register: ${JSON.stringify(data.ipcs)}
  - Claims Register: ${JSON.stringify(data.claims)}
  - Correspondence Register: ${JSON.stringify(data.correspondence)}
  - Milestones: ${JSON.stringify(data.milestones)}

  Use this data to answer questions accurately. Always cite Sub-Clause references. 
  If asked to draft a letter, produce a formal FIDIC letter using the project data. 
  If asked for a summary, produce a professional, concise report suitable for the Employer.`;

  try {
    // Construct the full prompt with history
    const historyText = history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.parts[0].text}`).join('\n');
    const fullPrompt = `${historyText}\nUser: ${message}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: fullPrompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3,
      },
    });

    return response.text || "I'm sorry, I couldn't process that request.";
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Failed to communicate with CA Assistant.");
  }
}
