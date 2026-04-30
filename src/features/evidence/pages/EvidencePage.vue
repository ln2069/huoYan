<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElButton, ElInput, ElMessage, ElProgress, ElAlert, ElSelect, ElOption, ElLoading, ElDialog } from "element-plus";
import { Cpu, Document, Connection, Download, Upload, Money, Van } from "@element-plus/icons-vue";
import { useEvidenceStore } from "@/shared/stores/evidenceStore";
import { useReportStore } from "@/shared/stores/reportStore";
import { repositories } from "@/services";
import { post, httpClient } from "@/services/api/client";
import { TableFormatError } from "@/services/api/errors";

const route = useRoute();
const router = useRouter();
const store = useEvidenceStore();

const evidenceTab = ref<"general">('general');
const selectedCaseId = ref("");
const evidenceType = ref('general');

// 监听路由变化，自动切换 tab
watch(
  () => route.path,
  (newPath) => {
    if (newPath === "/evidence") {
      evidenceTab.value = "general";
      evidenceType.value = 'general';
    }
  },
  { immediate: true }
);

const caseOptions = ref<any[]>([]);
const showTemplateDialog = ref(false);

type EvidenceTabKey = "general";

type AnalysisState = {
  done: boolean;
  result: any | null;
  error: string | null;
  analyzing: boolean;
};

type UploadState = {
  status: "idle" | "uploading" | "success" | "error";
  progress: number;
  fileName: string | null;
  rawText: string | null;
  error: string | null;
  formatErrorHint: string | null;
  formatDetected: string | null;
  extractedTransactions: number;
};

type TabUiState = {
  analysis: AnalysisState;
  upload: UploadState;
};

function createAnalysisState(): AnalysisState {
  return {
    done: false,
    result: null,
    error: null,
    analyzing: false,
  };
}

const templateHintsMap: Record<string, { label: string; columns: string[] }> = {
  general: {
    label: '证据数据',
    columns: ['联络时间/交易时间', '发起方/付款方', '接收方/收款方', '内容/金额/单号'],
  },
};

function createUploadState(): UploadState {
  return {
    status: "idle",
    progress: 0,
    fileName: null,
    rawText: null,
    error: null,
    formatErrorHint: null,
    formatDetected: null,
    extractedTransactions: 0,
  };
}

const tabUiState = reactive<Record<EvidenceTabKey, TabUiState>>({
  general: {
    analysis: createAnalysisState(),
    upload: createUploadState(),
  },
});

function getTabUiState(tab: EvidenceTabKey) {
  return tabUiState[tab];
}

function resetTabUiState(tab: EvidenceTabKey) {
  Object.assign(tabUiState[tab].analysis, createAnalysisState());
  Object.assign(tabUiState[tab].upload, createUploadState());
}

// 加载案件列表
async function loadCases() {
  try {
    const response = await repositories.cases.listCases({
      limit: 100,
      offset: 0,
    });
    const list = Array.isArray(response) ? response : ((response as any)?.list || (response as any)?.data?.list || []);

    caseOptions.value = list.map((c: any) => ({
      value: String(c.id),
      label: `${c.case_no} - ${c.suspect_name || '未知嫌疑人'}`
    }));

    if (caseOptions.value.length > 0) {
      const exists = caseOptions.value.some((opt) => String(opt.value) === String(selectedCaseId.value));
      if (!selectedCaseId.value || !exists) {
        selectedCaseId.value = String(caseOptions.value[0].value);
      }
    }
  } catch (error) {
    console.error('加载案件列表失败:', error);
  }
}

// 组件挂载时加载案件列表
onMounted(() => {
  loadCases();
});

const sampleChat = `刘某某: 老曹，刚到一批轮毂。
刘某某: 有奥迪A4L那款吗？
曹某某: 有，280一个。
刘某某: 市面上正品要600多。
刘某某: 这批货你别声张，不是原厂的，老规矩。
曹某某: 行，先来50个。
刘某某: 钱打农行卡，户名刘某某，尾号4589。`;

function loadSample() {
  showTemplateDialog.value = true;
}

function clearEvidenceInput() {
  store.rawText = "";
  resetTabUiState("general");
  store.reset();
}

async function downloadTemplate(url: string, filename: string) {
  try {
    const response = await httpClient.get(url, { responseType: 'blob' });
    const blob = new Blob([response.data], { type: response.headers['content-type'] });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('下载模板失败:', error);
    ElMessage.error('下载模板失败，请检查网络或重新登录');
  }
}

const reportStore = useReportStore();

const lastReportUrl = computed(() => {
  const caseId = selectedCaseId.value || (caseOptions.value.length > 0 ? caseOptions.value[0].value : "");
  if (!caseId) return "";
  return reportStore.getReport(caseId)?.url || "";
});

