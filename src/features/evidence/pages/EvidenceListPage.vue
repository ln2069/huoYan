<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { ElButton, ElTable, ElTableColumn, ElInput, ElSelect, ElOption, ElMessage } from "element-plus";
import { Search, Download } from "@element-plus/icons-vue";
import { repositories } from "@/services";

const searchText = ref("");
const filterType = ref("");
const loading = ref(false);
const currentPage = ref(1);
const pageSize = ref(10);

const cluesList = ref<any[]>([]);
const stats = ref({
  high_risk: 0,
  medium_risk: 0,
  low_risk: 0,
});

// 加载可疑线索数据
async function loadClues() {
  loading.value = true;
  try {
    const caseId = "4"; // 默认演示案件
    const response = await repositories.cases.getSuspiciousClues(caseId);

    // 后端返回的是字典 { suspicion_clues: [], price_clues: [], role_clues: [] }
    const data = (response as any).data || response;

    const suspicion = data.suspicion_clues || [];
    const price = data.price_clues || [];
    const role = data.role_clues || [];

    cluesList.value = [...suspicion, ...price, ...role];

    // 统计逻辑保持不变，但现在基于合并后的列表
    stats.value = {
      high_risk: cluesList.value.filter(c => c.severity_level === '刑事犯罪' || c.score >= 8).length,
      medium_risk: cluesList.value.filter(c => c.score >= 5 && c.score < 8).length,
      low_risk: cluesList.value.filter(c => c.score < 5).length,
    };
  } catch (error) {
    ElMessage.error("获取可疑线索失败");
    console.error("获取可疑线索失败:", error);
  } finally {
    loading.value = false;
  }
}

const filteredList = computed(() => {
  return cluesList.value.filter((item) => {
    const matchSearch = !searchText.value ||
      item.evidence_text.includes(searchText.value) ||
      (item.clue_type || '').includes(searchText.value) ||
      (item.crime_type || '').includes(searchText.value);
    const matchType = !filterType.value || item.clue_type === filterType.value;
    return matchSearch && matchType;
  });
});

function resetFilter() {
  searchText.value = "";
  filterType.value = "";
  currentPage.value = 1;
}

onMounted(() => {
  loadClues();
});
</script>

