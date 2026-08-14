<template>
  <USlideover v-model="isOpen" side="left" :ui="{ overlay: { background: 'bg-slate-950/50' } }">
    <div
      class="rounded-lg divide-y divide-slate-4 dark:divide-slate-800 shadow bg-white dark:bg-slate-900 flex flex-col flex-1 overflow-y-scroll"
    >
      <div class="sticky top-0 bg-white py-4 px-2 shadow dark:bg-slate-900">
        <SearchAccountForm v-model="accountQuery" @search="searchAccount" />
      </div>
      <div class="flex-1">
        <ul class="divide-y antialiased">
          <li
            v-for="account in accountList"
            :key="account.fakeid"
            class="flex items-center px-2 py-4 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <button
              type="button"
              class="flex w-full items-center text-left focus-visible:outline-none"
              @click="selectAccount(account)"
            >
              <img class="size-20 mr-2" :src="account.round_head_img" alt="" width="80" height="80" />
              <div class="flex-1">
                <div class="flex justify-between">
                  <p class="font-semibold">{{ account.nickname }}</p>
                  <p class="text-blue-600 font-medium">
                    {{ ACCOUNT_TYPE[account.service_type] }}
                  </p>
                </div>
                <p class="text-slate-11 text-sm">微信号: {{ account.alias || '未设置' }}</p>
                <p class="text-sm mt-2">{{ account.signature }}</p>
              </div>
            </button>
          </li>
        </ul>

        <p v-if="loading" class="flex justify-center items-center my-2 py-2">
          <Loader :size="28" class="animate-spin text-slate-500" />
        </p>
        <p v-else-if="noMoreData" class="text-center mt-2 py-2 text-slate-400">已全部加载完毕</p>
        <div v-else-if="accountList.length > 0" class="flex justify-center py-2">
          <UButton color="gray" variant="outline" size="sm" @click="loadData">加载更多</UButton>
        </div>
      </div>
    </div>
  </USlideover>
</template>

<script setup lang="ts">
import { Loader } from 'lucide-vue-next';
import { getAccountList } from '~/apis';
import LoginModal from '~/components/modal/Login.vue';
import { ACCOUNT_LIST_PAGE_SIZE, ACCOUNT_TYPE } from '~/config';
import type { AccountInfo } from '~/types/types';

const toast = useToast();
const modal = useModal();

const isOpen = ref(false);

function openSwitcher() {
  isOpen.value = true;
}

const accountQuery = ref('');
const accountList = reactive<AccountInfo[]>([]);
let begin = 0;

/**
 * 搜索公众号
 */
async function searchAccount() {
  begin = 0;
  accountList.length = 0;
  noMoreData.value = false;

  await loadData();
}

const loading = ref(false);
const noMoreData = ref(false);

/**
 * 加载公众号数据
 */
async function loadData() {
  loading.value = true;

  try {
    const [accounts, completed] = await getAccountList(begin, accountQuery.value);
    accountList.push(...accounts);
    begin += ACCOUNT_LIST_PAGE_SIZE;
    noMoreData.value = completed;
  } catch (e: any) {
    if (e.message === 'session expired') {
      modal.open(LoginModal);
    } else {
      console.error(e);
      toast.add({
        color: 'rose',
        title: '错误',
        description: e.message,
        icon: 'i-octicon:bell-24',
      });
    }
  } finally {
    loading.value = false;
  }
}

/**
 * 选择公众号
 * @param account
 */
function selectAccount(account: AccountInfo) {
  isOpen.value = false;
  emit('select:account', account);
}

const emit = defineEmits(['select:account']);

defineExpose({
  open: openSwitcher,
});
</script>
