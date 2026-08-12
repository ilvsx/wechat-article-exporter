import type { AppMsgEx, AppMsgExWithFakeID } from '~/types/types';
import { db } from './db';
import { type MpAccount, updateInfoCache } from './info';

export type ArticleAsset = AppMsgExWithFakeID;

/**
 * 更新文章缓存
 * @param account
 * @param articles 本次接口返回的文章列表
 * @param completed 是否已同步完毕（接口返回 can_msg_continue === 0）
 */
export async function updateArticleCache(account: MpAccount, articles: AppMsgEx[], completed = false) {
  await db.transaction('rw', ['article', 'info'], async () => {
    const keys = await db.article.toCollection().keys();

    const fakeid = account.fakeid;

    // 统计本次缓存成功新增的消息数与文章数
    let msgCount = 0;
    let articleCount = 0;
    const addedMessageIds = new Set<number>();

    for (const article of articles) {
      const key = await db.article.put({ ...article, fakeid, _status: '' }, `${fakeid}:${article.aid}`);
      if (!keys.includes(key)) {
        articleCount++;
        if (article.itemidx === 1) {
          addedMessageIds.add(article.appmsgid);
        }
      }
    }
    msgCount = addedMessageIds.size;

    await updateInfoCache({
      fakeid: fakeid,
      completed: completed,
      count: msgCount,
      articles: articleCount,
      nickname: account.nickname,
      round_head_img: account.round_head_img,
      total_count: account.total_count,
    });

    // 新接口不返回文章总数，同步完成时以已同步消息数作为总数，进度显示为 100%
    if (completed) {
      const infoCache = await db.info.get(fakeid);
      if (infoCache) {
        infoCache.total_count = infoCache.count;
        await db.info.put(infoCache);
      }
    }
  });
}

/**
 * 检查是否存在指定时间之前的缓存
 * @param fakeid 公众号id
 * @param create_time 创建时间
 */
export async function hitCache(fakeid: string, create_time: number): Promise<boolean> {
  const count = await db.article
    .where('fakeid')
    .equals(fakeid)
    .and(article => article.create_time < create_time)
    .count();
  return count > 0;
}

/**
 * 读取缓存中的指定时间之前的历史文章
 * @param fakeid 公众号id
 * @param create_time 创建时间
 */
export async function getArticleCache(fakeid: string, create_time: number): Promise<AppMsgExWithFakeID[]> {
  return db.article
    .where('fakeid')
    .equals(fakeid)
    .and(article => article.create_time < create_time)
    .reverse()
    .sortBy('create_time');
}

/**
 * 根据 url 获取文章对象
 * @param url
 */
export async function getArticleByLink(url: string): Promise<AppMsgExWithFakeID> {
  const article = await db.article.where('link').equals(url).first();
  if (!article) {
    throw new Error(`Article(${url}) does not exist`);
  }
  return article;
}

// 根据 url 获取 SINGLE_ARTICLE_FAKEID 文章对象
export async function getSingleArticleByLink(url: string): Promise<AppMsgExWithFakeID> {
  const article = await db.article
    .where('link')
    .equals(url)
    .and(article => article.fakeid === 'SINGLE_ARTICLE_FAKEID')
    .first();
  if (!article) {
    throw new Error(`Article(${url}) does not exist`);
  }

  return article;
}

/**
 * 文章被删除
 * @param url
 * @param is_deleted
 */
export async function articleDeleted(url: string, is_deleted = true): Promise<void> {
  await db.transaction('rw', 'article', async () => {
    await db.article
      .where('link')
      .equals(url)
      .modify(article => {
        article.is_deleted = is_deleted;
      });
  });
}

/**
 * 更新文章状态
 * @param url
 * @param status
 */
export async function updateArticleStatus(url: string, status: string): Promise<void> {
  await db.transaction('rw', 'article', async () => {
    await db.article
      .where('link')
      .equals(url)
      .modify(article => {
        article._status = status;
      });
  });
}

/**
 * 更新文章的fakeid
 * @param url
 * @param fakeid
 */
export async function updateArticleFakeid(url: string, fakeid: string): Promise<void> {
  await db.transaction('rw', 'article', async () => {
    await db.article
      .where('link')
      .equals(url)
      .and(article => article.fakeid === 'SINGLE_ARTICLE_FAKEID')
      .modify(article => {
        article.fakeid = fakeid;

        // 标记改数据是【单篇文章下载】添加的
        article._single = true;
      });
  });
}
