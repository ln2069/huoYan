<script setup lang="ts">
import { ref, shallowRef, computed, onMounted, nextTick, onBeforeUnmount, watch } from "vue";
import * as echarts from "echarts";
import type { ECharts } from "echarts";
import { ElButton, ElInput, ElSelect, ElMessage } from "element-plus";
import { Search } from "@element-plus/icons-vue";
import { repositories } from "@/services";
import type { UpstreamGraph, CrossCaseGraph } from "@/entities/graph";
import { useRoute, useRouter } from "vue-router";
import { maskPhone, maskName } from "@/utils/masking";

const route = useRoute();
const router = useRouter();

const graphTab = ref<"upstream" | "crosscase">("upstream");
const selectedCaseId = ref("");
const selectedNode = ref<any | null>(null);
const nodeSearch = ref("");
const crossRef = ref<HTMLDivElement | null>(null);
const upstreamRef = ref<HTMLDivElement | null>(null);
const crossChart = shallowRef<ECharts | null>(null);
const upstreamChart = shallowRef<ECharts | null>(null);
const resizeHandlers = new Set<() => void>();

const crossGraph = ref<CrossCaseGraph | null>(null);
const upstreamData = ref<UpstreamGraph | null>(null);
const cases = ref<any[]>([]);
const personLedger = ref<any[]>([]);
const recidivismData = ref<any>(null);
const detailedUpstream = ref<any[]>([]);
const detailedDownstream = ref<any[]>([]);
const detailedCoreSuspects = ref<any[]>([]);
const totalAmount = ref(0);
const illegalIncome = ref(0);
const totalTransactions = ref(0);
const hiddenSources = ref(0);
const coreCount = ref(0);
const upstreamCount = ref(0);
const downstreamCount = ref(0);
const loading = ref(false);
const selectedCaseChain = ref<any>(null);
const currentUpstreamCase = computed(() => cases.value.find((c) => c.id === selectedCaseId.value));

const upstreamStats = computed(() => {
  const d = upstreamData.value;
  if (!d) return { nodes: 0, links: 0, suppliers: 0, buyers: 0 };

  // 统计图中实际存在的唯一节点
  const uniqueNodes = new Set();
  if (d.center) uniqueNodes.add((d.center as any).id || d.center.name);
  d.suppliers.forEach((n: any) => uniqueNodes.add(n.id || n.name));
  d.buyers.forEach((n: any) => uniqueNodes.add(n.id || n.name));
  d.middle.forEach((n: any) => uniqueNodes.add(n.id || n.name));

  return {
    nodes: uniqueNodes.size,
    links: d.links.length,
    suppliers: detailedUpstream.value.length,
    buyers: detailedDownstream.value.length,
  };
});

const upstreamSuppliers = computed(() => detailedUpstream.value);
const upstreamBuyers = computed(() => detailedDownstream.value);

const graphStats = ref({ nodes: 0, links: 0, keyNodes: 0, linkedCases: 0 });

// 加载案件列表
async function loadCases() {
  try {
    const response = await repositories.cases.listCases({
      limit: 100,
      offset: 0,
    });
    const list = Array.isArray(response) ? response : ((response as any)?.list || (response as any)?.data?.list || []);

    cases.value = list.map((c: any) => ({
      id: isNaN(Number(c.id)) ? c.id : Number(c.id),
      case_no: c.case_no,
      suspect: c.suspect_name || '未知嫌疑人'
    }));

    const queryCaseId = route.query.caseId as string;
    if (queryCaseId) {
      const numId = Number(queryCaseId);
      selectedCaseId.value = String(isNaN(numId) ? queryCaseId : numId);
    } else if (cases.value.length > 0 && !selectedCaseId.value) {
      selectedCaseId.value = cases.value[0].id;
    }

    if (selectedCaseId.value && graphTab.value === "upstream") {
      reloadUpstream();
    }
  } catch (error) {
    console.error('加载案件列表失败:', error);
  }
}

// 加载跨案关联数据
async function loadCrossCaseGraph() {
  loading.value = true;
  try {
    const response = await repositories.relations.getCrossCaseGraph();
    // 后端返回的是 List[Dict] 结构，每个 dict 包含 person, case_ids, case_details
    const connections: any[] = Array.isArray(response)
      ? response
      : (((response as any).code === 0 ? (response as any).data : response) as any[]) || [];

    if (connections.length === 0) {
      crossGraph.value = { nodes: [], links: [] };
      graphStats.value = { nodes: 0, links: 0, keyNodes: 0, linkedCases: 0 };
      return;
    }

    const nodesMap = new Map();
    const links: any[] = [];
    const caseIdsSet = new Set<number>();

    connections.forEach((conn: any) => {
      // 1. 添加人员节点
      const personId = `person_${conn.person}`;
      if (!nodesMap.has(personId)) {
        nodesMap.set(personId, {
          id: personId,
          name: conn.person,
          category: '人员',
          symbolSize: 40 + (conn.case_count * 10),
          role: conn.role || '',
          itemStyle: { color: '#C0392B' },
          count: conn.case_count,
          // 保存原始数据，确保跨案模式下也能看到证据
          evidence: conn.evidence || null,
          crime_type: conn.crime_type,
          behavior_role: conn.behavior_role,
          keyword_roles: conn.keyword_roles || []
        });
      }

      // 2. 处理关联案件
      conn.case_ids.forEach((caseId: number, idx: number) => {
        caseIdsSet.add(caseId);
        const caseDetail = conn.case_details?.[idx];
        const caseNodeId = `case_${caseId}`;

        if (!nodesMap.has(caseNodeId)) {
          nodesMap.set(caseNodeId, {
            id: caseNodeId,
            name: caseDetail?.case_no || `案件${caseId}`,
            category: '关联案件',
            symbolSize: 50,
            itemStyle: { color: '#1A3A5C' },
            isCase: true,
            count: 0,
            info: caseDetail?.brand ? `涉及品牌: ${caseDetail.brand}` : ''
          });
        }

        const cNode = nodesMap.get(caseNodeId);
        if (cNode) cNode.count++;

        // 3. 建立连线 (人员 -> 案件)
        links.push({
          source: personId,
          target: caseNodeId,
          label: { show: true, formatter: "涉案" }
        });
      });
    });

    crossGraph.value = {
      nodes: Array.from(nodesMap.values()),
      links: links
    };

    graphStats.value = {
      nodes: crossGraph.value.nodes.length,
      links: crossGraph.value.links.length,
      keyNodes: connections.length,
      linkedCases: caseIdsSet.size
    };

    nextTick(() => {
      initCrossChart();
    });
  } catch (error) {
    ElMessage.error("获取跨案关联数据失败，请稍后重试");
    console.error("获取跨案关联数据失败:", error);
  } finally {
    loading.value = false;
  }
}

async function loadPersonLedger() {
  try {
    const response = await repositories.relations.getPersonLedger();
    const list = Array.isArray(response) ? response : (response as any)?.data || [];
    personLedger.value = list;
  } catch (error) {
    console.error('加载人员台账数据失败:', error);
  }
}

