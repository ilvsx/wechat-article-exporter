export interface LoginAccount {
  nickname: string;
  avatar: string;
  expires: string;
  err?: string;
}

export interface BaseResp {
  err_msg: string;
  ret: number;
}

export interface StartLoginResult {
  base_resp: BaseResp;
}

export interface GetAuthKeyResult {
  code: number;
  data: string;
  msg: string;
}

export interface ScanLoginResult {
  base_resp: BaseResp;
  status: number;
  acct_size: number;
  binduin: string;
}

export interface AccountInfo {
  type: 'account';
  alias: string;
  fakeid: string;
  nickname: string;
  round_head_img: string;
  service_type: number;
  signature: string;
  _loaded?: boolean;
}

export interface SearchBizResponse {
  base_resp: BaseResp;
  list: AccountInfo[];
  total: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface AppMsgAlbumInfo {
  album_id: number;
  id: string;
  tagSource: number;
  title: string;
}

export interface AppMsgEx {
  aid: string;
  album_id: string;
  appmsg_album_infos: AppMsgAlbumInfo[];
  appmsgid: number;
  author_name: string;
  ban_flag: number;
  checking: number;
  copyright_stat: number;
  copyright_type: number;
  cover: string;
  cover_img?: string;
  cover_img_theme_color?: RGB;
  create_time: number;
  digest: string;
  has_red_packet_cover: number;
  is_deleted: boolean;
  is_pay_subscribe: number;
  wecoin_count: number;
  item_show_type: number;
  itemidx: number;
  link: string;
  media_duration: string;
  mediaapi_publish_status: number;
  pic_cdn_url_1_1: string;
  pic_cdn_url_3_4: string;
  pic_cdn_url_16_9: string;
  pic_cdn_url_235_1: string;
  title: string;
  update_time: number;
}

export type AppMsgExWithFakeID = AppMsgEx & {
  fakeid: string;

  // 文章状态
  _status: string;

  // 是否是单文章下载添加的数据
  _single?: boolean;
};

export interface DownloadableArticle {
  fakeid: string;
  title: string;
  url: string;
  date: number;
  html?: string;
  packed?: boolean;
}

export interface LogoutResponse {
  statusCode: number;
  statusText: string;
}
