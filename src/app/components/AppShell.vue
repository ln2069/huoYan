<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { RouterLink, RouterView } from "vue-router";
import { get } from "@/services/api/client";
import { ElMessage } from "element-plus";
import { clearSession, isLoggedIn } from "@/services/auth/authService";
import {
  User,
  DataBoard,
  FolderOpened,
  Cpu,
  Connection,
  Wallet,
  Bell,
  Document,
} from "@element-plus/icons-vue";

const route = useRoute();
const router = useRouter();
const activePath = computed(() => route.path);
const expandedNav = ref<string | null>(null);
const criminalCluesCount = ref(0);

// 注销逻辑
function handleLogout() {
  clearSession();
  ElMessage.success('已安全退出系统');
  router.push('/login');
}

// Fetch criminal-level clue count for notification badge (#19)
onMounted(async () => {
  if (route.path === '/login' || !isLoggedIn()) return;

  try {
    const cases = await get<any[]>('/cases?limit=500');
    const caseList = Array.isArray(cases) ? cases : ((cases as any)?.list || []);
    let count = 0;
    for (const c of caseList.slice(0, 20)) {
      try {
        const res = await get<any>(`/cases/${c.id}/suspicious`);
        const s = res as any;
        const all = [
          ...(s.suspicion_clues || s.suspicious_clues || []),
          ...(s.price_clues || []),
          ...(s.role_clues || []),
        ];
        count += all.filter((x: any) => x.severity_level === '刑事犯罪').length;
      } catch { }
    }
    criminalCluesCount.value = count;
  } catch { }
});

const nav = [
  { to: "/dashboard", label: "数据看板", icon: DataBoard },
  { to: "/cases", label: "案件管理", icon: FolderOpened },
  { to: "/evidence-list", label: "可疑线索", icon: Document },
  { to: "/evidence", label: "智能证据解析", icon: Cpu },
  {
    to: "/relations",
    label: "关联分析",
    icon: Connection,
    children: [
      { to: "/relations/upstream", label: "上下游关系图" },
      { to: "/relations/crosscase", label: "跨案关联拓扑" },
    ],
  },
  {
    to: "/ledger",
    label: "数据台账",
    icon: Wallet,
    children: [
      { to: "/ledger/person", label: "人物台账" },
      { to: "/ledger/fund", label: "资金台账" },
      { to: "/ledger/evidence", label: "证据清单" },
    ],
  },
];

// 监听路由变化，自动展开对应菜单
watch(
  () => route.path,
  (newPath) => {
    if (newPath === "/ledger" || newPath.startsWith("/ledger/")) {
      expandedNav.value = "/ledger";
    } else if (newPath === "/relations" || newPath.startsWith("/relations/")) {
      expandedNav.value = "/relations";
    } else {
      expandedNav.value = null;
    }
  },
  { immediate: true }
);

function isParentActive(parentPath: string) {
  return activePath.value === parentPath || activePath.value.startsWith(parentPath + "/");
}

function handleParentNavClick(parentPath: string) {
  if (parentPath === "/ledger") {
    router.push("/ledger/person");
  } else if (parentPath === "/relations") {
    router.push("/relations/upstream");
  }
}
</script>

