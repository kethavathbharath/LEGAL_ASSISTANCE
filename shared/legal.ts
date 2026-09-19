export type Clause = {
  type: string;
  explanation: string;
  text: string;
  location: string;
  whyItMatters: string;
  severity: "high" | "medium" | "low";
};

export type Obligation = {
  text: string;
  owner: string;
  timing: string;
  source: string;
  completed: boolean;
};

export type AnalysisResult = {
  overview: string;
  purpose: string;
  parties: string[];
  obligations: Obligation[];
  dates: string[];
  financialTerms: string[];
  termination: string;
  restrictions: string[];
  clauses: Clause[];
  attentionAreas: string[];
  lawyerQuestions: string[];
  confidence: "high" | "medium" | "low";
};

export type DocumentRecord = {
  id: string;
  name: string;
  type: string;
  size: number;
  pages: number;
  textPreview: string;
  wordCount: number;
  analysis: AnalysisResult;
  createdAt: number;
};

export type QAResult = {
  answer: string;
  relevantSection: string;
  whyItMatters: string;
  whatToReviewNext: string;
  grounded: boolean;
};

export type ComparisonChange = {
  category: string;
  title: string;
  documentA: string;
  documentB: string;
  impact: "high" | "medium" | "low";
};

export type ComparisonResult = {
  summary: string;
  changes: ComparisonChange[];
  unchanged: string[];
  overallRisk: "high" | "medium" | "low";
};
