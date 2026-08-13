import { CREDENTIAL_LIVE_MINUTES } from '~/config';
import type { ParsedCredential } from '~/types/credential';

// 共享凭据存储（全站唯一实例，避免多实例各自缓存导致的同步问题）
const credentials = useLocalStorage<ParsedCredential[]>('auto-detect-credentials:credentials', []);

// 时间流逝 tick：每 30 秒递增，驱动过期判定相关的 computed 重算
const tick = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

/**
 * 凭据状态管理（统一入口）
 * @description 凭据约 CREDENTIAL_LIVE_MINUTES 分钟过期，过期判定基于 timestamp 实时计算
 */
export function useCredentials() {
  if (timer === null && typeof window !== 'undefined') {
    timer = setInterval(() => {
      tick.value++;
    }, 30_000);
  }

  function isExpired(credential: ParsedCredential): boolean {
    return Date.now() - credential.timestamp > CREDENTIAL_LIVE_MINUTES * 60 * 1000;
  }

  // 有效凭据（响应式，随 tick 自动更新过期状态）
  const validCredentials = computed(() => {
    void tick.value;
    return credentials.value.filter(credential => !isExpired(credential));
  });

  // 已过期凭据
  const expiredCredentials = computed(() => {
    void tick.value;
    return credentials.value.filter(credential => isExpired(credential));
  });

  const validCount = computed(() => validCredentials.value.length);

  /**
   * 获取指定公众号的有效凭据
   */
  function getValidCredential(fakeid: string): ParsedCredential | undefined {
    return credentials.value.find(credential => credential.biz === fakeid && !isExpired(credential));
  }

  return {
    credentials,
    isExpired,
    validCredentials,
    expiredCredentials,
    validCount,
    getValidCredential,
  };
}
