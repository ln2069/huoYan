import type { EvidenceRepository, EvidenceUploadType } from "@/services/api/types/evidence";
import { post } from "@/services/api/client";
import { httpClient } from "@/services/api/client";

function mapUploadPath(evidenceType: EvidenceUploadType): string {
  if (evidenceType === "chat") return "/upload/communications";
  return "/upload/communications"; // Default to chat
}

export function createApiEvidenceRepository(): EvidenceRepository {
  return {
    async analyzeChat(req) {
      return post("/evidence/analyze-chat", req);
    },
    async analyzeEvidence(req) {
      return post("/analyze/evidence", req);
    },
    async uploadFile(req) {
      const formData = new FormData();
      formData.append("file", req.file);
      const requestParams: Record<string, string> = {};
      if (req.caseId !== undefined && req.caseId !== null && String(req.caseId).trim() !== "") {
        const caseId = String(req.caseId);
        formData.append("case_id", caseId);
        requestParams.case_id = caseId;
      }
      if (req.caseNo) {
        formData.append("case_no", req.caseNo);
        requestParams.case_no = req.caseNo;
      }
      const res = await httpClient.post<any>(mapUploadPath(req.evidenceType), formData, {
        headers: { "Content-Type": "multipart/form-data" },
        params: requestParams,
      });
      return res.data;
    },
    async importEvidence(req) {
      return post("/evidence/import", req);
    },
  };
}
