import { request } from '#shared/utils/request';
import { ACCOUNT_LIST_PAGE_SIZE, CREDENTIAL_LIVE_MINUTES } from '~/config';
import { updateArticleCache } from '~/store/v2/article';
import { type MpAccount, updateLastUpdateTime } from '~/store/v2/info';
import type { CommentResponse } from '~/types/comment';
import type { ParsedCredential } from '~/types/credential';
import type { ProfileGetMsgResponse } from '~/types/profile_getmsg';
import type { AccountInfo, AppMsgEx, SearchBizResponse } from '~/types/types';
import { parseGeneralMsgList, parseProfileGetMsgList } from '~/utils/profile-getmsg';

const loginAccount = useLoginAccount();
const credentials = useLocalStorage<ParsedCredential[]>('auto-detect-credentials:credentials', []);

/**
 * 获取指定公众号的有效 Credential
 * @description 微信客户端历史消息接口需要携带动态凭据（key/uin/pass_ticket），凭据约 CREDENTIAL_LIVE_MINUTES 分钟过期
 * @param fakeid
 */
function getCredential(fakeid: string): ParsedCredential {
  const credential = credentials.value.find(item => item.biz === fakeid);
  if (!credential) {
    throw new Error('未找到该公众号的 Credential，请先点击右上角「抓取 Credentials」完成抓取');
  }
  if (Date.now() - credential.timestamp > CREDENTIAL_LIVE_MINUTES * 60 * 1000) {
    throw new Error('该公众号的 Credential 已过期，请点击右上角「抓取 Credentials」重新抓取');
  }
  return credential;
}

/**
 * 获取文章列表（微信客户端历史消息接口，需要 Credential）
 * @param account
 * @param begin 消息偏移量，每页最多 10 条消息
 * @return [文章列表, 是否加载完毕, 下一页偏移量]
 */
export async function getArticleList(account: MpAccount, begin = 0): Promise<[AppMsgEx[], boolean, number]> {
  const credential = getCredential(account.fakeid);

  const resp = await request<ProfileGetMsgResponse>('/api/web/mp/profile_ext_getmsg', {
    query: {
      id: account.fakeid,
      begin: begin,
      size: 10,
      uin: credential.uin,
      key: credential.key,
      pass_ticket: credential.pass_ticket,
    },
  });

  if (resp.ret !== 0) {
    throw new Error(`获取文章列表失败: ${resp.ret}:${resp.errmsg}`);
  }

  const list = parseGeneralMsgList(resp.general_msg_list);
  const articles = parseProfileGetMsgList(list);

  // 更新缓存与最后同步时间（completed：接口返回 can_msg_continue === 0 表示已无更多消息）
  await updateArticleCache(account, articles, resp.can_msg_continue === 0);
  if (begin === 0) {
    await updateLastUpdateTime(account.fakeid);
  }

  return [articles, resp.can_msg_continue === 0, resp.next_offset];
}

/**
 * 获取公众号列表
 * @param begin
 * @param keyword
 */
export async function getAccountList(begin = 0, keyword = ''): Promise<[AccountInfo[], boolean]> {
  const resp = await request<SearchBizResponse>('/api/web/mp/searchbiz', {
    query: {
      begin: begin,
      size: ACCOUNT_LIST_PAGE_SIZE,
      keyword: keyword,
    },
  });

  if (resp.base_resp.ret === 0) {
    // 公众号判断是否结束的逻辑与文章不太一样
    // 当第一页的结果就少于5个则结束，否则只有当搜索结果为空才表示结束
    const isCompleted = begin === 0 ? resp.total < ACCOUNT_LIST_PAGE_SIZE : resp.total === 0;

    return [resp.list, isCompleted];
  } else if (resp.base_resp.ret === 200003) {
    loginAccount.value = null;
    throw new Error('session expired');
  } else {
    throw new Error(`${resp.base_resp.ret}:${resp.base_resp.err_msg}`);
  }
}

/**
 * 获取评论
 * @param commentId
 */
export async function getComment(commentId: string) {
  try {
    // 本地设置的 credentials
    const credentials = JSON.parse(window.localStorage.getItem('credentials')!);
    if (!credentials || !credentials.__biz || !credentials.pass_ticket || !credentials.key || !credentials.uin) {
      console.warn('credentials not set');
      return null;
    }
    const response = await request<CommentResponse>('/api/web/misc/comment', {
      query: {
        comment_id: commentId,
        ...credentials,
      },
    });
    if (response.base_resp.ret === 0) {
      return response;
    } else {
      return null;
    }
  } catch (e) {
    console.warn('credentials parse error', e);
    return null;
  }
}
