import type { ApiResult } from "@/entities/common";
import type { EvidenceAnalysisResult } from "@/entities/evidence";

export type { EvidenceAnalysisResult };

export interface AnalyzeChatRequest {
  caseId?: string;
  rawText: string;
}

export type AnalyzeChatResponse = ApiResult<EvidenceAnalysisResult>;

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
  format_detected?: string;
  extracted_transactions?: number;
  /** 后端自动识别的数据类型 (统一上传端点 /upload/data 返回) */
  data_type?: "transactions" | "communications" | "logistics";
}

export interface ImportEvidenceRequest {
  evidenceType: "chat";
  caseId?: string;
  rawText: string;
  analysisData: AnalyzeChatResponse["data"];
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
  analyzeEvidence(req: { evidence_text: string, evidence_type: string, case_id?: string | number }): Promise<any>;
  uploadFile(req: UploadFileRequest): Promise<UploadFileResponse>;
  importEvidence(req: ImportEvidenceRequest): Promise<ImportEvidenceResponseResult>;
  downloadTemplate(url: string): Promise<any>;
}