watch(selectedNode, async (node) => {
  if (node && node.name) {
    if (node.isCase) {
      // 案件节点：加载上下游关系
      const caseId = node.id.replace('case_', '');
      try {
        const response = await repositories.relations.getUpstreamGraph({ caseId: String(caseId) });
        selectedCaseChain.value = (response as any).data || response;
      } catch (error) {
        console.error("加载案件上下游关系失败:", error);
        selectedCaseChain.value = null;
      }
      recidivismData.value = null;
    } else {
      // 人员节点：加载累犯情报
      try {
        const response = await repositories.relations.getRecidivism(node.name);
        recidivismData.value = (response as any).data || response;
      } catch (error) {
        console.error("加载累犯情报失败:", error);
        recidivismData.value = null;
      }
      selectedCaseChain.value = null;
    }
  } else {
    recidivismData.value = null;
    selectedCaseChain.value = null;
  }
});

const selectedNodeDetail = computed(() => {
  if (!selectedNode.value) return null;

  // 1. 尝试从单案全链的详细列表中查找
  const evidenceSource = [
    ...detailedUpstream.value,
    ...detailedDownstream.value,
    ...detailedCoreSuspects.value
  ].find(p => p.name === selectedNode.value.name || p.name === selectedNode.value.fullName);

  const fromLedger = personLedger.value.find(p => p.name === selectedNode.value.name);

  // 2. 聚合证据 (优先取详细列表，次之取节点自带的聚合证据)
  const finalEvidence = evidenceSource?.evidence || selectedNode.value.evidence || null;

  return {
    ...selectedNode.value,
    phone: fromLedger?.phone || selectedNode.value.phone,
    count: fromLedger?.linked_cases || selectedNode.value.count || 0,
    amount: fromLedger?.illegal_business_amount || evidenceSource?.total_out_amount || evidenceSource?.amount || selectedNode.value.amount || 0,
    info: fromLedger?.info || selectedNode.value.info,
    isRecidivist: recidivismData.value?.is_recidivist,
    previousCases: recidivismData.value?.previous_cases || [],
    relatedCasesDetail: recidivismData.value?.related_cases || [],
    suggestion: recidivismData.value?.suggestion,
    // 证据链数据
    evidence: finalEvidence,
    crimeType: evidenceSource?.crime_type || selectedNode.value.crime_type,
    behaviorRole: evidenceSource?.behavior_role || selectedNode.value.behavior_role,
    keywordRoles: evidenceSource?.keyword_roles || selectedNode.value.keyword_roles || [],
    moneyIn: selectedNode.value.money_in,
    moneyOut: selectedNode.value.money_out,
    commFrequency: selectedNode.value.comm_frequency,
    role: fromLedger?.role || evidenceSource?.role || evidenceSource?.behavior_role || selectedNode.value.role || null
  };
});

