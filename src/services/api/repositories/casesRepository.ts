import { get, post, put, del } from "../client";
import type { CasesRepository, ListCasesRequest, GetCaseDetailResponse, ListCasesResponse, CreateCaseRequest, CreateCaseResponse, UpdateCaseRequest, UpdateCaseResponse, InferCaseFieldsResponse } from "../types/cases";

export function createApiCasesRepository(): CasesRepository {
  return {
    async listCases(req: ListCasesRequest): Promise<ListCasesResponse> {
      return get<ListCasesResponse>("/cases", { params: req });
    },
    async getCaseDetail(caseId: string): Promise<GetCaseDetailResponse> {
      return get<GetCaseDetailResponse>(`/cases/${caseId}`);
    },
    async getSuspiciousClues(caseId: string) {
      return get(`/cases/${caseId}/suspicious`);
    },
    async createCase(req: CreateCaseRequest): Promise<CreateCaseResponse> {
      return post<CreateCaseResponse>("/cases", req);
    },
    async updateCase(caseId: string, req: UpdateCaseRequest): Promise<UpdateCaseResponse> {
      return put<UpdateCaseResponse>(`/cases/${caseId}`, req);
    },
    async inferFields(caseId: string): Promise<InferCaseFieldsResponse> {
      return post<InferCaseFieldsResponse>(`/cases/${caseId}/infer-fields`);
    },
    async deleteCase(caseId: string) {
      return del<null>(`/cases/${caseId}`);
    },
    async getCaseSuspicious(caseId: string) {
      return get(`/cases/${caseId}/suspicious`);
    },
    async getClueDetail(clueId: string) {
      return get(`/clues/${clueId}`);
    },
  };
}
