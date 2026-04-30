import { defineStore } from "pinia";
import { repositories } from "@/services";
import type { EvidenceAnalysisResult } from "@/entities/evidence";
import type {
  ImportEvidenceResponse,
  EvidenceUploadType,
} from "@/services/api/types/evidence";

export type EvidenceStatus = "idle" | "scanning" | "success" | "error";
export type UploadStatus = "idle" | "uploading" | "success" | "error";
export type ImportStatus = "idle" | "importing" | "success" | "error";

type EvidenceState = {
  status: EvidenceStatus;
  rawText: string;
  result: EvidenceAnalysisResult | null;
  error: string | null;
  caseId: string | null;
  upload: {
    status: UploadStatus;
    progress: number;
    fileName: string | null;
    rawText: string | null;
    error: string | null;
  };
  import: {
    status: ImportStatus;
    result: ImportEvidenceResponse | null;
    error: string | null;
  };
};

export const useEvidenceStore = defineStore("evidence", {
  state: (): EvidenceState => ({
    status: "idle",
    rawText: "",
    result: null,
    error: null,
    caseId: null,
    upload: {
      status: "idle",
      progress: 0,
      fileName: null,
      rawText: null,
      error: null,
    },
    import: {
      status: "idle",
      result: null,
      error: null,
    },
  }),
  actions: {
    setCaseId(caseId: string | null) {
      this.caseId = caseId;
    },
    loadExample(example: string) {
      this.rawText = example;
      this.status = "idle";
      this.result = null;
      this.error = null;
    },
    async analyze() {
      if (!this.rawText.trim()) {
        this.status = "error";
        this.error = "请输入或粘贴聊天记录后再分析。";
        return;
      }

      this.status = "scanning";
      this.error = null;
      this.result = null;

      try {
        const res = await repositories.evidence.analyzeChat({
          caseId: this.caseId ?? undefined,
          rawText: this.rawText,
        });
        if (res.code !== 0) throw new Error(res.message);
        this.result = res.data!;
        this.status = "success";
      } catch (e) {
        this.status = "error";
        this.error = e instanceof Error ? e.message : "unknown_error";
      }
    },
    async uploadFile(file: File, evidenceType: EvidenceUploadType) {
      const allowedTypes = ["text/csv", "text/plain", "application/vnd.ms-excel"];
      const allowedExts = [".csv", ".txt"];
      const ext = "." + file.name.split(".").pop()!.toLowerCase();

      if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
        this.upload.status = "error";
        this.upload.error = `不支持的文件类型：${file.type || ext}，仅支持 CSV、TXT 格式文件`;
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        this.upload.status = "error";
        this.upload.error = "文件大小超过 10MB 限制，请拆分文件后重试";
        return;
      }

      this.upload.status = "uploading";
      this.upload.progress = 10;
      this.upload.error = null;
      this.upload.fileName = file.name;

      try {
        this.upload.progress = 30;
        const res = await repositories.evidence.uploadFile({
          file,
          evidenceType,
          caseId: this.caseId ?? undefined,
        });
        this.upload.progress = 80;

        const isSuccess =
          (typeof (res as any)?.success === "boolean" && (res as any).success) ||
          ((res as any)?.code === 0);
        if (!isSuccess) {
          throw new Error((res as any)?.message || "文件上传失败，请重试");
        }

        this.upload.rawText = (res as any)?.data?.rawText ?? (res as any)?.rawText ?? null;
        this.upload.progress = 100;
        this.upload.status = "success";
      } catch (e) {
        this.upload.status = "error";
        this.upload.error = e instanceof Error ? e.message : "文件上传失败，请检查网络后重试";
      }
    },
    async importEvidence(evidenceType: "chat") {
      this.import.status = "importing";
      this.import.error = null;
      this.import.result = null;

      try {
        let rawText = "";
        let analysisData: EvidenceState["result"] | undefined = undefined;

        if (evidenceType === "chat") {
          rawText = this.rawText;
          analysisData = this.result ?? undefined;
        }

        if (!rawText.trim()) {
          throw new Error("请先导入文件或粘贴数据后再提交");
        }

        const res = await repositories.evidence.importEvidence({
          evidenceType,
          caseId: this.caseId ?? undefined,
          rawText,
          analysisData,
        });

        if (res.code !== 0) {
          throw new Error(res.message || "导入失败，请重试");
        }

        this.import.result = res.data!;
        this.import.status = "success";
      } catch (e) {
        this.import.status = "error";
        this.import.error = e instanceof Error ? e.message : "导入失败，请稍后重试";
      }
    },
    reset() {
      this.status = "idle";
      this.result = null;
      this.error = null;
    },
    resetUpload() {
      this.upload.status = "idle";
      this.progress = 0;
      this.upload.fileName = null;
      this.upload.rawText = null;
      this.upload.error = null;
    },
    resetImport() {
      this.import.status = "idle";
      this.import.result = null;
      this.import.error = null;
    },
  },
});
