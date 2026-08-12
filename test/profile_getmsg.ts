import type { ParsedProfileGetMsg } from '../types/profile_getmsg';
import { parseGeneralMsgList, parseProfileGetMsgList } from '../utils/profile-getmsg';

/**
 * 测试断言助手（test 目录为独立脚本，不依赖测试框架与 node 类型）
 */
function assertEqual(actual: unknown, expected: unknown, label = '未命名断言') {
  if (actual !== expected) {
    throw new Error(`断言失败 [${label}]: 期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`);
  }
}

/**
 * 模拟 profile_ext?action=getmsg 接口返回的 general_msg_list 数据
 * content_url 为 JSON 转义残留（\/）与 HTML 实体（&amp;）混合的原始格式
 */
const fixture: ParsedProfileGetMsg[] = [
  {
    comm_msg_info: {
      content: '',
      datetime: 1750000000,
      fakeid: 'MzA4NTc2MjEwNQ==',
      id: 2651234567,
      status: 2,
      type: 49,
    },
    app_msg_ext_info: {
      audio_fileid: 0,
      author: '测试号',
      content: '',
      content_url:
        'https:\\/\\/mp.weixin.qq.com\\/s?__biz=MzA4NTc2MjEwNQ==&amp;mid=2651234567&amp;idx=1&amp;sn=abc123&amp;chksm=00000000',
      cover: 'http://mmbiz.qpic.cn/cover1',
      copyright_stat: 11,
      del_flag: 0,
      digest: '主文章摘要',
      duration: 0,
      fileid: 2651234567,
      item_show_type: 0,
      malicious_content_type: 0,
      malicious_title_reason_id: 0,
      play_url: '',
      source_url: '',
      title: '主文章标题',
      subtype: 1,
      is_multi: 1,
      multi_app_msg_item_list: [
        {
          audio_fileid: 0,
          author: '测试号',
          content: '',
          content_url:
            'https:\\/\\/mp.weixin.qq.com\\/s?__biz=MzA4NTc2MjEwNQ==&amp;mid=2651234567&amp;idx=2&amp;sn=def456',
          cover: 'http://mmbiz.qpic.cn/cover2',
          copyright_stat: 11,
          del_flag: 0,
          digest: '子文章摘要',
          duration: 0,
          fileid: 0,
          item_show_type: 0,
          malicious_content_type: 0,
          malicious_title_reason_id: 0,
          play_url: '',
          source_url: '',
          title: '子文章标题',
        },
      ],
    },
  },
  {
    // 微信接口对纯文本消息不返回 app_msg_ext_info，此处模拟该行为
    comm_msg_info: {
      content: '纯文本消息内容',
      datetime: 1750000100,
      fakeid: 'MzA4NTc2MjEwNQ==',
      id: 2651234568,
      status: 2,
      type: 1,
    },
  } as ParsedProfileGetMsg,
  {
    comm_msg_info: {
      content: '',
      datetime: 1750000200,
      fakeid: 'MzA4NTc2MjEwNQ==',
      id: 2651234569,
      status: 2,
      type: 49,
    },
    app_msg_ext_info: {
      audio_fileid: 0,
      author: '测试号',
      content: '',
      content_url:
        'https:\\/\\/mp.weixin.qq.com\\/s?__biz=MzA4NTc2MjEwNQ==&amp;mid=2651234569&amp;idx=1&amp;sn=video789',
      cover: 'http://mmbiz.qpic.cn/cover3',
      copyright_stat: 11,
      del_flag: 0,
      digest: '视频分享摘要',
      duration: 405,
      fileid: 2651234569,
      item_show_type: 5,
      malicious_content_type: 0,
      malicious_title_reason_id: 0,
      play_url: 'http://mpvideo.qpic.cn/video.mp4',
      source_url: '',
      title: '视频分享标题',
      subtype: 1,
      is_multi: 0,
      multi_app_msg_item_list: [],
    },
  },
  {
    comm_msg_info: {
      content: '',
      datetime: 1750000300,
      fakeid: 'MzA4NTc2MjEwNQ==',
      id: 2651234570,
      status: 2,
      type: 49,
    },
    app_msg_ext_info: {
      audio_fileid: 0,
      author: '测试号',
      content: '',
      content_url:
        'https:\\/\\/mp.weixin.qq.com\\/s?__biz=MzA4NTc2MjEwNQ==&amp;mid=2651234570&amp;idx=1&amp;sn=deleted',
      cover: '',
      copyright_stat: 11,
      del_flag: 1,
      digest: '已删除文章',
      duration: 0,
      fileid: 2651234570,
      item_show_type: 0,
      malicious_content_type: 0,
      malicious_title_reason_id: 0,
      play_url: '',
      source_url: '',
      title: '已删除文章',
      subtype: 0,
      is_multi: 0,
      multi_app_msg_item_list: [],
    },
  },
];

