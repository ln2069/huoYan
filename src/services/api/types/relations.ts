import type { ApiResult } from "@/entities/common";
import type { CrossCaseGraph, UpstreamGraph } from "@/entities/graph";

export type { CrossCaseGraph, UpstreamGraph };

export interface GetCrossCaseRequest {
  q?: string;
}

export interface GetUpstreamRequest {
  caseId: string;
}

export type GetCrossCaseResponse = ApiResult<CrossCaseGraph>;
export type GetUpstreamResponse = ApiResult<UpstreamGraph>;

export interface RelationsRepository {
  getCrossCaseGraph(req?: GetCrossCaseRequest): Promise<GetCrossCaseResponse>;
  getUpstreamGraph(req: GetUpstreamRequest): Promise<GetUpstreamResponse>;
  getFundFlows(req?: any): Promise<any>;
  getPersonLedger(req?: any): Promise<any>;
  getRecidivism(personName: string): Promise<any>;
  getUpstreamList(caseId: string | number): Promise<any>;
  getDownstreamList(caseId: string | number): Promise<any>;
  getCoreSuspectsList(caseId: string | number): Promise<any>;
}
