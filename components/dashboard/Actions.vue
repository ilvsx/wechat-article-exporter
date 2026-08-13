<script setup lang="ts">
import type { ChipColor } from '#ui/types';
import CredentialsDialog, { type CredentialState } from '~/components/global/CredentialsDialog.vue';
import { docsWebSite } from '~/config';
import { gotoLink } from '~/utils';

// CredentialDialog 相关变量
const credentialsDialogOpen = ref(false);
const credentialState = ref<CredentialState>('inactive');
const credentialPendingCount = ref(0);
const credentialColor: ComputedRef<ChipColor> = computed<ChipColor>(() => {
  switch (credentialState.value) {
    case 'active':
      return 'green';
    case 'inactive':
      return 'gray';
    case 'warning':
      return 'amber';
    default:
      return 'gray';
  }
});

const credentialBadgeText = computed(() => {
  const count = credentialPendingCount.value;
  if (count <= 0) return '';
  return count > 9 ? '+' : `${count}`;
});
const isCredentialActive = computed(() => credentialState.value === 'active');

// 深浅色模式切换
const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === 'dark');
function toggleColorMode() {
  colorMode.preference = isDark.value ? 'light' : 'dark';
}
</script>

<template>
  <ul class="hidden md:flex items-center gap-1">
    <!-- 「公号三刀」 -->
    <li>
      <UTooltip text="可尝试「公号三刀」抓取非群发等少量文章">
        <!-- 「公号三刀」logo（圆角方块 + 三道刃）的单色线稿版，与相邻 lucide 图标风格统一 -->
        <UButton square ghost color="gray" @click="gotoLink('https://github.com/zoro-build/wechat')">
          <svg
            class="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="4" />
            <path d="M8 7.5v9M12 7.5v9M16 7.5v9" />
          </svg>
        </UButton>
      </UTooltip>
    </li>

    <!-- Credential -->
    <li>
      <CredentialsDialog
        v-model:open="credentialsDialogOpen"
        v-model:state="credentialState"
        @update:pending-count="credentialPendingCount = $event"
      />
      <UTooltip text="抓取 Credentials">
        <UChip :text="credentialBadgeText" color="rose" size="xs">
          <UButton
            square
            ghost
            :color="isCredentialActive ? 'blue' : 'gray'"
            @click="credentialsDialogOpen = true"
          >
            <UIcon name="i-lucide:dog" class="size-5" />
          </UButton>
        </UChip>
      </UTooltip>
    </li>

    <!-- 深浅色切换 -->
    <li>
      <UTooltip :text="isDark ? '切换到浅色模式' : '切换到深色模式'">
        <UButton square ghost color="gray" @click="toggleColorMode">
          <UIcon :name="isDark ? 'i-lucide:sun' : 'i-lucide:moon'" class="size-5" />
        </UButton>
      </UTooltip>
    </li>

    <!-- 文档 -->
    <li>
      <UTooltip text="文档">
        <UButton square ghost color="gray" icon="i-lucide:book-open" @click="gotoLink(docsWebSite)" />
      </UTooltip>
    </li>

    <!-- GitHub -->
    <li>
      <UTooltip text="GitHub">
        <UButton
          square
          ghost
          color="gray"
          icon="i-lucide:github"
          @click="gotoLink('https://github.com/wechat-article/wechat-article-exporter')"
        />
      </UTooltip>
    </li>
  </ul>
</template>
