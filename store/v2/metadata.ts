import type { ArticleMetadata } from '~/utils/download/types';
import { db } from './db';

export type Metadata = ArticleMetadata & {
  fakeid: string;
  url: string;
  title: string;
};

/**
 * 更新 metadata
 * @param metadata
 */
export async function updateMetadataCache(metadata: Metadata): Promise<boolean> {
  return db.transaction('rw', 'metadata', async () => {
    await db.metadata.put(metadata);
    return true;
  });
}

/**
 * 获取 metadata
 * @param url
 */
export async function getMetadataCache(url: string): Promise<Metadata | undefined> {
  return db.metadata.get(url);
}

/**
 * 批量获取全部 metadata(url → Metadata)
 * @description 用于文章表格批量合并阅读量等数据列;记录体量小(无 Blob),可整表加载
 */
export async function getMetadataMap(): Promise<Map<string, Metadata>> {
  const rows = await db.metadata.toArray();
  return new Map(rows.map(m => [m.url, m]));
}