<template>
  <div class="space-y-6">
    <!-- 顶部统计模块 -->
    <div class="grid grid-cols-4 gap-6 mb-6">
      <div class="app-card flex flex-col items-center justify-center p-6 shadow-sm">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-red-600">🚨</span>
          <span class="text-xs font-bold text-gray-500">高风险线索</span>
        </div>
        <p class="text-4xl font-black text-red-600 mb-1">{{ stats.high_risk }}</p>
        <p class="text-xs text-gray-400">条</p>
      </div>
      <div class="app-card flex flex-col items-center justify-center p-6 shadow-sm">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-orange-500">⚠️</span>
          <span class="text-xs font-bold text-gray-500">中风险线索</span>
        </div>
        <p class="text-4xl font-black text-orange-600 mb-1">{{ stats.medium_risk }}</p>
        <p class="text-xs text-gray-400">条</p>
      </div>
      <div class="app-card flex flex-col items-center justify-center p-6 shadow-sm">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-blue-500">🔍</span>
          <span class="text-xs font-bold text-gray-500">待核查线索</span>
        </div>
        <p class="text-4xl font-black text-blue-600 mb-1">{{ stats.low_risk }}</p>
        <p class="text-xs text-gray-400">条</p>
      </div>
      <div class="app-card flex flex-col items-center justify-center p-6 shadow-sm">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-[#1A3A5C]">📋</span>
          <span class="text-xs font-bold text-gray-500">线索总数</span>
        </div>
        <p class="text-4xl font-black text-[#1A3A5C] mb-1">{{ cluesList.length }}</p>
        <p class="text-xs text-gray-400">条</p>
      </div>
    </div>

    <!-- 数据表 -->
    <div class="app-card p-8 shadow-md rounded-xl">
      <div class="flex justify-between items-center mb-6">
        <div class="flex items-center gap-3">
          <div class="w-1 h-6 bg-[#C0392B] rounded-full"></div>
          <div class="flex items-center gap-2">
            <span class="text-xl">🔍</span>
            <h3 class="text-lg font-bold text-[#1A3A5C]">案件可疑线索</h3>
          </div>
        </div>
        <div class="flex gap-2">
          <el-button size="small" :icon="Download" style="color: #1A3A5C; border-color: #D0D5DD"
            class="!rounded-md">导出报告</el-button>
        </div>
      </div>

      <div class="flex gap-4 mb-6 items-center">
        <el-input v-model="searchText" placeholder="搜索线索内容/罪名" :prefix-icon="Search" class="!w-[300px]" size="default"
          clearable />
        <el-select v-model="filterType" placeholder="线索类型" class="!w-[180px]" size="default" clearable>
          <el-option label="主观明知" value="主观明知" />
          <el-option label="价格异常" value="价格异常" />
          <el-option label="物流异常" value="物流异常" />
        </el-select>
        <el-button @click="resetFilter" class="px-6">重置</el-button>
      </div>

      <el-table :data="filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize)" stripe
        class="data-table" v-loading="loading">
        <el-table-column prop="clue_type" label="线索类型" min-width="120">
          <template #default="{ row }">
            <span class="px-3 py-1 rounded text-xs font-bold" :style="{
              background: row.clue_type === '主观明知' ? '#EEF2FF' : row.clue_type === '价格异常' ? '#FFF1F2' : '#F0FDF4',
              color: row.clue_type === '主观明知' ? '#4F46E5' : row.clue_type === '价格异常' ? '#E11D48' : '#16A34A',
            }">
              {{ row.clue_type }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="evidence_text" label="线索内容" min-width="280" show-overflow-tooltip>
          <template #default="scope">
            <span class="text-[#334155] leading-relaxed">{{ scope.row.evidence_text }}</span>
          </template>
        </el-table-column>
        <el-table-column label="关键特征" min-width="160">
          <template #default="{ row }">
            <div class="flex flex-wrap gap-1.5">
              <span v-if="typeof row.hit_keywords === 'string'"
                class="px-2 py-0.5 bg-[#FEF2F2] text-[#DC2626] text-[11px] font-bold rounded border border-[#FECACA]">
                {{ row.hit_keywords }}
              </span>
              <span v-else v-for="k in row.hit_keywords" :key="k"
                class="px-2 py-0.5 bg-[#FEF2F2] text-[#DC2626] text-[11px] font-bold rounded border border-[#FECACA]">
                {{ k }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="score" label="风险指数" min-width="100" align="center">
          <template #default="{ row }">
            <span class="font-black text-sm" :class="row.score >= 8 ? 'text-red-600' : 'text-orange-600'">{{ row.score
              }}/10</span>
          </template>
        </el-table-column>
        <el-table-column prop="severity_level" label="严重程度" min-width="110">
          <template #default="{ row }">
            <span class="px-2 py-0.5 rounded text-xs font-bold" :style="{
              background: row.severity_level === '刑事犯罪' ? '#FEF2F2' : '#F0FDF4',
              color: row.severity_level === '刑事犯罪' ? '#DC2626' : '#16A34A',
            }">{{ row.severity_level }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="crime_type" label="涉嫌罪名" min-width="200" show-overflow-tooltip>
          <template #default="scope">
            <span class="text-gray-600 italic text-sm">{{ scope.row.crime_type }}</span>
          </template>
        </el-table-column>
      </el-table>
      <div class="flex justify-end mt-4">
        <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :page-sizes="[10, 20, 50]"
          :total="filteredList.length" layout="total, sizes, prev, pager, next, jumper" background />
      </div>
    </div>
  </div>
</template>