// 加载上游关系数据
async function loadUpstreamGraph(caseId: string | number) {
  if (!caseId) return;
  loading.value = true;
  try {
    // 使用 Promise.allSettled 或单独处理以防部分接口未实现导致全屏报错
    const [rawRes, upListRes, downListRes, coreListRes] = await Promise.allSettled([
      repositories.relations.getUpstreamGraph({ caseId: String(caseId) }),
      repositories.relations.getUpstreamList(caseId),
      repositories.relations.getDownstreamList(caseId),
      repositories.relations.getCoreSuspectsList(caseId)
    ]);

    const raw = rawRes.status === 'fulfilled' ? rawRes.value : null;
    const upList = upListRes.status === 'fulfilled' ? upListRes.value : [];
    const downList = downListRes.status === 'fulfilled' ? downListRes.value : [];
    const coreList = coreListRes.status === 'fulfilled' ? coreListRes.value : [];

    if (!raw) {
      throw new Error("关键图谱数据获取失败");
    }

    detailedUpstream.value = (upList as any).data || upList || [];
    detailedDownstream.value = (downList as any).data || downList || [];
    detailedCoreSuspects.value = (coreList as any).data || coreList || [];

    console.log("Relations API Response:", raw);

    // 兼容 {code, data} 和 直接返回数据 两种模式
    const resData = ((raw as any).code === 0 && (raw as any).data) ? (raw as any).data : (raw as any);

    // 更新统计摘要
    totalAmount.value = resData.statistics?.total_transaction_amount || resData.amount_summary?.total_transaction_amount || 0;
    illegalIncome.value = resData.amount_summary?.illegal_income || 0;
    totalTransactions.value = resData.statistics?.total_transaction_count || 0;
    hiddenSources.value = resData.statistics?.hidden_source_count || 0;

    upstreamCount.value = resData.upstream_count || 0;
    downstreamCount.value = resData.downstream_count || 0;
    coreCount.value = resData.core_count || 0;

    // 如果后端直接返回了 relation_graph 拓扑结构 (包含 nodes 和 edges)
    if (resData.relation_graph) {
      const rawNodes = resData.relation_graph.nodes || [];
      const rawLinks = resData.relation_graph.edges || resData.relation_graph.links || [];

      // 1. 节点清洗与双重映射映射 (支持 ID 和 Name 两种索引)
      const mergedNodesMap = new Map();
      const lookup = new Map(); // 原始 ID 或 原始名称 -> 干净名称的映射

      rawNodes.forEach((n: any) => {
        const rawId = n.id?.toString() || "";
        const rawName = n.name || n.label || "";
        const full = rawName || rawId;

        // 提取干净的显示名称
        const match = full.match(/^(.+?)\s*\(.*\)$/);
        const cleanName = match ? match[1] : full;

        // 建立双重索引映射，确保连线能找回来
        if (rawId) lookup.set(rawId, cleanName);
        if (rawName) lookup.set(rawName, cleanName);

        if (!mergedNodesMap.has(cleanName)) {
          mergedNodesMap.set(cleanName, {
            ...n,
            id: cleanName,   // 强制 ID 为干净名称，方便连线匹配
            name: cleanName,
            fullName: full,
            category: (() => {
              // 优先使用后端返回的布尔标志位
              if (n.is_core) return '核心嫌疑人';
              if (n.is_upstream) return '上游供应商';
              if (n.is_downstream) return '下游买家';
              // 兼容 role 字符串字段
              const r = (n.role || '').toString();
              if (r.includes('核心') || r.includes('嫌疑')) return '核心嫌疑人';
              if (r.includes('上游') || r.includes('供货') || r.includes('供应')) return '上游供应商';
              if (r.includes('下游') || r.includes('买家') || r.includes('销售') || r.includes('购货')) return '下游买家';
              return '其他节点';
            })()
          });
        } else {
          const existing = mergedNodesMap.get(cleanName);
          if (n.role && !existing.role.includes(n.role)) existing.role += `, ${n.role}`;
          if (n.info) existing.info = (existing.info || '') + ' | ' + n.info;

          // 关键修复：合并证据链数据
          if (n.evidence) {
            if (!existing.evidence) existing.evidence = { transactions: [], logistics: [], communications: [] };
            if (n.evidence.transactions) existing.evidence.transactions.push(...n.evidence.transactions);
            if (n.evidence.logistics) existing.evidence.logistics.push(...n.evidence.logistics);
            if (n.evidence.communications) existing.evidence.communications.push(...n.evidence.communications);
          }
        }
      });

      const nodes = Array.from(mergedNodesMap.values());

      // 2. 连线重定向与合并 (支持复杂的 ECharts 连线格式)
      const mergedLinksMap = new Map();

      rawLinks.forEach((e: any) => {
        const typeMap: Record<string, string> = {
          'money': '资金往来', 'logistics': '物流发货', 'chat': '通讯联系',
          'transfer': '资金转账', 'supply': '供货关系', 'sale': '销售关系'
        };
        const chineseLabel = typeMap[e.type] || e.label?.formatter || e.type || "关联";

        // 智能解析 source/target (兼容对象格式或字符串 ID 格式)
        const sRaw = (e.source?.id || e.source?.name || e.source).toString();
        const tRaw = (e.target?.id || e.target?.name || e.target).toString();

        const src = lookup.get(sRaw) || sRaw;
        const tgt = lookup.get(tRaw) || tRaw;

        // 只有当源和目标都存在时才建立连线
        if (src && tgt && src !== tgt) {
          const linkKey = `${src}->${tgt}`;
          if (!mergedLinksMap.has(linkKey)) {
            mergedLinksMap.set(linkKey, {
              ...e,
              source: src,
              target: tgt,
              name: chineseLabel,
              types: [chineseLabel]
            });
          } else {
            const existing = mergedLinksMap.get(linkKey);
            if (!existing.types.includes(chineseLabel)) {
              existing.types.push(chineseLabel);
              existing.name = existing.types.join(' + ');
            }
          }
        }
      });

      const links = Array.from(mergedLinksMap.values()).map(l => ({
        ...l,
        label: { show: true, formatter: l.name }
      }));

      const centerNode = nodes.find((n: any) => n.is_core || (n.role || '').includes('核心')) || nodes[0];

      if (!centerNode) {
        upstreamData.value = null;
        return;
      }

      upstreamData.value = {
        caseId: caseId.toString(),
        center: centerNode,
        suppliers: nodes.filter((n: any) => {
          // 排除中心节点和核心嫌疑人
          if (n === centerNode || n.is_core) return false;
          // 优先使用布尔标志位判断
          if (n.is_upstream === true) return true;
          // 兼容 role 字符串字段
          const r = (n.role || '').toString();
          return r.includes('上游') || r.includes('供货') || r.includes('供应');
        }),
        buyers: nodes.filter((n: any) => {
          // 排除中心节点和核心嫌疑人
          if (n === centerNode || n.is_core) return false;
          // 优先使用布尔标志位判断
          if (n.is_downstream === true) return true;
          // 兼容 role 字符串字段
          const r = (n.role || '').toString();
          return r.includes('下游') || r.includes('买家') || r.includes('销售') || r.includes('购货');
        }),
        middle: nodes.filter((n: any) => {
          // 排除中心节点
          if (n === centerNode) return false;
          // 如果有明确的上游/下游布尔标志位，不放入 middle
          if (n.is_upstream === true || n.is_downstream === true) return false;
          // 兼容 role 字符串字段：已知上游/下游角色不放入 middle
          const r = (n.role || '').toString();
          const isUpstreamOrDownstream = r.includes('上游') || r.includes('供货') || r.includes('供应') || r.includes('下游') || r.includes('买家') || r.includes('销售') || r.includes('购货');
          return !isUpstreamOrDownstream;
        }),
        links: links
      };
    } else {
      // 备选逻辑：如果后端只返回了 upstream/downstream/core_suspects 列表
      const suppliers = (resData.upstream || []).map((s: any) => ({
        name: s.name, role: s.role, amount: s.amount, info: `供货金额: ${s.amount || 0}元`,
        itemStyle: { color: "#1E293B" }, symbolSize: 55
      }));
      const buyers = (resData.downstream || []).map((b: any) => ({
        name: b.name, role: b.role, amount: b.amount, info: `购买金额: ${b.amount || 0}元`,
        itemStyle: { color: "#27AE60" }, symbolSize: 55
      }));
      const coreSuspects = (resData.core_suspects || []).map((c: any) => ({
        name: c.name, role: c.role, amount: c.amount,
        itemStyle: { color: "#C0392B" }, symbolSize: 70
      }));

      const center = coreSuspects.length > 0 ? coreSuspects[0] : null;

      if (!center) {
        upstreamData.value = null;
        return;
      }
      const middle = coreSuspects.slice(1);

      const links: any[] = [];
      suppliers.forEach((s: any) => {
        links.push({ source: s.name, target: center.name, label: { show: true, formatter: "供货" }, lineStyle: { color: "#BDD0E6", width: 2 } });
      });
      buyers.forEach((b: any) => {
        links.push({ source: center.name, target: b.name, label: { show: true, formatter: "销售" }, lineStyle: { color: "#A8D8A8", width: 2 } });
      });
      middle.forEach((m: any) => {
        links.push({ source: m.name, target: center.name, label: { show: true, formatter: "资金" }, lineStyle: { color: "#F5C6C2", width: 2, type: 'dashed' } });
      });

      upstreamData.value = {
        caseId: caseId.toString(),
        center: { ...center, category: '核心嫌疑人' },
        suppliers: suppliers.map((s: any) => ({ ...s, category: '上游供应商' })),
        buyers: buyers.map((b: any) => ({ ...b, category: '下游买家' })),
        middle: middle.map((m: any) => ({ ...m, category: '其他节点' })),
        links: links
      };
    }
  } catch (error) {
    ElMessage.error("获取上游关系数据失败，请稍后重试");
    console.error("获取上游关系数据失败:", error);
  } finally {
    loading.value = false;
  }
}

