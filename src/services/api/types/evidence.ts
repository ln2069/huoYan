import type { ApiResult } from "@/entities/common";
import type { EvidenceAnalysisResult } from "@/entities/evidence";

export type { EvidenceAnalysisResult };

export interface AnalyzeChatRequest {
  caseId?: string;
  rawText: string;
}

export interface AnalyzeTransferRequest {
  records: Array<{
    payer: string;
    payee: string;
    amount: number;
    time: string;
    channel: string;
    caseId?: string;
  }>;
}

export interface AnalyzeLogisticsRequest {
  records: Array<{
    expressNo: string;
    sender: string;
    receiver: string;
    time: string;
    channel?: string;
    caseId?: string;
  }>;
}

export interface AnalyzeTransferResponse {
  totalAmount: number;
  transactionCount: number;
  personCount: number;
  topCounterparties: Array<{ name: string; amount: number; percent: number }>;
  records: AnalyzeTransferRequest["records"];
}

export interface AnalyzeLogisticsResponse {
  totalShipments: number;
  expressCount: number;
  personCount: number;
  suspiciousShipments: Array<{
    expressNo: string;
    sender: string;
    receiver: string;
    time: string;
    channel: string;
    reason: string;
  }>;
  records: AnalyzeLogisticsRequest["records"];
}

export type AnalyzeChatResponse = ApiResult<EvidenceAnalysisResult>;
export type AnalyzeTransferResponseResult = ApiResult<AnalyzeTransferResponse>;
export type AnalyzeLogisticsResponseResult = ApiResult<AnalyzeLogisticsResponse>;

export type EvidenceUploadType = "chat" | "transfer" | "logistics";

export interface UploadFileRequest {
  file: File;
  evidenceType: EvidenceUploadType;
  caseId?: string | number;
  caseNo?: string;
}

export interface UploadFileResponse {
  success: boolean;
  message: string;
  case_id: number;
  case_no: string;
  case_amount?: number;
  case_suspect_name?: string;
  case_brand?: string;
  total_records: number;
  saved_records: number;
  rawText?: string;
  fileName?: string;
  recordCount?: number;
}

export interface ImportEvidenceRequest {
  evidenceType: "chat" | "transfer" | "logistics";
  caseId?: string;
  rawText: string;
  analysisData: AnalyzeChatResponse["data"] | AnalyzeTransferResponse | AnalyzeLogisticsResponse;
}

export interface ImportEvidenceResponse {
  evidenceId: string;
  caseId: string;
  importedCount: number;
  message: string;
}

export type UploadFileResponseResult = ApiResult<UploadFileResponse>;
export type ImportEvidenceResponseResult = ApiResult<ImportEvidenceResponse>;

export interface EvidenceRepository {
  analyzeChat(req: AnalyzeChatRequest): Promise<AnalyzeChatResponse>;
  analyzeTransfer(req: AnalyzeTransferRequest): Promise<AnalyzeTransferResponseResult>;
  analyzeLogistics(req: AnalyzeLogisticsRequest): Promise<AnalyzeLogisticsResponseResult>;
  analyzeEvidence(req: { evidence_text: string, evidence_type: string, case_id?: string | number }): Promise<any>;
  uploadFile(req: UploadFileRequest): Promise<UploadFileResponse>;
  importEvidence(req: ImportEvidenceRequest): Promise<ImportEvidenceResponseResult>;
}