const lastReportName = computed(() => {
  const caseId = selectedCaseId.value || (caseOptions.value.length > 0 ? caseOptions.value[0].value : "");
  if (!caseId) return "";
  return reportStore.getReport(caseId)?.name || "";
});

const currentAnalysisState = computed(() => getTabUiState(evidenceTab.value).analysis);
const currentUploadState = computed(() => getTabUiState(evidenceTab.value).upload);

const analysisDone = computed({
  get: () => currentAnalysisState.value.done,
  set: (val) => currentAnalysisState.value.done = val
});
const analysisResult = computed({
  get: () => currentAnalysisState.value.result,
  set: (val) => currentAnalysisState.value.result = val
});
const analysisError = computed({
  get: () => currentAnalysisState.value.error,
  set: (val) => currentAnalysisState.value.error = val
});
const isAnalyzing = computed({
  get: () => currentAnalysisState.value.analyzing,
  set: (val) => currentAnalysisState.value.analyzing = val
});

const isUploading = computed(() => currentUploadState.value.status === "uploading");
const uploadDone = computed(() => currentUploadState.value.status === "success");
const uploadError = computed(() => currentUploadState.value.status === "error");
const uploadProgress = computed(() => currentUploadState.value.progress);
const uploadedFileName = computed(() => currentUploadState.value.fileName);
const uploadedRawText = computed(() => currentUploadState.value.rawText);
const uploadErrorMessage = computed(() => currentUploadState.value.error);
const uploadFormatHint = computed(() => currentUploadState.value.formatErrorHint);
const uploadFormatDetected = computed(() => currentUploadState.value.formatDetected);
const uploadExtractedTxns = computed(() => currentUploadState.value.extractedTransactions);
const currentTemplateHint = computed(() => templateHintsMap[evidenceTab.value]);

const normalizedKeyActors = computed(() => {
  const result = analysisResult.value as any;
  const directActors = Array.isArray(result?.key_actors) ? result.key_actors : [];
  if (directActors.length > 0) {
    return directActors.map((actor: any) => ({
      name: actor?.name || actor?.person || actor?.id || "未知主体",
      role: actor?.role || actor?.behavior_role || actor?.mentioned_in || "",
      contact: actor?.contact || actor?.phone || "",
      mentionedIn: actor?.mentioned_in || actor?.evidence_type || "",
    }));
  }

  const entities = Array.isArray(result?.key_entities?.entities) ? result.key_entities.entities : [];
  if (entities.length > 0) {
    return entities.map((entity: any) => ({
      name: entity?.name || "未知主体",
      role: entity?.role || "",
      contact: entity?.phone || entity?.bankAccount || "",
      mentionedIn: entity?.mentioned_in || "",
    }));
  }

  const names = Array.isArray(result?.key_entities?.names) ? result.key_entities.names : [];
  const roles = Array.isArray(result?.key_entities?.roles) ? result.key_entities.roles : [];
  const contacts = Array.isArray(result?.key_entities?.contacts) ? result.key_entities.contacts : [];
  const maxLen = Math.max(names.length, roles.length, contacts.length);
  if (maxLen === 0) {
    return [];
  }

  return Array.from({ length: maxLen }, (_, i) => ({
    name: names[i] ? String(names[i]) : "未知主体",
    role: roles[i] ? String(roles[i]) : "",
    contact: contacts[i] ? String(contacts[i]) : "",
    mentionedIn: "",
  }));
});

const txnStats = computed(() => {
  const result = (analysisResult.value as any)?.transaction_analysis || (analysisResult.value as any);
  return {
    totalAmount: result.total_amount || result.totalAmount || 0,
    count: result.transaction_count || result.transactionCount || 0,
    persons: result.person_count || result.personCount || 0,
    topCounterparties: result.top_counterparties || result.topCounterparties || []
  };
});

const logStats = computed(() => {
  const result = (analysisResult.value as any)?.logistics_analysis || (analysisResult.value as any);
  return {
    total: result.total_shipments || result.totalShipments || 0,
    companies: result.express_count || result.expressCount || 0,
    persons: result.person_count || result.personCount || 0,
    suspicious: result.suspicious_shipments || result.suspiciousShipments || []
  };
});

const normalizedTransactions = computed(() => {
  const res = analysisResult.value as any;
  return res?.transaction_analysis?.records || res?.transactions || [];
});

const normalizedLogistics = computed(() => {
  const res = analysisResult.value as any;
  return res?.logistics_analysis?.records || res?.logistics || [];
});

