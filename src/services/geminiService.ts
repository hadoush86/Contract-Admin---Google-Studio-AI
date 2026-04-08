import { GoogleGenAI } from "@google/genai";
import { LetterFormData, Bidder, BoQItem, ContractReviewData, VOData, BenchmarkQueryData } from "../types";

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