const articles = parseProfileGetMsgList(fixture);

// 纯文本消息应被跳过；del_flag=1 在当前接口中不代表已删除，应保留。剩余 主文章 + 子文章 + 视频 + del_flag=1 文章
assertEqual(articles.length, 4);

// 主文章
const main = articles[0];
assertEqual(main.title, '主文章标题');
assertEqual(main.digest, '主文章摘要');
assertEqual(main.cover, 'http://mmbiz.qpic.cn/cover1');
assertEqual(main.author_name, '测试号');
assertEqual(main.appmsgid, 2651234567);
assertEqual(main.itemidx, 1);
assertEqual(main.aid, '2651234567_1');
assertEqual(main.create_time, 1750000000);
assertEqual(main.update_time, 1750000000);
assertEqual(main.is_deleted, false);
assertEqual(
  main.link,
  'https://mp.weixin.qq.com/s?__biz=MzA4NTc2MjEwNQ==&mid=2651234567&idx=1&sn=abc123&chksm=00000000'
);

// 多图文子文章
const sub = articles[1];
assertEqual(sub.title, '子文章标题');
assertEqual(sub.itemidx, 2);
assertEqual(sub.aid, '2651234567_2');
assertEqual(sub.appmsgid, 2651234567);
assertEqual(sub.link, 'https://mp.weixin.qq.com/s?__biz=MzA4NTc2MjEwNQ==&mid=2651234567&idx=2&sn=def456');

// 视频分享：item_show_type 与时长格式化（405 秒 -> 6:45）
const video = articles[2];
assertEqual(video.title, '视频分享标题');
assertEqual(video.item_show_type, 5);
assertEqual(video.media_duration, '6:45');

// del_flag=1 在当前接口中为常规值，不应被过滤
const delFlagArticle = articles[3];
assertEqual(delFlagArticle.title, '已删除文章');
assertEqual(delFlagArticle.itemidx, 1);

console.log('profile_getmsg 映射测试全部通过');

// ── parseGeneralMsgList 形状兼容测试（回归：2026 年后接口返回 {"list": [...]} 结构）──

// 真实响应形状：对象包裹数组
const wrapped = JSON.stringify({ list: fixture });
assertEqual(parseGeneralMsgList(wrapped).length, fixture.length, '对象包裹数组解包');

// 历史形状：裸数组
assertEqual(parseGeneralMsgList(JSON.stringify(fixture)).length, fixture.length, '裸数组直通');

// 空字符串 / 无效 JSON / 非列表对象
assertEqual(parseGeneralMsgList('').length, 0, '空字符串返回空列表');
assertEqual(parseGeneralMsgList('not-json').length, 0, '无效 JSON 返回空列表');
assertEqual(parseGeneralMsgList(JSON.stringify({ foo: 1 })).length, 0, '无 list 键的对象返回空列表');

console.log('parseGeneralMsgList 形状兼容测试全部通过');