// 智能分析接口调用
async function startAnalysis() {
  isAnalyzing.value = true;
  analysisError.value = null;
  analysisDone.value = false;
  analysisResult.value = null;

  const currentText = store.rawText;

  if (!currentText.trim()) {
    const typeLabel = templateHintsMap[evidenceTab.value].label;
    ElMessage.warning(`请先输入或上传${typeLabel}`);
    isAnalyzing.value = false;
    return;
  }

  const loading = ElLoading.service({ fullscreen: true, text: '正在通过 AI 解析法律线索...' });

  try {
    const res = await repositories.evidence.analyzeEvidence({
      evidence_text: currentText,
      evidence_type: evidenceType.value,
      case_id: selectedCaseId.value || undefined
    });

    const rawData = res.data || res;

    // 统一字段映射适配
    const data = {
      ...rawData,
      price_analysis: rawData.price_analysis || (rawData.price_anomaly ? {
        is_anomaly: rawData.price_anomaly.is_anomaly,
        price_ratio: rawData.price_anomaly.price_ratio,
        suggestion: rawData.price_anomaly.suggestion
      } : null),
      subjective_knowledge: rawData.subjective_knowledge ? {
        ...rawData.subjective_knowledge,
        category_counts: rawData.subjective_knowledge.categories || rawData.subjective_knowledge.category_counts || {}
      } : null,
      key_entities: rawData.key_entities || (rawData.key_actors ? {
        names: rawData.key_actors.map((a: any) => a.name),
        roles: rawData.key_actors.map((a: any) => a.role),
        contacts: [],
        amounts: []
      } : { names: [], roles: [], contacts: [], amounts: [] }),
      crime_type: rawData.crime_type || rawData.subjective_knowledge?.crime_type,
      transactions: rawData.transactions || [],
      logistics: rawData.logistics || []
    };

    analysisResult.value = data;
    analysisDone.value = true;
    ElMessage.success('AI 解析完成');
  } catch (error) {
    analysisError.value = '分析失败，请稍后重试';
    console.error('分析失败:', error);
    ElMessage.error('分析失败，请稍后重试');
  } finally {
    isAnalyzing.value = false;
    loading.close();
  }
}


// 高亮原始文本中的关键词
const highlightedText = computed(() => {
  const currentText = store.rawText;

  if (!currentText) return "";
  let text = currentText.replace(/\n/g, '<br/>');

  const rawKeywords = analysisResult.value?.subjective_knowledge?.hit_keywords;
  const keywords = Array.isArray(rawKeywords)
    ? rawKeywords.map((keyword) => String(keyword)).filter(Boolean)
    : typeof rawKeywords === "string"
      ? [rawKeywords]
      : [];
  if (keywords.length === 0) return text;

  // 按长度降序排列，避免子串冲突
  const sortedKeywords = [...new Set(keywords)].sort((a, b) => b.length - a.length);

  sortedKeywords.forEach((kw) => {
    if (!kw) return;
    const regex = new RegExp(`(${kw})`, 'gi');
    text = text.replace(regex, '<mark class="bg-yellow-200 text-red-600 px-0.5 rounded font-bold">$1</mark>');
  });

  return text;
});

function gotoRelations() {
  if (!selectedCaseId.value) {
    ElMessage.warning("请先选择案件");
    return;
  }
  router.push({
    path: "/relations",
    query: { caseId: selectedCaseId.value }
  });
}


