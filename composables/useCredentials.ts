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

  /**
   * 凭据是否超过 CREDENTIAL_LIVE_MINUTES(仅用于 UI 展示,不拦截任何请求;
   * 实际有效性以服务端返回为准,过期即 ret:-3 no session)
   */
  function isExpired(credential: ParsedCredential): boolean {
    return Date.now() - credential.timestamp > CREDENTIAL_LIVE_MINUTES * 60 * 1000;
  }

  // 展示用:未过期凭据(响应式,随 tick 自动更新过期状态)
  const validCredentials = computed(() => {
    void tick.value;
    return credentials.value.filter(credential => !isExpired(credential));
  });

  // 展示用:已过期凭据
  const expiredCredentials = computed(() => {
    void tick.value;
    return credentials.value.filter(credential => isExpired(credential));
  });

  const validCount = computed(() => validCredentials.value.length);

  return {
    credentials,
    isExpired,
    validCredentials,
    expiredCredentials,
    validCount,
  };
}
