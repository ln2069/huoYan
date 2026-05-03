import type { EvidenceRepository, EvidenceUploadType } from "@/services/api/types/evidence";
import { post } from "@/services/api/client";
import { httpClient } from "@/services/api/client";

/**
 * 将前端 evidenceType 映射到后端上传路径。
 * 统一端点 /upload/data 会自动识别文件类型，无需传 type 参数。
 * 旧端点保留向后兼容。
 */
function mapUploadPath(evidenceType: EvidenceUploadType): string {
  // 使用统一端点，后端自动通过表头识别数据类型
  return "/upload/data";
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
    async downloadTemplate(url: string) {
      const response = await httpClient.get(url, { responseType: 'blob' });
      return response;
    }
  };
}