function buildGraphOption(nodes: any[], links: any[]) {
  return {
    backgroundColor: '#1E293B', // 展示区域底色改为深灰色 (Slate-800)
    tooltip: {
      trigger: "item" as const,
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: "#334155",
      borderWidth: 1,
      padding: [12, 16],
      textStyle: { color: "#F8FAFC", fontSize: 13 },
      extraCssText: "box-shadow: 0 10px 25px rgba(0,0,0,0.5); border-radius: 8px;",
      formatter: (params: any) => {
        if (params.dataType === 'node') {
          const d = params.data;
          return `<div class="font-bold text-blue-400 mb-2" style="font-size: 15px; border-bottom: 1px solid #334155; padding-bottom: 4px">
                    ${d.isCase ? '📁 案件档案' : '👤 人员情报'}
                  </div>
                  <div class="mb-1"><span class="opacity-60">名称:</span> <span class="font-bold">${d.name}</span></div>
                  <div class="mb-1"><span class="opacity-60">角色:</span> <span class="text-yellow-500">${d.role || d.category || '未定义'}</span></div>
                  ${d.count ? `<div class="mb-1"><span class="opacity-60">关联度:</span> ${d.count}</div>` : ''}
                  ${d.info ? `<div class="mt-2 text-xs opacity-80 bg-slate-800 p-2 rounded">${d.info}</div>` : ''}`;
        }
        const l = params.data;
        return `<div class="text-xs">
                  <span class="opacity-60">关系类型:</span> 
                  <span class="font-bold text-blue-300">${l.name || '直接关联'}</span>
                </div>`;
      }
    },
    legend: [
      {
        data: ['核心嫌疑人', '上游供应商', '下游买家', '其他节点', '关联案件', '人员'],
        orient: 'horizontal',
        left: 20,
        top: 10,
        itemGap: 20,
        textStyle: { color: '#94A3B8', fontSize: 12 },
        itemWidth: 12,
        itemHeight: 12
      }
    ],
    series: [
      {
        type: "graph" as const,
        layout: "force" as const,
        roam: true,
        draggable: true,
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: [5, 10],
        categories: [
          {
            name: '核心嫌疑人',
            symbolSize: 90,
            itemStyle: { color: '#C0392B', borderColor: '#FFFFFF', borderWidth: 2, shadowBlur: 12, shadowColor: 'rgba(0,0,0,0.3)', shadowOffsetY: 4 }
          },
          {
            name: '上游供应商',
            symbolSize: 80,
            itemStyle: { color: '#1A3A5C', borderColor: '#FFFFFF', borderWidth: 1.5, shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)', shadowOffsetY: 3 }
          },
          {
            name: '下游买家',
            symbolSize: 80,
            itemStyle: { color: '#27AE60', borderColor: '#FFFFFF', borderWidth: 1.5, shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)', shadowOffsetY: 3 }
          },
          {
            name: '其他节点',
            symbolSize: 70,
            itemStyle: { color: '#C0392B', borderColor: '#FFFFFF', borderWidth: 1.5, shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.2)', shadowOffsetY: 2 }
          },
          {
            name: '关联案件',
            symbolSize: 85,
            itemStyle: { color: '#1A3A5C', borderColor: '#FFFFFF', borderWidth: 2 }
          },
          {
            name: '人员',
            symbolSize: 75,
            itemStyle: { color: '#C0392B', borderColor: '#FFFFFF', borderWidth: 1.5 }
          }
        ],
        label: {
          show: true,
          position: "inside",
          formatter: (p: any) => {
            const full = p.data?.name || "";
            // 仅提取主姓名，剔除括号内的账号信息
            const match = full.match(/^(.+?)\s*\(.*\)$/);
            return match ? match[1] : full;
          },
          textStyle: {
            fontSize: 14,
            fontWeight: 'bold',
            color: '#FFFFFF',
            align: 'center'
          }
        },
        edgeLabel: {
          show: true,
          fontSize: 12, // 字体加大到 12px
          fontWeight: 'bold',
          color: '#38BDF8',
          backgroundColor: '#0F172A',
          borderColor: '#334155',
          borderWidth: 1,
          padding: [4, 8], // 增加内边距
          borderRadius: 4,
          formatter: (p: any) => p.data?.name || "",
        },
        lineStyle: {
          color: "#FFFFFF", // 默认即为纯白色
          width: 3,        // 默认加粗
          curveness: 0.2,
          opacity: 1       // 彻底取消透明，保持最高亮度
        },
        force: {
          repulsion: 3000, // 提升互斥力至 3000
          edgeLength: [300, 600], // 连线长度范围调整为 300 - 600
          gravity: 0.1,
          layoutAnimation: true
        },
        emphasis: {
          focus: "none" as const, // 取消“全场变暗”效果，保持背景节点亮度
          lineStyle: { width: 5, opacity: 1, color: '#FFFFFF' },
          itemStyle: { shadowBlur: 30, shadowColor: 'rgba(255,255,255,0.4)', borderWidth: 3 }
        },
        data: nodes,
        links: links.map((l: any) => {
          const relationName = l.label?.formatter || l.type || '关联';
          return {
            ...l,
            name: relationName,
            lineStyle: {
              ...l.lineStyle,
              type: relationName.includes('物流') ? 'dashed' : 'solid'
            }
          };
        }),
      },
    ],
  };
}

function initGraph(
  chartRef: HTMLDivElement | null,
  nodes: any[],
  links: any[],
  chartType: "cross" | "upstream"
) {
  if (!chartRef) return;

  let instance = chartType === "cross" ? crossChart.value : upstreamChart.value;

  if (!instance) {
    instance = echarts.init(chartRef);
    if (chartType === "cross") crossChart.value = instance;
    else upstreamChart.value = instance;

    // 仅在初始化时绑定事件
    instance.on("click", (params: any) => {
      if (params.dataType === "node") {
        selectedNode.value = params.data;
      }
    });

    const resize = () => {
      if (instance && !instance.isDisposed()) {
        instance.resize();
      }
    };
    window.addEventListener("resize", resize);
    resizeHandlers.add(resize);
  }

  // 使用 setOption 更新数据，而不是销毁重建
  instance.setOption(buildGraphOption(nodes, links));
}

function initCrossChart() {
  if (!crossRef.value || !crossGraph.value) return;
  initGraph(crossRef.value, crossGraph.value.nodes, crossGraph.value.links, "cross");
}

function initUpstreamChart() {
  if (!upstreamRef.value || !upstreamData.value) return;
  const d = upstreamData.value;

  // 核心：通过 Map 确保节点 ID/Name 绝对唯一，解决 ECharts "duplicate name or id" 报错
  const nodeMap = new Map();

  // 按照优先级加入：中心节点 > 供应商 > 买家 > 其他
  const addNode = (n: any) => {
    if (!n) return;
    const key = n.id || n.name;
    if (key && !nodeMap.has(key)) {
      nodeMap.set(key, { ...n });
    }
  };

  addNode(d.center);
  d.suppliers.forEach(addNode);
  d.buyers.forEach(addNode);
  d.middle.forEach(addNode);

  const allNodes = Array.from(nodeMap.values());
  initGraph(upstreamRef.value, allNodes, d.links, "upstream");
}

// --- 生命周期与核心监听 ---

// 1. 监听数据变化，自动渲染图表
watch(upstreamData, (newData) => {
  if (newData && graphTab.value === "upstream") {
    nextTick(() => initUpstreamChart());
  }
}, { deep: true });

watch(crossGraph, (newData) => {
  if (newData && graphTab.value === "crosscase") {
    nextTick(() => initCrossChart());
  }
}, { deep: true });

// 2. 监听路由变化，同步页签状态
watch(
  () => route.path,
  (path) => {
    if (path.includes('/relations/upstream')) {
      graphTab.value = 'upstream';
      if (selectedCaseId.value) reloadUpstream();
    } else if (path.includes('/relations/crosscase')) {
      graphTab.value = 'crosscase';
      if (!crossGraph.value) loadCrossCaseGraph();
    }
  },
  { immediate: true }
);

// 3. 页面挂载：加载基础数据
onMounted(async () => {
  await loadCases();
  loadPersonLedger();

  const handleResize = () => {
    crossChart.value?.resize();
    upstreamChart.value?.resize();
  };
  window.addEventListener("resize", handleResize);
  resizeHandlers.add(handleResize);
});

