export type EvidenceSeverity = "high" | "medium" | "low";

export type EvidenceKeywordPosition = {
  word: string;
  evidenceId: string;
};

export type EvidenceConclusion =
  | {
      id: string;
      type: "price_anomaly";
      severity: EvidenceSeverity;
      title: string;
      evidence: {
        quotedPrice: number;
        unit: string;
        referencePrice: number;
        product: string;
        discountPercent: number;
        rawText: string;
        evidenceIds: string[];
        is_anomaly?: boolean;
        price_ratio?: number;
        suggestion?: string;
        comparison_details?: string;
      };
    }
  | {
      id: string;
      type: "cross_validation";
      severity: EvidenceSeverity;
      title: string;
      evidence: {
        description: string;
        source_a: string;
        source_b: string;
        is_consistent: boolean;
        details?: string;
        matching_records?: any[];
        conflicting_records?: any[];
      };
    }
  | {
      id: string;
      type: "subjective_knowledge";
      severity: EvidenceSeverity;
      title: string;
      evidence: {
        rawQuote: string;
        speaker: string;
        keywords: string[];
        keywordPositions: EvidenceKeywordPosition[];
      };
    }
  | {
      id: string;
      type: "key_entity";
      severity: EvidenceSeverity;
      title: string;
      evidence: {
        entities: Array<{
          name: string;
          role: string;
          phone?: string;
          bankAccount?: string;
        }>;
      };
    };

export type EvidenceAnalysisResult = {
  evidenceCount: number;
  conclusions: EvidenceConclusion[];
};

