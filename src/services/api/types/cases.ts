import type { ApiResult, PagedResult } from "@/entities/common";
import type { CaseDetail, CaseFilter, CaseSummary, TradeRecord } from "@/entities/case";

export type { CaseDetail, CaseFilter, CaseSummary, TradeRecord };

export interface ListCasesRequest {
  case_no?: string;
  suspect_name?: string;
  brand?: string;
  limit?: number;
  offset?: number;
}

export interface CreateCaseRequest {
  case_no: string;
}

export interface UpdateCaseRequest {}

export type ListCasesResponse = ApiResult<PagedResult<CaseSummary>>;
export type GetCaseDetailResponse = ApiResult<CaseDetail>;
export type CreateCaseResponse = ApiResult<CaseSummary>;
export type UpdateCaseResponse = ApiResult<CaseSummary>;
export type InferCaseFieldsResponse = ApiResult<CaseSummary>;

export interface CasesRepository {
  listCases(req: ListCasesRequest): Promise<ListCasesResponse>;
  getCaseDetail(caseId: string): Promise<GetCaseDetailResponse>;
  getSuspiciousClues(caseId: string): Promise<any>;
  createCase(req: CreateCaseRequest): Promise<CreateCaseResponse>;
  updateCase(caseId: string, req: UpdateCaseRequest): Promise<UpdateCaseResponse>;
  inferFields(caseId: string): Promise<InferCaseFieldsResponse>;
  deleteCase(caseId: string): Promise<any>;
  getCaseSuspicious(caseId: string): Promise<any>;
  getClueDetail(clueId: string): Promise<any>;
}
