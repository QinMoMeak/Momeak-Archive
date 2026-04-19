import inboxData from "../../data/inbox.json";
import offlineData from "../../data/offline.json";
import shoppingData from "../../data/shopping.json";
import songsData from "../../data/songs.json";
import taxonomyData from "../../data/taxonomy.json";
import websitesData from "../../data/websites.json";
import type {
  InboxEntry,
  KnowledgeData,
  ModuleDefinition,
  ModuleId,
  OfflineEntry,
  ShoppingEntry,
  SongEntry,
  WebsiteEntry,
} from "@/types/knowledge";

export const moduleDefinitions: Record<ModuleId, ModuleDefinition> = {
  offline: {
    id: "offline",
    label: "线下好店",
    description: "饭店、住宿、景点等值得反复回看的地点",
    summary: "记录真实去过、想去或准备长期收藏的线下地点。",
    iconKey: "store",
    tableHeaders: ["名称", "分类", "地点", "评分", "状态", "标签"],
    primaryFieldLabel: "地点",
    secondaryFieldLabel: "评分",
    defaultCategories: taxonomyData.categories.offline,
    defaultStatuses: ["想去", "常去", "去过", "收藏"],
  },
  shopping: {
    id: "shopping",
    label: "网购好物",
    description: "零食、数码、日用百货、服饰、药品等",
    summary: "保留真正值得回购、推荐和继续观察的商品。",
    iconKey: "shoppingBag",
    tableHeaders: ["名称", "分类", "平台", "价格", "状态", "标签"],
    primaryFieldLabel: "平台",
    secondaryFieldLabel: "价格",
    defaultCategories: taxonomyData.categories.shopping,
    defaultStatuses: ["回购", "推荐", "在用", "收藏"],
  },
  websites: {
    id: "websites",
    label: "网站收集",
    description: "域名、网站内容、用途、是否可访问等",
    summary: "按用途整理网站，而不是让浏览器书签继续失控。",
    iconKey: "globe",
    tableHeaders: ["名称", "分类", "域名", "可访问", "状态", "标签"],
    primaryFieldLabel: "域名",
    secondaryFieldLabel: "可访问",
    defaultCategories: taxonomyData.categories.websites,
    defaultStatuses: ["常用", "推荐", "收藏", "观察中"],
  },
  inbox: {
    id: "inbox",
    label: "待处理",
    description: "先收起来的链接、片段、截图说明、灵感和其他原始内容",
    summary: "先保存原始内容，不强迫当下完成结构化整理，后续再用 AI 分析或转移到正式模块。",
    iconKey: "inbox",
    tableHeaders: ["标题", "分类", "原始内容摘要", "AI 摘要", "状态", "标签"],
    primaryFieldLabel: "原始内容",
    secondaryFieldLabel: "AI 摘要",
    defaultCategories: taxonomyData.categories.inbox,
    defaultStatuses: ["未处理", "已分析", "已整理", "已归档"],
  },
  songs: {
    id: "songs",
    label: "歌曲",
    description: "KTV 必点、喜欢的歌、待听歌曲和各种场景歌单候选",
    summary: "把零散看到、听到、截图到的歌曲线索整理成可长期回查的收藏模块。",
    iconKey: "music4",
    tableHeaders: ["歌曲名", "分类", "歌手", "语言", "状态", "标签"],
    primaryFieldLabel: "歌手",
    secondaryFieldLabel: "语言",
    defaultCategories: taxonomyData.categories.songs,
    defaultStatuses: ["常听", "想听", "会唱", "KTV必点", "收藏"],
  },
};

export const moduleList = Object.values(moduleDefinitions);

export const initialKnowledgeData: KnowledgeData = {
  offline: offlineData as OfflineEntry[],
  shopping: shoppingData as ShoppingEntry[],
  websites: websitesData as WebsiteEntry[],
  inbox: inboxData as InboxEntry[],
  songs: songsData as SongEntry[],
};