async function handleFileUpload(file: File, evidenceType: "chat" | "transfer" | "logistics") {
  const tab = evidenceTab.value as EvidenceTabKey;
  resetTabUiState(tab);
  const caseId = selectedCaseId.value || (caseOptions.value.length > 0 ? String(caseOptions.value[0].value) : "");

  if (!caseId) {
    tabUiState[tab].upload.status = 'error';
    tabUiState[tab].upload.progress = 0;
    tabUiState[tab].upload.error = '请先选择案件后再上传';
    ElMessage.warning('请先选择案件后再上传');
    return false;
  }

  try {
    tabUiState[tab].upload.status = 'uploading';
    tabUiState[tab].upload.progress = 30;

    const response = await repositories.evidence.uploadFile({
      file,
      evidenceType,
      caseId,
    });
    tabUiState[tab].upload.progress = 90;

    const fileText = await file.text();
    tabUiState[tab].upload.rawText = fileText;
    tabUiState[tab].upload.status = 'success';
    tabUiState[tab].upload.progress = 100;
    tabUiState[tab].upload.fileName = file.name;

    if (!response?.success) {
      throw new Error(response?.message || '上传失败');
    }

    tabUiState[tab].upload.formatDetected = response.format_detected || null;
    tabUiState[tab].upload.extractedTransactions = response.extracted_transactions || 0;

    if (evidenceType === "chat") {
      store.rawText = fileText;
    }

    await startAnalysis();
    await loadCases();

    const inferenceParts = [
      response.case_amount !== undefined ? `金额 ${response.case_amount}` : "",
      response.case_suspect_name ? `嫌疑人 ${response.case_suspect_name}` : "",
      response.case_brand ? `品牌 ${response.case_brand}` : "",
    ].filter(Boolean);
    const inferenceText = inferenceParts.length > 0 ? `，案件已自动更新：${inferenceParts.join('，')}` : "";
    const wechatExtra = response.format_detected === 'wechat' && response.extracted_transactions
      ? `，自动提取 ${response.extracted_transactions} 条转账记录` : "";

    if (evidenceType === "general") {
      ElMessage.success(`证据数据「${file.name}」上传成功，入库 ${response.saved_records}/${response.total_records} 条${wechatExtra}${inferenceText}`);
    }
  } catch (error) {
    // 表格格式校验错误 — 专项友好提示
    if (error instanceof TableFormatError) {
      const tpl = templateHintsMap[evidenceType];
      const hint = tpl
        ? `${tpl.label}必填列：${tpl.columns.join('、')}`
        : '请确保表头列名与系统模板一致';
      tabUiState[tab].upload.status = 'error';
      tabUiState[tab].upload.progress = 0;
      tabUiState[tab].upload.error = error.detail;
      tabUiState[tab].upload.formatErrorHint = hint;
      ElMessage({
        type: 'error',
        message: error.detail,
        duration: 5000,
      });
    } else {
      const errorMessage = error instanceof Error ? error.message : '文件上传失败';
      tabUiState[tab].upload.status = 'error';
      tabUiState[tab].upload.progress = 0;
      tabUiState[tab].upload.error = errorMessage;
      tabUiState[tab].upload.formatErrorHint = null;
      ElMessage.error(errorMessage);
    }
    console.error('文件上传失败:', error);
  }

  return false;
}

// 生成分析报告
async function generateReport() {
  const loading = ElLoading.service({ fullscreen: true, text: '正在生成初步分析报告...' });

  try {
    const caseId = selectedCaseId.value || (caseOptions.value.length > 0 ? caseOptions.value[0].value : null);
    if (!caseId) {
      ElMessage.warning("请先选择案件");
      return;
    }

    // 调用接口生成报告
    const res = await post<any>('/report/generate', null, { params: { case_id: Number(caseId) } });

    // 兼容不同的返回结构
    const data = (res as any).data || res;

    if (data && (data.success || data.report_id)) {
      ElMessage.success(data.message || "报告生成成功！");
      // 保存到 store 供后续下载
      reportStore.setReport(caseId.toString(), data.download_url, data.report_id);
    } else {
      throw new Error(data?.message || '报告生成失败');
    }
  } catch (error) {
    console.error('报告生成失败:', error);
    ElMessage.error('报告生成失败，请确认已选择案件');
  } finally {
    loading.close();
  }
}