// 4. 页面卸载：释放资源
onBeforeUnmount(() => {
  resizeHandlers.forEach(handler => window.removeEventListener("resize", handler));
  resizeHandlers.clear();

  if (crossChart.value && !crossChart.value.isDisposed()) crossChart.value.dispose();
  if (upstreamChart.value && !upstreamChart.value.isDisposed()) upstreamChart.value.dispose();
});

// --- 工具函数 ---

async function reloadUpstream() {
  if (!selectedCaseId.value) return;
  await loadUpstreamGraph(selectedCaseId.value);
}

async function handleGlobalCaseChange() {
  if (graphTab.value === 'upstream') {
    reloadUpstream();
  } else {
    // 在跨案关联图中定位该案件
    const caseNodeId = `case_${selectedCaseId.value}`;
    const found = crossGraph.value?.nodes.find(n => n.id === caseNodeId);
    if (found) {
      selectedNode.value = found;
    }
  }
}

function reloadCurrentGraph() {
  if (graphTab.value === 'upstream') reloadUpstream();
  else loadCrossCaseGraph();
}

function highlightSearch() {
  if (!nodeSearch.value.trim() || !crossGraph.value) return;
  const found = crossGraph.value.nodes.find((n) => n.name.includes(nodeSearch.value.trim()));
  if (found) selectedNode.value = found;
}

function exportPng(which: "cross" | "upstream") {
  const chart = which === "cross" ? crossChart.value : upstreamChart.value;
  if (!chart) return;
  const url = chart.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#E8EEF4" });
  const a = document.createElement("a");
  a.href = url;
  a.download = `${which}-graph.png`;
  a.click();
}
</script>

