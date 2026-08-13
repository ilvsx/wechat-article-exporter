import { db } from './db';

export interface HtmlAsset {
  fakeid: string;
  url: string;
  file: Blob;
  title: string;
  commentID: string | null;
}

/**
 * 更新 html 缓存
 * @param html 缓存
 */
export async function updateHtmlCache(html: HtmlAsset): Promise<boolean> {
  return db.transaction('rw', 'html', async () => {
    await db.html.put(html);
    return true;
  });
}

/**
 * 获取 asset 缓存
 * @param url
 */
export async function getHtmlCache(url: string): Promise<HtmlAsset | undefined> {
  return db.html.get(url);
}

/**
 * 批量获取已下载正文的 url 集合(仅主键,不加载 Blob 数据体)
 * @description 用于文章表格批量标记 contentDownload,避免逐篇 get() 拉取大文件
 */
export async function getHtmlUrlSet(): Promise<Set<string>> {
  return new Set(await db.html.toCollection().primaryKeys());
}
