export type CaseStatus = "待核查" | "核查中" | "已移送";

export type CaseTag = "价格异常" | "主观明知" | "跨省销售" | "多案关联";

export type CaseFilter = {
  case_no?: string;
  suspect_name?: string;
  brand?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  limit?: number;
  offset?: number;
};

export type TradeRecord = {
  date: string;
  product: string;
  buyer: string;
  amount: number;
};

export type CaseSummary = {
  id: number;
  case_no: string;
  suspect_name: string;
  brand: string;
  amount: number;
  created_at: string;
  trades?: TradeRecord[];
};

export type EvidenceAnchor = {
  evidenceId: string;
  word?: string;
  lineHint?: string;
};

export type CaseDetail = CaseSummary & {
  chatRawText: string;
  chatEvidenceAnchors: EvidenceAnchor[];
};

export type SuspiciousClue = {
  id: number;
  case_id: number;
  clue_type: string;          // "主观明知" | "价格异常" | "角色异常"
  evidence_text: string;
  hit_keywords: string[] | string;
  score: number;
  crime_type: string | null;
  severity_level: string;     // "刑事犯罪" | "民事侵权" | "行政违法"
};