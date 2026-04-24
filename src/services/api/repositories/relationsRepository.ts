import { get } from "../client";
import type { RelationsRepository, GetCrossCaseRequest, GetUpstreamRequest } from "../types/relations";

export function createApiRelationsRepository(): RelationsRepository {
  return {
    async getCrossCaseGraph(req?: GetCrossCaseRequest) {
      return get("/relations/cross-case", { params: req });
    },
    async getUpstreamGraph(req: GetUpstreamRequest) {
      return get(`/relations/chain/${req.caseId}`);
    },
    async getFundFlows(req?: any) {
      return get("/ledger/transactions", { params: req });
    },
    async getPersonLedger(req?: any) {
      return get("/ledger/persons", { params: req });
    },
    async getRecidivism(personName: string) {
      return get(`/relations/recidivism/${personName}`);
    },
    async getUpstreamList(caseId: string | number) {
      return get(`/relations/upstream/${caseId}`);
    },
    async getDownstreamList(caseId: string | number) {
      return get(`/relations/downstream/${caseId}`);
    },
    async getCoreSuspectsList(caseId: string | number) {
      return get(`/relations/core-suspects/${caseId}`);
    },
  };
}
