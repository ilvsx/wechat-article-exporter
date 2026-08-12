import type { app_msg_item, ParsedProfileGetMsg } from '../types/profile_getmsg';
import type { AppMsgEx } from '../types/types';

/**
 * 反转义 profile_ext 接口返回的 content_url
 * 形如 "https:\/\/mp.weixin.qq.com\/s?__biz=...&amp;mid=...&amp;idx=1&amp;sn=..."，
 * 其中 \/ 为 JSON 转义残留，&amp; 为 HTML 实体转义
 */
function decodeContentUrl(contentUrl: string): string {
  return contentUrl.replace(/\\\//g, '/').replace(/&amp;/g, '&');
}

/**
 * 从文章链接中解析 idx（多图文消息中的位置，主文章为 1）
 * @param contentUrl 解码后的文章链接
 * @param fallback 无法解析时的兜底值
 */
function parseItemIdx(contentUrl: string, fallback: number): number {
  try {
    const idx = Number(new URL(contentUrl).searchParams.get('idx'));
    return Number.isInteger(idx) && idx > 0 ? idx : fallback;
  } catch {
    return fallback;
  }
}

/**
 * 将 profile_ext 的消息条目转换为 AppMsgEx
 * @param item profile_ext 消息条目（comm_msg_info + app_msg_ext_info）
 * @param ext 文章扩展信息（主文章或多图文子文章）
 * @param link 解码后的文章链接
 * @param itemidx 文章在消息中的位置（主文章为 1）
 */
function toAppMsgEx(item: ParsedProfileGetMsg, ext: app_msg_item, link: string, itemidx: number): AppMsgEx {
  const appmsgid = item.comm_msg_info.id;
  const createTime = item.comm_msg_info.datetime;
  const cover = ext.cover || '';

  // media_duration 在后台接口中为格式化字符串（如 "6:45"），此处将秒数格式化保持一致
  const mediaDuration =
    ext.duration > 0 ? `${Math.floor(ext.duration / 60)}:${String(ext.duration % 60).padStart(2, '0')}` : '';

  return {
    aid: `${appmsgid}_${itemidx}`,
    album_id: '',
    appmsg_album_infos: [],
    appmsgid,
    author_name: ext.author || '',
    ban_flag: 0,
    checking: 0,
    copyright_stat: ext.copyright_stat ?? 0,
    copyright_type: 0,
    cover,
    cover_img: cover,
    cover_img_theme_color: undefined,
    create_time: createTime,
    digest: ext.digest || '',
    has_red_packet_cover: 0,
    is_deleted: false,
    is_pay_subscribe: 0,
    item_show_type: ext.item_show_type ?? 0,
    itemidx,
    link,
    media_duration: mediaDuration,
    mediaapi_publish_status: 0,
    pic_cdn_url_1_1: '',
    pic_cdn_url_3_4: '',
    pic_cdn_url_16_9: '',
    pic_cdn_url_235_1: '',
    title: ext.title || '',
    update_time: createTime,
    wecoin_count: 0,
  };
}

/**
 * 解析 profile_ext 接口返回的 general_msg_list 字段
 * @description 该字段为 JSON 字符串：2026 年后为 {"list": [...]} 结构，历史版本为裸数组，兼容两种形状
 * @param generalMsgList 接口返回的 general_msg_list 字符串
 */
export function parseGeneralMsgList(generalMsgList: string): ParsedProfileGetMsg[] {
  if (!generalMsgList) return [];
  try {
    const parsed = JSON.parse(generalMsgList);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.list)) return parsed.list;
  } catch {
    // 解析失败按空列表处理
  }
  return [];
}

/**
 * 将 profile_ext 接口返回的消息列表转换为文章列表
 * @description 纯文本/图片分享等没有文章链接的消息无法下载，会被跳过
 * @param list profile_ext 返回的消息列表（general_msg_list 解析结果）
 */
export function parseProfileGetMsgList(list: ParsedProfileGetMsg[]): AppMsgEx[] {
  const articles: AppMsgEx[] = [];

  for (const item of list) {
    const ext = item.app_msg_ext_info;
    // 纯文本/图片分享等没有 app_msg_ext_info 的消息无法下载，直接跳过
    // 注意：当前接口中所有消息的 del_flag 均为 1，不代表已删除，不能作为过滤条件
    if (!ext) continue;

    const link = decodeContentUrl(ext.content_url);
    if (!link) continue;

    articles.push(toAppMsgEx(item, ext, link, parseItemIdx(link, 1)));

    // 多图文消息的子文章
    for (let i = 0; i < ext.multi_app_msg_item_list.length; i++) {
      const sub = ext.multi_app_msg_item_list[i];
      const subLink = decodeContentUrl(sub.content_url);
      if (!subLink) continue;
      articles.push(toAppMsgEx(item, sub, subLink, parseItemIdx(subLink, i + 2)));
    }
  }

  return articles;
}