function downloadLastReport() {
  if (lastReportUrl.value) {
    const link = document.createElement('a');
    link.href = lastReportUrl.value;
    link.setAttribute('download', lastReportName.value || 'report.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- ===== 智能证据解析 ===== -->
    <div v-show="evidenceTab === 'general'">
      <div class="grid grid-cols-5 gap-5">
        <div class="col-span-2">
          <div class="app-card p-5">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-sm text-text-secondary">对应案件：</span>
              <el-select v-model="selectedCaseId" placeholder="请选择关联案件" class="!w-[220px]" clearable>
                <el-option v-for="opt in caseOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </div>
            <div class="flex justify-between items-center mb-3">
              <div class="card-title !mb-0">相关证据导入</div>
              <div class="flex gap-2">
                <button class="action-btn action-btn-primary" @click="loadSample">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 1024 1024"
                    fill="currentColor">
                    <path
                      d="M832 384H576V128H192v768h640zm-26.496-64L640 154.496V320zM160 64h480l256 256v608a32 32 0 0 1-32 32H160a32 32 0 0 1-32-32V96a32 32 0 0 1 32-32m160 448h384v64H320zm0-192h160v64H320zm0 384h384v64H320z" />
                  </svg>
                  获取模板
                </button>
                <button class="action-btn action-btn-danger" @click="clearEvidenceInput">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 1024 1024"
                    fill="currentColor">
                    <path
                      d="M810 273.472H54.72c-9.6 0-17.216 7.616-17.216 17.216s7.616 17.216 17.216 17.216H810c9.6 0 17.216-7.616 17.216-17.216s-7.616-17.216-17.216-17.216zM195.072 376.32c-3.072 3.072-4.096 6.912-4.096 11.264 0 4.352 1.024 8.192 4.096 11.264l68.864 68.864 68.864-68.864c3.072-3.072 6.912-4.096 11.264-4.096 4.352 0 8.192 1.024 11.264 4.096 3.072 3.072 4.096 6.912 4.096 11.264 0 4.352-1.024 8.192-4.096 11.264L276.992 512l68.864 68.864c3.072 3.072 4.096 6.912 4.096 11.264 0 4.352-1.024 8.192-4.096 11.264-3.072 3.072-6.912 4.096-11.264 4.096-4.352 0-8.192-1.024-11.264-4.096L243.2 523.136l-68.864 68.864c-3.072 3.072-6.912 4.096-11.264 4.096-4.352 0-8.192-1.024-11.264-4.096-3.072-3.072-4.096-6.912-4.096-11.264 0-4.352 1.024 8.192 4.096-11.264L276.992 512l-68.864-68.864c-3.072-3.072-4.096-6.912-4.096-11.264 0-4.352 1.024 8.192 4.096-11.264 3.072-3.072 6.912-4.096 11.264-4.096 4.352 0 8.192 1.024 11.264 4.096L316.8 500.288l68.864-68.864c3.072-3.072 6.912-4.096 11.264-4.096 4.352 0 8.192 1.024 11.264 4.096 3.072 3.072 4.096 6.912 4.096 11.264 0 4.352-1.024 8.192-4.096 11.264L276.992 576 195.072 494.08z" />
                  </svg>
                  清空
                </button>
              </div>
            </div>

            <div class="relative mt-4">
              <el-input v-model="store.rawText" type="textarea" :rows="12"
                placeholder="请粘贴聊天记录、资金流水或物流单据原始文本（系统将自动识别解析），或通过下方按钮上传 CSV / Excel 文件..." style="font-family: monospace; font-size: 13px" />
              <div v-if="isAnalyzing"
                class="scan-overlay absolute inset-0 rounded-lg overflow-hidden pointer-events-none" />
            </div>

            <div class="mt-4">
              <el-button class="w-full mb-2" :icon="Upload" size="small" style="color: #1A3A5C; border-color: #D0D5DD"
                :loading="isUploading">
                <label class="cursor-pointer">
                  选择并上传 CSV / Excel 文件
                  <input type="file" accept=".csv,.txt,.xlsx,.xls" class="hidden" :disabled="isUploading"
                    @change="(e) => { const input = e.target as HTMLInputElement; const f = input.files?.[0]; if (f) handleFileUpload(f, 'chat'); input.value = '' }" />
                </label>
              </el-button>
              <el-progress v-if="isUploading" :percentage="uploadProgress" :stroke-width="6"
                style="margin-bottom: 8px" />
              <div v-if="uploadDone && uploadedFileName" class="text-xs mb-2" style="color: #27AE60">
                ✓ 已上传：{{ uploadedFileName }}，共 {{ uploadedRawText?.split("\n").length ?? 0 }} 行
              </div>
              <div v-if="uploadDone && uploadFormatDetected" class="mb-2">
                <el-alert type="success" :closable="false" show-icon style="font-size: 13px">
                  <template #title>
                    <span>已识别为 {{ uploadFormatDetected === 'wechat' ? '微信' : '复合' }} 数据格式，自动完成结构化提取</span>
                  </template>
                  <div v-if="uploadExtractedTxns > 0" class="mt-1 text-xs" style="color: #606266">
                    自动发现并提取 {{ uploadExtractedTxns }} 条线索记录
                  </div>
                </el-alert>
              </div>
              <div v-if="uploadError" class="mb-2">
                <el-alert type="error" :title="uploadErrorMessage ?? undefined" :closable="false" show-icon />
                <el-alert v-if="uploadFormatHint" type="info" :closable="false" show-icon class="mt-1"
                  style="font-size: 12px">
                  <template #title>
                    <span>请按系统模板字段上传，确保表头列名与模板一致。</span>
                  </template>
                  <div class="mt-1 text-xs" style="color: #606266; line-height: 1.6">
                    {{ uploadFormatHint }}
                  </div>
                </el-alert>
              </div>
            </div>

            <div v-if="analysisError" class="mt-2">
              <el-alert type="error" :title="analysisError" :closable="false" show-icon />
            </div>

            <el-button type="primary" class="w-full mt-4 h-12 text-base font-bold"
              style="background: #1A3A5C; border-color: #1A3A5C" :loading="isAnalyzing" @click="startAnalysis">
              🚀 开始 AI 法律线索提取
            </el-button>

            <div v-if="analysisDone" class="flex gap-4 mt-4">
              <el-button type="primary" :icon="Document" class="flex-1 h-10 font-semibold"
                style="background: #1A3A5C; border-color: #1A3A5C" @click="generateReport">
                生成初步分析报告
              </el-button>
              <el-button :icon="Connection" class="flex-1 h-10 font-semibold"
                style="color: #1A3A5C; border-color: #1A3A5C" @click="gotoRelations">
                转入关联图谱分析
              </el-button>
            </div>
          </div>
        </div>

        <div class="col-span-3">
          <div v-if="!analysisDone" class="app-card h-full flex flex-col items-center justify-center"
            style="min-height: 500px">
            <el-icon :size="64" style="color: #D0D5DD">
              <Cpu />
            </el-icon>
            <p class="mt-6 text-base" style="color: #aaa">等待数据输入，点击左侧「开始解析」</p>
            <p class="text-xs mt-2" style="color: #ccc">系统将自动识别：聊天记录 / 资金流水 / 物流单据</p>
          </div>

          <div v-else class="space-y-4">
            <div v-if="analysisResult?.subjective_knowledge?.score > 5 || analysisResult?.price_analysis?.is_anomaly"
              class="app-card p-4" style="border: 1px solid #F5C6C2; background: #FDECEA">
              <div class="font-semibold" style="color: #C0392B">
                🔴 检测到高风险疑似侵权特征
              </div>
            </div>
            <div v-else class="app-card p-4" style="border: 1px solid #A8D8A8; background: #F0FAF0">
              <div class="font-semibold" style="color: #27AE60">
                🟢 未检测到显著侵权特征
              </div>
            </div>

            <!-- 证据出处与高亮解析 -->
            <div class="app-card p-5">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <span class="text-lg">🔍</span>
                  <h4 class="font-bold text-sm" style="color: #1A3A5C">证据出处与高亮解析</h4>
                </div>
                <div class="text-[10px] px-2 py-0.5 rounded bg-yellow-50 text-yellow-700 border border-yellow-100">
                  命中关键词已高亮
                </div>
              </div>
              <div
                class="p-4 rounded-lg text-xs leading-relaxed max-h-[200px] overflow-y-auto bg-slate-50 border border-slate-100 font-mono"
                v-html="highlightedText"></div>
            </div>

            <!-- 价格异常判定 -->
            <div v-if="analysisResult?.price_analysis" class="app-card p-5">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-lg">🔴</span>
                <h4 class="font-bold text-sm" style="color: #1A3A5C">
                  价格异常判定
                </h4>
              </div>
              <div class="p-3 rounded-lg text-sm" style="background: #FDECEA; border: 1px solid #F5C6C2">
                <p v-if="analysisResult.price_analysis.is_anomaly">
                  价格异常：低于正品 {{ Math.round((1 - analysisResult.price_analysis.price_ratio) * 100) }}%
                </p>
                <p v-else>
                  价格正常
                </p>
                <p class="mt-1" style="color: #888">
                  {{ analysisResult.price_analysis.suggestion }}
                </p>
              </div>
            </div>

            <!-- 主观明知证据 -->
            <div v-if="analysisResult?.subjective_knowledge" class="app-card p-5">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-lg">🔴</span>
                <h4 class="font-bold text-sm" style="color: #1A3A5C">
                  主观明知证据
                </h4>
              </div>
              <div class="p-3 rounded-lg text-sm" style="background: #F5F8FA; border: 1px solid #D0D5DD">
                <p class="font-semibold mb-2">评分：{{ analysisResult.subjective_knowledge.score }}/10（{{
                  analysisResult.subjective_knowledge.level }}）</p>
                <p class="mb-2">命中关键词：{{ analysisResult.subjective_knowledge.hit_keywords.join(' / ') }}</p>
                <div
                  v-if="analysisResult.subjective_knowledge.quotes && analysisResult.subjective_knowledge.quotes.length > 0"
                  class="mt-2">
                  <p class="text-xs font-semibold mb-1">原文引用：</p>
                  <div class="space-y-2">
                    <div v-for="(quote, index) in analysisResult.subjective_knowledge.quotes" :key="index"
                      class="p-2 rounded bg-white border border-gray-200 text-xs">
                      {{ quote }}
                    </div>
                  </div>
                </div>
                <div v-if="analysisResult.subjective_knowledge.category_counts" class="mt-2">
                  <p class="text-xs font-semibold mb-1">关键词分类：</p>
                  <div class="flex flex-wrap gap-2">
                    <span v-for="(count, category) in analysisResult.subjective_knowledge.category_counts"
                      :key="category" class="px-2 py-1 rounded text-xs bg-gray-100">
                      {{ category }}: {{ count }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 关键信息主体 -->
            <div v-if="normalizedKeyActors.length > 0" class="app-card p-5">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-lg">🟡</span>
                <h4 class="font-bold text-sm" style="color: #1A3A5C">关键信息主体</h4>
              </div>
              <div class="space-y-2">
                <div v-for="actor in normalizedKeyActors"
                  :key="`${actor.name}-${actor.role}-${actor.contact}-${actor.mentionedIn}`"
                  class="p-3 rounded bg-gray-50 border border-gray-100">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 font-bold">
                      {{ actor.name }}
                    </span>
                    <span v-if="actor.role" class="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                      {{ actor.role }}
                    </span>
                    <span v-if="actor.contact" class="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                      {{ actor.contact }}
                    </span>
                  </div>
                  <div v-if="actor.mentionedIn" class="text-[11px] mt-2 text-gray-500">
                    出现于：{{ actor.mentionedIn }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 涉嫌罪名 -->
            <div v-if="analysisResult?.crime_type" class="app-card p-5">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-lg">⚖️</span>
                <h4 class="font-bold text-sm" style="color: #1A3A5C">涉嫌罪名</h4>
              </div>
              <div class="p-3 rounded-lg text-sm" style="background: #EEF3F8; border: 1px solid #D0D5DD">
                <p class="font-semibold">{{ analysisResult.crime_type }}</p>
              </div>
            </div>

            <!-- 资金流水分析 -->
            <div v-if="normalizedTransactions.length > 0 || txnStats.count > 0" class="app-card p-5">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                  <span class="text-xl">💰</span>
                  <h4 class="font-bold text-sm" style="color: #1A3A5C">资金流水线索分析</h4>
                </div>
                <div class="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                  发现 {{ txnStats.count }} 笔记录
                </div>
              </div>

              <!-- 资金统计卡片 -->
              <div class="grid grid-cols-3 gap-3 mb-4">
                <div class="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div class="text-[10px] text-gray-500 mb-1">流水总计</div>
                  <div class="text-base font-bold text-blue-900">¥{{ txnStats.totalAmount?.toLocaleString() }}</div>
                </div>
                <div class="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div class="text-[10px] text-gray-500 mb-1">分析笔数</div>
                  <div class="text-base font-bold text-blue-900">{{ txnStats.count }} 笔</div>
                </div>
                <div class="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div class="text-[10px] text-gray-500 mb-1">涉及主体</div>
                  <div class="text-base font-bold text-blue-900">{{ txnStats.persons }} 人</div>
                </div>
              </div>

              <!-- 关键对手方 -->
              <div v-if="txnStats.topCounterparties.length > 0" class="mb-4">
                <div class="text-xs font-semibold text-gray-600 mb-2">主要对手方分布：</div>
                <div class="space-y-2">
                  <div v-for="(cp, idx) in txnStats.topCounterparties" :key="idx" class="relative pt-1">
                    <div class="flex items-center justify-between text-[11px] mb-1">
                      <span class="font-medium text-gray-700">{{ cp.name }}</span>
                      <span class="text-blue-600 font-mono">¥{{ cp.amount?.toLocaleString() }} ({{ cp.percent }}%)</span>
                    </div>
                    <div class="overflow-hidden h-1 text-xs flex rounded bg-blue-100">
                      <div :style="`width: ${cp.percent}%`" class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 流水列表 -->
              <div class="max-h-[300px] overflow-y-auto rounded-lg border border-gray-100">
                <table class="w-full text-[11px]">
                  <thead class="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th class="px-2 py-2 text-left font-semibold text-gray-600">对手方</th>
                      <th class="px-2 py-2 text-right font-semibold text-gray-600">金额</th>
                      <th class="px-2 py-2 text-left font-semibold text-gray-600">时间</th>
                      <th class="px-2 py-2 text-left font-semibold text-gray-600">渠道</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-50">
                    <tr v-for="(txn, idx) in normalizedTransactions" :key="idx" class="hover:bg-blue-50/30 transition-colors">
                      <td class="px-2 py-2 text-gray-700 font-medium">{{ txn.payee === '曹某某' ? txn.payer : txn.payee }}</td>
                      <td class="px-2 py-2 text-right font-mono" :class="txn.payee === '曹某某' ? 'text-green-600' : 'text-red-600'">
                        {{ txn.payee === '曹某某' ? '+' : '-' }}¥{{ txn.amount?.toLocaleString() }}
                      </td>
                      <td class="px-2 py-2 text-gray-500">{{ txn.time }}</td>
                      <td class="px-2 py-2">
                        <span class="px-1.5 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-600">{{ txn.channel }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 物流分析 -->
            <div v-if="normalizedLogistics.length > 0 || logStats.total > 0" class="app-card p-5">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                  <span class="text-xl">📦</span>
                  <h4 class="font-bold text-sm" style="color: #1A3A5C">物流发货线索分析</h4>
                </div>
                <div class="text-[10px] px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-100">
                  追踪 {{ logStats.total }} 个单号
                </div>
              </div>

              <!-- 物流统计卡片 -->
              <div class="grid grid-cols-3 gap-3 mb-4">
                <div class="p-3 rounded-lg bg-orange-50/30 border border-orange-100">
                  <div class="text-[10px] text-gray-500 mb-1">发货总数</div>
                  <div class="text-base font-bold text-orange-900">{{ logStats.total }} 单</div>
                </div>
                <div class="p-3 rounded-lg bg-orange-50/30 border border-orange-100">
                  <div class="text-[10px] text-gray-500 mb-1">快递公司</div>
                  <div class="text-base font-bold text-orange-900">{{ logStats.companies }} 家</div>
                </div>
                <div class="p-3 rounded-lg bg-orange-50/30 border border-orange-100">
                  <div class="text-[10px] text-gray-500 mb-1">关联节点</div>
                  <div class="text-base font-bold text-orange-900">{{ logStats.persons }} 个</div>
                </div>
              </div>

              <!-- 异常件提示 -->
              <div v-if="logStats.suspicious.length > 0" class="mb-4">
                <div class="flex items-center gap-1 text-[11px] font-bold text-red-600 mb-2">
                  <span>⚠️ 检测到 {{ logStats.suspicious.length }} 笔可疑发货：</span>
                </div>
                <div class="space-y-2">
                  <div v-for="(s, idx) in logStats.suspicious" :key="idx" class="p-2 rounded border border-red-100 bg-red-50/50 text-[11px]">
                    <div class="flex justify-between mb-1">
                      <span class="font-bold">{{ s.expressNo }}</span>
                      <span class="text-red-700 font-semibold">{{ s.reason }}</span>
                    </div>
                    <div class="text-gray-600">{{ s.sender }} ➔ {{ s.receiver }}</div>
                  </div>
                </div>
              </div>

              <!-- 物流记录详情 -->
              <div class="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                <div v-for="(log, idx) in normalizedLogistics" :key="idx"
                  class="p-3 rounded-lg bg-white border border-gray-100 text-[11px] hover:shadow-sm transition-shadow">
                  <div class="flex justify-between items-center mb-2">
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-blue-900">{{ log.express_no || log.expressNo }}</span>
                      <span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{{ log.channel || '物流' }}</span>
                    </div>
                    <span class="text-gray-400">{{ log.time }}</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="flex-1">
                      <div class="text-gray-400 mb-0.5">发货人</div>
                      <div class="font-medium">{{ log.sender }}</div>
                    </div>
                    <div class="text-gray-200">➔</div>
                    <div class="flex-1 text-right">
                      <div class="text-gray-400 mb-0.5">收货人</div>
                      <div class="font-medium">{{ log.receiver }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="analysisError" class="app-card p-4">
              <el-alert type="error" :title="analysisError" :closable="false" show-icon />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 模板获取弹窗 -->
    <el-dialog v-model="showTemplateDialog" title="获取相关证据标准模板" width="500px" append-to-body>
      <div class="space-y-4">
        <p class="text-sm text-gray-600">您可以直接点击下方按钮下载系统支持的标准 Excel / CSV 模板：</p>
        <div class="grid grid-cols-1 gap-3">
          <div @click="downloadTemplate('/upload/template/transactions', '资金流水模板.xlsx')"
            class="cursor-pointer flex items-center justify-between p-3 rounded-lg border border-blue-100 bg-blue-50 hover:bg-blue-100 transition-colors">
            <div class="flex items-center gap-2">
              <span class="text-lg">💰</span>
              <span class="text-sm font-semibold text-blue-900">资金流水模板 (Transactions)</span>
            </div>
            <el-icon class="text-blue-600"><Download /></el-icon>
          </div>
          <div @click="downloadTemplate('/upload/template/communications', '通讯记录模板.xlsx')"
            class="cursor-pointer flex items-center justify-between p-3 rounded-lg border border-green-100 bg-green-50 hover:bg-green-100 transition-colors">
            <div class="flex items-center gap-2">
              <span class="text-lg">💬</span>
              <span class="text-sm font-semibold text-green-900">通讯记录模板 (Communications)</span>
            </div>
            <el-icon class="text-green-600"><Download /></el-icon>
          </div>
          <div @click="downloadTemplate('/upload/template/logistics', '物流发货模板.xlsx')"
            class="cursor-pointer flex items-center justify-between p-3 rounded-lg border border-orange-100 bg-orange-50 hover:bg-orange-100 transition-colors">
            <div class="flex items-center gap-2">
              <span class="text-lg">📦</span>
              <span class="text-sm font-semibold text-orange-900">物流发货模板 (Logistics)</span>
            </div>
            <el-icon class="text-orange-600"><Download /></el-icon>
          </div>
        </div>
        <div class="p-3 bg-gray-50 rounded border border-gray-100 text-[11px] text-gray-500 leading-relaxed">
          💡 提示：将原始证据按照模板字段整理后上传，可以获得最精确的 AI 解析效果。混合文本输入依然支持，但结构化文件识别率更高。
        </div>
      </div>
      <template #footer>
        <el-button @click="showTemplateDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>