<template>
  <div class="space-y-5">
    <!-- 全局头部：案件选择与操作 -->
    <div class="app-card p-5">
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold text-gray-500">当前案件:</span>
            <el-select v-model="selectedCaseId" size="default" style="width: 280px" @change="handleGlobalCaseChange">
              <el-option v-for="c in cases" :key="c.id" :label="c.case_no + ' — ' + c.suspect" :value="c.id" />
            </el-select>
          </div>
        </div>
        <div class="flex gap-2">
          <el-button size="small" style="color: #1A3A5C; border-color: #D0D5DD" @click="reloadCurrentGraph">
            🔄 刷新布局
          </el-button>
          <el-button size="small" type="primary" style="background: #1A3A5C; border-color: #1A3A5C"
            @click="exportPng(graphTab === 'crosscase' ? 'cross' : 'upstream')">
            导出可视化图
          </el-button>
        </div>
      </div>
    </div>

    <!-- ===== 上下游关系图 ===== -->
    <div v-show="graphTab === 'upstream'">
      <div class="grid grid-cols-5 gap-5">
        <div class="col-span-3">
          <div class="app-card p-5">
            <div class="flex justify-between items-center mb-4">
              <div class="flex gap-2">
                <el-input v-model="nodeSearch" placeholder="搜索节点..." size="small" style="width: 150px" />
                <el-button size="small" style="color: #1A3A5C; border-color: #D0D5DD"
                  @click="highlightSearch">节点检索</el-button>
                <el-button size="small" type="primary" style="background: #1A3A5C; border-color: #1A3A5C"
                  @click="exportPng('upstream')">导出 PNG</el-button>
              </div>
            </div>
            <div class="text-xs mb-2 mt-2" style="color: #aaa">💡 拖动节点定位 | 滚轮缩放 | 鼠标悬停查看详情</div>
            <div ref="upstreamRef" style="width: 100%; height: 600px"></div>
          </div>
        </div>

        <div class="col-span-2">
          <div class="app-card p-5">
            <div class="card-title flex justify-between items-center">
              <span>{{ selectedNode ? '节点情报详情' : '产业链统计' }}</span>
              <el-button v-if="selectedNode" size="small" @click="selectedNode = null">返回统计</el-button>
            </div>

            <!-- 情报详情面板 -->
            <div v-if="selectedNodeDetail">
              <div class="p-4 rounded-lg mb-4" style="background: #FDECEA; border: 2px solid #F5C6C2">
                <div class="flex justify-between items-center">
                  <div>
                    <p class="text-2xl font-extrabold" style="color: #C0392C">
                      {{ selectedNodeDetail.isCase ? selectedNodeDetail.name : maskName(selectedNodeDetail.name) }}
                    </p>
                    <p class="text-sm mt-1" style="color: #888">{{ selectedNodeDetail.role || (selectedNodeDetail.isCase
                      ? '涉案案件' : '关联人员') }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-3xl font-black" style="color: #C0392B">{{ selectedNodeDetail.count }}</p>
                    <p class="text-xs" style="color: #888">{{ selectedNodeDetail.isCase ? '名关联人员' : '个关联案件' }}</p>
                  </div>
                </div>
              </div>

              <div class="space-y-1">
                <div v-if="selectedNodeDetail.role" class="info-item">
                  <span class="text-xs font-semibold" style="color: #888">身份角色</span>
                  <span class="tag-info">{{ selectedNodeDetail.role }}</span>
                </div>
                <div v-if="selectedNodeDetail.crimeType" class="info-item">
                  <span class="text-xs font-semibold" style="color: #888">涉嫌罪名</span>
                  <span class="text-xs" style="color: #555">{{ selectedNodeDetail.crimeType }}</span>
                </div>
                <div v-if="selectedNodeDetail.keywordRoles?.length" class="mt-2 flex gap-1 flex-wrap">
                  <span v-for="r in selectedNodeDetail.keywordRoles" :key="r"
                    class="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[10px]">
                    # {{ r }}
                  </span>
                </div>

                <!-- 资金往来 -->
                <div v-if="selectedNodeDetail.moneyIn !== undefined || selectedNodeDetail.moneyOut !== undefined"
                  class="mt-2 p-2 rounded bg-gray-50 border border-gray-100">
                  <div v-if="selectedNodeDetail.moneyIn !== undefined" class="flex justify-between text-xs mb-1">
                    <span style="color: #888">资金转入</span>
                    <span class="font-mono font-bold" style="color: #27AE60">+{{
                      selectedNodeDetail.moneyIn.toLocaleString() }}</span>
                  </div>
                  <div v-if="selectedNodeDetail.moneyOut !== undefined" class="flex justify-between text-xs">
                    <span style="color: #888">资金转出</span>
                    <span class="font-mono font-bold" style="color: #C0392B">-{{
                      selectedNodeDetail.moneyOut.toLocaleString() }}</span>
                  </div>
                </div>

                <div v-if="selectedNodeDetail.commFrequency" class="info-item">
                  <span class="text-xs font-semibold" style="color: #888">通讯频率</span>
                  <span class="text-sm font-bold" style="color: #1A3A5C">{{ selectedNodeDetail.commFrequency }}
                    次联络</span>
                </div>

                <div v-if="selectedNodeDetail.phone" class="info-item">
                  <span class="text-xs font-semibold" style="color: #888">联系电话</span>
                  <span class="text-sm font-mono" style="color: #555">{{ maskPhone(selectedNodeDetail.phone) }}</span>
                </div>
                <!-- 累犯情报 -->
                <div v-if="selectedNodeDetail.isRecidivist" class="info-item"
                  style="background: #FFF5F5; border-radius: 4px; padding: 4px 8px; margin-top: 8px">
                  <span class="text-xs font-bold" style="color: #C0392B">⚠ 累犯风险</span>
                  <span class="text-xs font-bold" style="color: #C0392B">该人员有同类违法前科</span>
                </div>
              </div>

              <!-- 证据链展示 (当前案情重心) -->
              <div v-if="selectedNodeDetail.evidence" class="mt-4">
                <p class="text-xs font-bold mb-2" style="color: #1A3A5C">
                  ⛓️ 关联证据 (共 {{ (selectedNodeDetail.evidence.transactions?.length || 0) +
                    (selectedNodeDetail.evidence.logistics?.length || 0) +
                    (selectedNodeDetail.evidence.communications?.length || 0) }} 条)
                </p>
                <div class="space-y-2">
                  <!-- 通讯证据 -->
                  <div v-if="selectedNodeDetail.evidence.communications?.length" class="space-y-2">
                    <p class="text-[11px] font-bold text-purple-800">💬 通讯记录 (展示前3条)</p>
                    <div v-for="(c, idx) in selectedNodeDetail.evidence.communications.slice(0, 3)" :key="idx"
                      class="p-2 rounded border border-purple-100" style="background: #F9F0FF">
                      <div class="flex justify-between items-start mb-1">
                        <span v-if="c.severity_level" class="px-1.5 py-0.5 rounded-full text-[9px] font-bold" :style="{
                          background: c.severity_level === '刑事犯罪' ? '#FEF2F2' : '#F0FDF4',
                          color: c.severity_level === '刑事犯罪' ? '#DC2626' : '#16A34A'
                        }">
                          {{ c.severity_level }}
                        </span>
                      </div>
                      <p class="text-[10px] text-purple-700">
                        <span class="font-bold">[{{ c.type }}]</span> {{ c.content }}
                        <span v-if="c.hit_keywords?.length" class="px-1 bg-red-100 text-red-500 rounded"> {{
                          c.hit_keywords.join(',') }}</span>
                      </p>
                      <p class="text-[9px] text-purple-400 mt-1 font-mono">{{ c.time }}</p>
                    </div>
                  </div>
                  <!-- 交易证据 -->
                  <div v-if="selectedNodeDetail.evidence.transactions?.length" class="space-y-2">
                    <p class="text-[11px] font-bold text-blue-800">💰 交易记录 (展示前3条)</p>
                    <div v-for="(t, idx) in selectedNodeDetail.evidence.transactions.slice(0, 3)" :key="idx"
                      class="p-2 rounded border border-blue-100" style="background: #F0F7FF">
                      <div class="text-[10px] text-blue-700 flex justify-between">
                        <span>{{ t.type }}: {{ parseFloat(t.amount || 0).toLocaleString() }}元</span>
                        <span class="font-mono">{{ t.time }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 往期案件详情 -->
              <div v-if="selectedNodeDetail.relatedCasesDetail?.length"
                class="mt-5 pt-4 border-t border-dashed border-gray-200">
                <p class="text-xs font-bold mb-2" style="color: #888">📂 往期案件档案 (共 {{
                  selectedNodeDetail.relatedCasesDetail.length }} 条)</p>
                <div class="space-y-1">
                  <div v-for="(rc, idx) in selectedNodeDetail.relatedCasesDetail.slice(0, 3)" :key="idx"
                    class="p-2 rounded bg-gray-50 border border-gray-100 text-[10px]">
                    <div class="flex justify-between font-bold text-gray-500">
                      <span>案件名称: {{ rc.case_no || rc.case_id || "未知" }}</span>
                      <span>{{ parseFloat(rc.amount || 0).toLocaleString() }}元</span>
                    </div>
                    <div class="text-gray-400 mt-0.5 font-mono">案发时间: {{ rc.time }}</div>
                  </div>
                </div>
              </div>


            </div>

            <!-- 产业链统计 -->
            <div v-else>
              <div v-if="currentUpstreamCase && upstreamData"
                class="p-4 rounded-lg mb-4 cursor-pointer transition-all hover:shadow-lg active:scale-[0.98]"
                style="background: #FDECEA; border: 2px solid #F5C6C2" @click="selectedNode = upstreamData.center">
                <div class="flex justify-between items-center">
                  <div>
                    <p class="text-2xl font-extrabold" style="color: #C0392C">{{ currentUpstreamCase.suspect }}</p>
                    <p class="text-sm" style="color: #888">核心嫌疑人</p>
                  </div>
                  <div class="text-right">
                    <p class="text-3xl font-black" style="color: #C0392B">{{ (illegalIncome / 10000).toFixed(2) }}</p>
                    <p class="text-xs" style="color: #888">预估非法获利(万元)</p>
                  </div>
                </div>
              </div>

              <!-- 核心统计指标 -->
              <div class="grid grid-cols-3 gap-3 mb-4">
                <div class="p-3 rounded-lg text-center" style="background: #EEF3F8; border: 1px solid #BDD0E6">
                  <p class="text-xl font-black" style="color: #1A3A5C">{{ upstreamCount }}</p>
                  <p class="text-[10px]" style="color: #888">上游供应商</p>
                </div>
                <div class="p-3 rounded-lg text-center" style="background: #FDECEA; border: 1px solid #F5C6C2">
                  <p class="text-xl font-black" style="color: #C0392B">{{ coreCount }}</p>
                  <p class="text-[10px]" style="color: #888">核心嫌疑人</p>
                </div>
                <div class="p-3 rounded-lg text-center" style="background: #F0FAF0; border: 1px solid #A8D8A8">
                  <p class="text-xl font-black" style="color: #27AE60">{{ downstreamCount }}</p>
                  <p class="text-[10px]" style="color: #888">下游买家</p>
                </div>
              </div>

              <div class="space-y-3">
                <div>
                  <p class="text-xs font-bold mb-2" style="color: #888">⬆️ 上游供货商</p>
                  <div class="space-y-2">
                    <div v-for="s in upstreamSuppliers" :key="s.name"
                      class="p-3 rounded-lg cursor-pointer transition-all hover:shadow-md"
                      style="background: #EEF3F8; border: 1px solid #BDD0E6" @click="selectedNode = s">
                      <div class="flex justify-between items-center">
                        <div class="flex items-center gap-2">
                          <div class="w-2 h-2 rounded-full" style="background: #1E293B"></div>
                          <span class="font-semibold text-sm" style="color: #1A3A5C">{{ s.name }}</span>
                        </div>
                      </div>
                      <p v-if="s.info" class="text-xs mt-1" style="color: #aaa">{{ s.info }}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p class="text-xs font-bold mb-2" style="color: #888">⬇️ 下游买家</p>
                  <div class="space-y-2">
                    <div v-for="b in upstreamBuyers" :key="b.name"
                      class="p-3 rounded-lg cursor-pointer transition-all hover:shadow-md"
                      style="background: #F0FAF0; border: 1px solid #A8D8A8" @click="selectedNode = b">
                      <div class="flex justify-between items-center">
                        <div class="flex items-center gap-2">
                          <div class="w-2 h-2 rounded-full" style="background: #27AE60"></div>
                          <span class="font-semibold text-sm" style="color: #27AE60">{{ b.name }}</span>
                        </div>
                      </div>
                      <p v-if="b.info" class="text-xs mt-1" style="color: #aaa">{{ b.info }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-5 pt-4" style="border-top: 1px solid #E8EEF4">
                <p class="text-xs font-bold mb-3" style="color: #888">图谱统计</p>
                <div class="grid grid-cols-2 gap-3">
                  <div class="p-3 rounded-lg text-center" style="background: #F5F8FA">
                    <p class="text-xl font-black" style="color: #1A3A5C">{{ upstreamStats.nodes }}</p>
                    <p class="text-xs" style="color: #888">节点总数</p>
                  </div>
                  <div class="p-3 rounded-lg text-center" style="background: #F5F8FA">
                    <p class="text-xl font-black" style="color: #1A3A5C">{{ upstreamStats.links }}</p>
                    <p class="text-xs" style="color: #888">关系链路</p>
                  </div>
                  <div class="p-3 rounded-lg text-center" style="background: #F5F8FA">
                    <p class="text-xl font-black" style="color: #1A3A5C">{{ totalTransactions }}</p>
                    <p class="text-[10px]" style="color: #888">累计关联笔数</p>
                  </div>
                  <div class="p-3 rounded-lg text-center" style="background: #FDECEA">
                    <p class="text-xl font-black" style="color: #C0392B">{{ hiddenSources }}</p>
                    <p class="text-[10px]" style="color: #888">潜在隐匿源</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 跨案关联拓扑 ===== -->
    <div v-show="graphTab === 'crosscase'">
      <div class="grid grid-cols-5 gap-5">
        <div class="col-span-3">
          <div class="app-card p-5">
            <div class="flex justify-between items-center mb-4">
              <div class="flex gap-2">
                <el-input v-model="nodeSearch" placeholder="搜索节点..." size="small" style="width: 150px" />
                <el-button size="small" style="color: #1A3A5C; border-color: #D0D5DD"
                  @click="highlightSearch">节点检索</el-button>
                <el-button size="small" type="primary" style="background: #1A3A5C; border-color: #1A3A5C"
                  @click="exportPng('cross')">导出 PNG</el-button>
              </div>
            </div>
            <div class="text-xs mb-2 mt-2" style="color: #aaa">💡 拖动节点定位 | 滚轮缩放 | 鼠标悬停查看详情</div>
            <div ref="crossRef" style="width: 100%; height: 600px"></div>
          </div>
        </div>

        <div class="col-span-2">
          <div class="app-card p-5">
            <div class="card-title">节点情报详情</div>

            <div v-if="!selectedNode" class="flex flex-col items-center justify-center py-24">
              <el-icon :size="48" style="color: #D0D5DD">
                <Search />
              </el-icon>
              <p class="mt-4 text-sm" style="color: #aaa">👆 请点击图谱中的节点</p>
              <p class="text-xs mt-1" style="color: #ccc">查看该人员的详细情报</p>
            </div>

            <div v-else>
              <div class="p-4 rounded-lg mb-4" style="background: #FDECEA; border: 2px solid #F5C6C2">
                <div class="flex justify-between items-center">
                  <div>
                    <p class="text-2xl font-extrabold" style="color: #C0392C">
                      {{ selectedNodeDetail.isCase ? selectedNodeDetail.name : maskName(selectedNodeDetail.name) }}
                    </p>
                    <p class="text-sm mt-1" style="color: #888">{{ selectedNodeDetail.role || (selectedNodeDetail.isCase
                      ? '涉案案件' : '关联人员') }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-3xl font-black" style="color: #C0392B">{{ selectedNodeDetail.count }}</p>
                    <p class="text-xs" style="color: #888">{{ selectedNodeDetail.isCase ? '名关联人员' : '个关联案件' }}</p>
                  </div>
                </div>
              </div>

              <div class="space-y-1">
                <div v-if="selectedNodeDetail.role" class="info-item">
                  <span class="text-xs font-semibold" style="color: #888">身份角色</span>
                  <span class="tag-info">{{ selectedNodeDetail.role }}</span>
                </div>
                <div v-if="selectedNodeDetail.crimeType" class="info-item">
                  <span class="text-xs font-semibold" style="color: #888">涉嫌罪名</span>
                  <span class="text-xs" style="color: #555">{{ selectedNodeDetail.crimeType }}</span>
                </div>
                <div v-if="selectedNodeDetail.keywordRoles?.length" class="mt-2 flex gap-1 flex-wrap">
                  <span v-for="r in selectedNodeDetail.keywordRoles" :key="r"
                    class="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[10px]">
                    # {{ r }}
                  </span>
                </div>

                <!-- 资金往来 -->
                <div v-if="selectedNodeDetail.moneyIn !== undefined || selectedNodeDetail.moneyOut !== undefined"
                  class="mt-2 p-2 rounded bg-gray-50 border border-gray-100">
                  <div v-if="selectedNodeDetail.moneyIn !== undefined" class="flex justify-between text-xs mb-1">
                    <span style="color: #888">资金转入</span>
                    <span class="font-mono font-bold" style="color: #27AE60">+{{
                      selectedNodeDetail.moneyIn.toLocaleString() }}</span>
                  </div>
                  <div v-if="selectedNodeDetail.moneyOut !== undefined" class="flex justify-between text-xs">
                    <span style="color: #888">资金转出</span>
                    <span class="font-mono font-bold" style="color: #C0392B">-{{
                      selectedNodeDetail.moneyOut.toLocaleString() }}</span>
                  </div>
                </div>

                <div v-if="selectedNodeDetail.commFrequency" class="info-item">
                  <span class="text-xs font-semibold" style="color: #888">通讯频率</span>
                  <span class="text-sm font-bold" style="color: #1A3A5C">{{ selectedNodeDetail.commFrequency }}
                    次联络</span>
                </div>

                <div v-if="selectedNodeDetail.caseId" class="info-item">
                  <span class="text-xs font-semibold" style="color: #888">所在案件</span>
                  <span class="text-sm">{{ selectedNodeDetail.caseId }}</span>
                </div>
                <div v-if="selectedNodeDetail.phone" class="info-item">
                  <span class="text-xs font-semibold" style="color: #888">联系电话</span>
                  <span class="text-sm font-mono" style="color: #555">{{ maskPhone(selectedNodeDetail.phone) }}</span>
                </div>

                <!-- 案件上下游关系 -->
                <div v-if="selectedNodeDetail.isCase && selectedCaseChain"
                  class="mt-4 pt-3 border-t border-dashed border-gray-200">
                  <p class="text-xs font-bold mb-2" style="color: #1A3A5C">⛓️ 案件上下游关系</p>
                  <div class="grid grid-cols-2 gap-2">
                    <div v-if="selectedCaseChain.upstream?.length"
                      class="p-2 rounded border border-slate-100 bg-slate-50">
                      <p class="text-[10px] font-bold text-slate-800 mb-1">⬆️ 供应商 ({{ selectedCaseChain.upstream.length
                        }})</p>
                      <div v-for="(item, idx) in selectedCaseChain.upstream.slice(0, 3)" :key="idx"
                        class="text-[9px] text-slate-500 truncate">
                        {{ item.name }}
                      </div>
                    </div>
                    <div v-if="selectedCaseChain.downstream?.length"
                      class="p-2 rounded border border-green-50 bg-green-50">
                      <p class="text-[10px] font-bold text-green-800 mb-1">⬇️ 买家 ({{ selectedCaseChain.downstream.length
                        }})</p>
                      <div v-for="(item, idx) in selectedCaseChain.downstream.slice(0, 3)" :key="idx"
                        class="text-[9px] text-green-600 truncate">
                        {{ item.name }}
                      </div>
                    </div>
                  </div>
                  <div v-if="!selectedCaseChain.upstream?.length && !selectedCaseChain.downstream?.length"
                    class="text-xs text-center py-2 text-gray-400">
                    暂无链条数据
                  </div>
                </div>
                <!-- 累犯情报 -->
                <div v-if="selectedNodeDetail.isRecidivist" class="info-item"
                  style="background: #FFF5F5; border-radius: 4px; padding: 4px 8px; margin-top: 8px">
                  <span class="text-xs font-bold" style="color: #C0392B">⚠ 累犯风险</span>
                  <span class="text-xs font-bold" style="color: #C0392B">该人员有同类违法前科</span>
                </div>
              </div>

              <!-- 证据链展示 (当前案情重心) -->
              <div v-if="selectedNodeDetail.evidence" class="mt-4">
                <p class="text-xs font-bold mb-2" style="color: #1A3A5C">
                  ⛓️ 关联证据 (共 {{ (selectedNodeDetail.evidence.transactions?.length || 0) +
                    (selectedNodeDetail.evidence.logistics?.length || 0) +
                    (selectedNodeDetail.evidence.communications?.length || 0) }} 条)
                </p>
                <div class="space-y-2">
                  <!-- 交易证据 -->
                  <div v-if="selectedNodeDetail.evidence.transactions?.length"
                    class="p-2 rounded border border-blue-100" style="background: #F0F7FF">
                    <p class="text-[11px] font-bold text-blue-800 mb-1">💰 交易记录 (展示前3条)</p>
                    <div v-for="(t, idx) in selectedNodeDetail.evidence.transactions.slice(0, 3)" :key="idx"
                      class="text-[10px] text-blue-700 flex justify-between">
                      <span>{{ t.type }}: {{ parseFloat(t.amount || 0).toLocaleString() }}元</span>
                      <span class="font-mono">{{ t.time }}</span>
                    </div>
                  </div>
                  <!-- 物流证据 -->
                  <div v-if="selectedNodeDetail.evidence.logistics?.length" class="p-2 rounded border border-green-100"
                    style="background: #F6FFED">
                    <p class="text-[11px] font-bold text-green-800 mb-1">📦 物流发货 (展示前3条)</p>
                    <div v-for="(l, idx) in selectedNodeDetail.evidence.logistics.slice(0, 3)" :key="idx"
                      class="text-[10px] text-green-700">
                      {{ l.type }}: {{ l.description }} <span class="font-mono opacity-70">({{ l.time }})</span>
                    </div>
                  </div>
                  <!-- 通讯证据 -->
                  <div v-if="selectedNodeDetail.evidence.communications?.length"
                    class="p-2 rounded border border-purple-100" style="background: #F9F0FF">
                    <p class="text-[11px] font-bold text-purple-800 mb-1">💬 通讯记录 (展示前3条)</p>
                    <div v-for="(c, idx) in selectedNodeDetail.evidence.communications.slice(0, 3)" :key="idx"
                      class="text-[10px] text-purple-700">
                      <span class="font-bold">[{{ c.type }}]</span> {{ c.content }}
                      <span v-if="c.hit_keywords?.length" class="px-1 bg-red-100 text-red-500 rounded"> {{
                        c.hit_keywords.join(',') }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 往期案件详情 -->
              <div v-if="selectedNodeDetail.relatedCasesDetail?.length"
                class="mt-5 pt-4 border-t border-dashed border-gray-200">
                <p class="text-xs font-bold mb-2" style="color: #888">📂 往期案件档案 (共 {{
                  selectedNodeDetail.relatedCasesDetail.length }} 条)</p>
                <div class="space-y-1">
                  <div v-for="(rc, idx) in selectedNodeDetail.relatedCasesDetail.slice(0, 3)" :key="idx"
                    class="p-2 rounded bg-gray-50 border border-gray-100 text-[10px]">
                    <div class="flex justify-between font-bold text-gray-500">
                      <span>案件名称: {{ rc.case_no || rc.case_id || "未知" }}</span>
                      <span>{{ parseFloat(rc.amount || 0).toLocaleString() }}元</span>
                    </div>
                    <div class="text-gray-400 mt-0.5 font-mono">案发时间: {{ rc.time }}</div>
                  </div>
                </div>
              </div>

              <div class="mt-4 flex gap-2">
                <el-button size="small" type="primary" style="background: #1A3A5C; border-color: #1A3A5C; width: 100%"
                  @click="() => { const cid = selectedNodeDetail?.isCase ? selectedNode?.id?.replace('case_', '') : selectedCaseId; if (cid) { selectedCaseId = cid; graphTab = 'upstream'; router.push({ path: '/relations/upstream', query: { caseId: cid } }); } }">
                  查看本案上下游关系图
                </el-button>
              </div>
            </div>

            <div class="mt-6 pt-4" style="border-top: 1px solid #E8EEF4">
              <p class="text-xs font-bold mb-3" style="color: #888">图谱统计</p>
              <div class="grid grid-cols-2 gap-3">
                <div class="p-3 rounded-lg text-center" style="background: #F5F8FA">
                  <p class="text-xl font-black" style="color: #1A3A5C">{{ graphStats.nodes }}</p>
                  <p class="text-xs" style="color: #888">节点总数</p>
                </div>
                <div class="p-3 rounded-lg text-center" style="background: #F5F8FA">
                  <p class="text-xl font-black" style="color: #1A3A5C">{{ graphStats.links }}</p>
                  <p class="text-xs" style="color: #888">关系链路</p>
                </div>
                <div class="p-3 rounded-lg text-center" style="background: #FDECEA">
                  <p class="text-xl font-black" style="color: #C0392B">{{ graphStats.keyNodes }}</p>
                  <p class="text-xs" style="color: #888">关键节点</p>
                </div>
                <div class="p-3 rounded-lg text-center" style="background: #F3F0FB">
                  <p class="text-xl font-black" style="color: #7C3AED">{{ graphStats.linkedCases }}</p>
                  <p class="text-xs" style="color: #888">涉案案件</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