<template>
  <!-- 如果是登录页，直接渲染内容，不显示侧边栏和头部 -->
  <div v-if="route.path === '/login'" class="h-full w-full">
    <RouterView />
  </div>

  <div v-else class="h-full flex flex-col">
    <!-- 头部：火眼智擎 -->
    <header class="h-[60px] flex items-center justify-between px-6 flex-shrink-0" style="background-color: #1E4060">
      <div class="flex items-center gap-2">
        <span class="text-2xl">🔥</span>
        <span class="text-xl font-bold tracking-tight text-white">火眼智擎</span>
        <span class="text-xs ml-2" style="color: rgba(255,255,255,0.6)">汽配知产保护分析助手</span>
      </div>
      <div class="flex items-center gap-4">
        <el-badge :value="criminalCluesCount > 0 ? criminalCluesCount : null" type="danger">
          <el-button :icon="Bell" circle size="small"
            style="background: rgba(255,255,255,0.15); border: none; color: white" />
        </el-badge>

        <!-- 用户信息与注销 -->
        <el-dropdown trigger="click">
          <div class="flex items-center gap-2 cursor-pointer outline-none">
            <el-avatar :size="32" style="background: #C0392B; font-weight: 700">李</el-avatar>
            <span class="text-sm font-semibold text-white">检察官 李明</span>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :icon="User">个人中心</el-dropdown-item>
              <el-dropdown-item divided style="color: #F56C6C" @click="handleLogout">
                退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <div class="flex-1 grid grid-cols-[220px_1fr] overflow-hidden">
      <!-- 侧边导航栏 -->
      <aside class="py-4 flex flex-col" style="background-color: #152F4A">
        <nav class="flex-1 px-2">
          <div v-for="item in nav" :key="item.to">
            <RouterLink v-if="!item.children" :to="item.to"
              class="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm mb-0.5 transition-all"
              style="color: rgba(255,255,255,0.75)" :class="activePath === item.to
                  ? 'bg-white/[0.15] font-semibold !text-white border-l-[3px] !border-l-[#C0392B]'
                  : 'hover:bg-white/[0.08] !text-white'
                ">
              <component :is="item.icon" class="w-4 h-4 opacity-80" />
              <span>{{ item.label }}</span>
            </RouterLink>

            <div v-else class="mb-0.5">
              <div class="flex items-center px-3 py-2.5 rounded-md text-sm cursor-pointer transition-all" :class="isParentActive(item.to)
                  ? 'bg-white/[0.15] font-semibold !text-white border-l-[3px] !border-l-[#C0392B]'
                  : activePath === item.to
                    ? 'bg-white/[0.15] font-semibold !text-white border-l-[3px] !border-l-[#C0392B]'
                    : 'hover:bg-white/[0.08] !text-white'
                " @click="handleParentNavClick(item.to)">
                <div class="flex items-center gap-2">
                  <component :is="item.icon" class="w-4 h-4 opacity-80" />
                  <span>{{ item.label }}</span>
                </div>
              </div>

              <transition name="slide-fade" appear>
                <div v-if="expandedNav === item.to" class="pl-8 mt-1 mb-2 overflow-hidden">
                  <RouterLink v-for="child in item.children" :key="child.to" :to="child.to"
                    class="flex items-center gap-2 px-3 py-2 rounded-md text-sm mb-1 transition-all duration-300 ease-in-out"
                    style="color: rgba(255,255,255,0.75)" :class="activePath === child.to
                        ? 'bg-white/[0.1] font-semibold !text-white'
                        : 'hover:bg-white/[0.08] !text-white'
                      ">
                    <span>{{ child.label }}</span>
                  </RouterLink>
                </div>
              </transition>
            </div>
          </div>
        </nav>
        <div class="px-6 text-xs" style="color: rgba(255,255,255,0.4)">
          🔒 内部系统 | 数据保密
        </div>
      </aside>

      <!-- 主视图区域 -->
      <main class="scroll-area p-6 overflow-y-auto" style="background-color: #E8EEF4">
        <div class="w-full max-w-[1600px] mx-auto">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease-in-out;
  overflow: hidden;
  max-height: 200px;
}

.slide-fade-enter-from {
  transform: translateY(-10px);
  opacity: 0;
  max-height: 0;
}

.slide-fade-enter-to {
  transform: translateY(0);
  opacity: 1;
  max-height: 200px;
}

.slide-fade-leave-from {
  transform: translateY(0);
  opacity: 1;
  max-height: 200px;
}

.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
  max-height: 0;
}

/* 优化导航项的过渡动画 */
.router-link-active,
.router-link-exact-active,
.cursor-pointer {
  transition: all 0.3s ease-in-out !important;
}

/* 确保子菜单从父菜单下方滑出 */
.pl-8 {
  position: relative;
  overflow: hidden;
}

/* 为子菜单项添加淡入效果 */
.router-link {
  opacity: 0;
  animation: slideDown 0.3s ease-in-out forwards;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 为子菜单项添加交错动画效果 */
.router-link:nth-child(1) {
  animation-delay: 0.05s;
}

.router-link:nth-child(2) {
  animation-delay: 0.1s;
}

.router-link:nth-child(3) {
  animation-delay: 0.15s;
}
</style>
