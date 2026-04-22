<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { ElButton, ElTable, ElTableColumn, ElInput, ElSelect, ElOption, ElTag, ElMessage } from "element-plus";
import { Search, Download, Upload } from "@element-plus/icons-vue";
import { repositories } from "@/services";
import { maskName } from "@/utils/masking";
import type { EvidenceListItem } from "@/services/api/types/ledger";

const searchText = ref("");
const selectedCaseId = ref<string | number>("");
const isMasked = ref(true);
const filterType = ref("");
const loading = ref(false);
const caseOptions = ref<any[]>([]);
const currentPage = ref(1);
const pageSize = ref(10);

const evidenceList = ref<EvidenceListItem[]>([]);
const stats = ref({
  communication: 0,
  price_anomaly: 0,
  logistics: 0,
});

// 加载案件选项 (参照人物台账)
async function loadCaseOptions() {
  try {
    const response = await repositories.cases.listCases({ limit: 100, offset: 0 });
    const list = Array.isArray(response) ? response : (response as any).data?.list || [];
    caseOptions.value = [
      { label: "全部案件", value: "" },
      ...list.map((c: any) => ({
        label: `${c.case_no} — ${c.suspect_name}`,
        value: c.id
      }))
    ];
    
    // 如果没有选择案件，默认选第一个
    if (!selectedCaseId.value && list.length > 0) {
      selectedCaseId.value = list[0].id;
      loadEvidence(list[0].id);
    }
  } catch (error) {
    console.error("加载案件选项失败:", error);
  }
}

// 加载证据数据
async function loadEvidence(caseId: string | number) {
  if (!caseId) return;
  loading.value = true;
  try {
    const response = await repositories.ledger.getEvidenceList(caseId.toString());
    
    const data = (response as any).data || response;
    evidenceList.value = data.evidence_list || [];
    stats.value = {
      communication: data.communication_evidence_count || 0,
      price_anomaly: data.price_anomaly_evidence_count || 0,
      logistics: data.logistics_evidence_count || 0,
    };
  } catch (error) {
    ElMessage.error("获取证据清单失败，请稍后重试");
  } finally {
    loading.value = false;
  }
}

import { watch } from "vue";
watch(selectedCaseId, (newId) => {
  if (newId) loadEvidence(newId);
  else evidenceList.value = [];
});

async function handleExport() {
  try {
    ElMessage.info("正在生成导出文件...");
    const blob = await repositories.export.exportCsv({
      type: "evidence",
      case_id: selectedCaseId.value || undefined
    });
    
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `证据清单_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    ElMessage.success("导出成功");
  } catch (error) {
    ElMessage.error("导出失败");
  }
}

const filteredList = computed(() => {
  return evidenceList.value.filter((item) => {
    const matchSearch = !searchText.value ||
      item.content.includes(searchText.value) ||
      (item.initiator || '').includes(searchText.value) ||
      (item.receiver || '').includes(searchText.value);
    const matchType = !filterType.value || item.type === filterType.value;
    return matchSearch && matchType;
  });
});

function resetFilter() {
  searchText.value = "";
  filterType.value = "";
  currentPage.value = 1;
}

onMounted(() => {
  loadCaseOptions();
});
</script>

<template>
  <div class="space-y-6">
    <!-- 顶部统计模块 -->
    <div class="grid grid-cols-4 gap-6 mb-6">
      <div class="app-card flex flex-col items-center justify-center p-6 shadow-sm">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-[#1A3A5C] opacity-80">💬</span>
          <span class="text-xs font-bold text-gray-500">通讯证据总数</span>
        </div>
        <p class="text-4xl font-black text-[#1A3A5C] mb-1">{{ stats.communication }}</p>
        <p class="text-xs text-gray-400">条</p>
      </div>
      <div class="app-card flex flex-col items-center justify-center p-6 shadow-sm">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-red-600">⚖️</span>
          <span class="text-xs font-bold text-gray-500">价格异常条数</span>
        </div>
        <p class="text-4xl font-black text-red-600 mb-1">{{ stats.price_anomaly }}</p>
        <p class="text-xs text-gray-400">条</p>
      </div>
      <div class="app-card flex flex-col items-center justify-center p-6 shadow-sm">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-orange-500">📦</span>
          <span class="text-xs font-bold text-gray-500">物流异常条数</span>
        </div>
        <p class="text-4xl font-black text-orange-600 mb-1">{{ stats.logistics }}</p>
        <p class="text-xs text-gray-400">条</p>
      </div>
      <div class="app-card flex flex-col items-center justify-center p-6 shadow-sm">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-blue-500">📂</span>
          <span class="text-xs font-bold text-gray-500">关联证据总额</span>
        </div>
        <p class="text-4xl font-black text-[#1A3A5C] mb-1">{{ evidenceList.length }}</p>
        <p class="text-xs text-gray-400">条</p>
      </div>
    </div>

    <!-- 下方数据表 -->
    <div class="app-card p-8 shadow-md rounded-xl">
      <div class="flex justify-between items-center mb-6">
        <div class="flex items-center gap-3">
          <div class="w-1 h-6 bg-[#C0392B] rounded-full"></div>
          <div class="flex items-center gap-2">
            <span class="text-xl">📄</span>
            <h3 class="text-lg font-bold text-[#1A3A5C]">证据清单管理</h3>
          </div>
        </div>
        <div class="flex gap-2">
          <el-checkbox v-model="isMasked" label="脱敏显示" border size="small" class="mr-2" />
          <el-button size="small" :icon="Download" style="color: #1A3A5C; border-color: #D0D5DD" class="!rounded-md" @click="handleExport">导出 Excel</el-button>
        </div>
      </div>

      <div class="flex gap-4 mb-6 items-center">
        <el-select v-model="selectedCaseId" placeholder="选择关联案件" class="!w-[200px]" size="default" clearable>
          <el-option v-for="opt in caseOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <el-input v-model="searchText" placeholder="搜索证据内容" :prefix-icon="Search" class="!w-[280px]" size="default" clearable />
        <el-select v-model="filterType" placeholder="选择证据类型" class="!w-[180px]" size="default" clearable>
          <el-option label="通讯记录" value="通讯记录" />
          <el-option label="价格异常" value="价格异常" />
          <el-option label="物流异常" value="物流异常" />
        </el-select>
        <el-button @click="resetFilter" class="px-6">重置</el-button>
      </div>

      <el-table 
        :data="filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize)" 
        stripe 
        class="data-table" 
        v-loading="loading"
      >
        <el-table-column label="案件名称" min-width="130">
          <template #default="scope">
            <span class="font-mono text-xs text-[#1A3A5C] font-semibold">
              {{ scope.row.case_no || caseOptions.find(c => c.value == selectedCaseId)?.label.split(' — ')[0] || '当前案件' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="time" label="发现时间" min-width="110">
          <template #default="scope">
            <span class="text-gray-500 font-medium">{{ scope.row.time.split('T')[0] }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" min-width="120">
          <template #default="{ row }">
            <span
              class="px-3 py-1 rounded text-xs font-bold"
              :style="{
                background: row.type === '通讯记录' ? '#EEF2FF' : row.type === '价格异常' ? '#FFF1F2' : '#F0FDF4',
                color: row.type === '通讯记录' ? '#4F46E5' : row.type === '价格异常' ? '#E11D48' : '#16A34A',
              }"
            >
              {{ row.type }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="相关人员" min-width="160">
          <template #default="{ row }">
            <div v-if="row.initiator || row.receiver" class="flex flex-col gap-1">
              <span v-if="row.initiator" class="text-sm">发起: <span class="font-bold text-[#1A3A5C]">{{ isMasked ? maskName(row.initiator) : row.initiator }}</span></span>
              <span v-if="row.receiver" class="text-sm">接收: <span class="font-bold text-[#1A3A5C]">{{ isMasked ? maskName(row.receiver) : row.receiver }}</span></span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="证据原文" min-width="250" show-overflow-tooltip>
          <template #default="scope">
            <span class="text-[#334155] leading-relaxed">{{ scope.row.content }}</span>
          </template>
        </el-table-column>
        <el-table-column label="关键词" min-width="150">
          <template #default="{ row }">
            <div class="flex flex-wrap gap-1.5">
              <span 
                v-for="k in row.hit_keywords" 
                :key="k" 
                class="px-2 py-0.5 bg-[#FEF2F2] text-[#DC2626] text-[11px] font-bold rounded border border-[#FECACA]"
              >
                {{ k }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="score" label="可信度" min-width="90" align="center">
          <template #default="{ row }">
            <span class="font-black text-sm text-[#1A3A5C]">{{ row.score }}/10</span>
          </template>
        </el-table-column>
        <el-table-column prop="crime_type" label="涉嫌罪名" min-width="180" show-overflow-tooltip>
          <template #default="scope">
            <span class="text-gray-600 italic text-sm">{{ scope.row.crime_type }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="severity_level" label="严重程度" min-width="110" align="center">
          <template #default="{ row }">
            <span
              v-if="row.severity_level"
              class="px-2 py-0.5 rounded-full text-[10px] font-bold border"
              :style="{
                background: row.severity_level === '刑事犯罪' ? '#FEF2F2' : row.severity_level === '民事侵权' ? '#FFFBEB' : '#F0FDF4',
                color: row.severity_level === '刑事犯罪' ? '#DC2626' : row.severity_level === '民事侵权' ? '#D97706' : '#16A34A',
                borderColor: row.severity_level === '刑事犯罪' ? '#FECACA' : row.severity_level === '民事侵权' ? '#FDE68A' : '#BBF7D0'
              }"
            >
              {{ row.severity_level }}
            </span>
            <span v-else class="text-gray-400">-</span>
          </template>
        </el-table-column>
      </el-table>
      <div class="flex justify-end mt-4">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="filteredList.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </div>
  </div>
</template>
