export const aiModuleConfigs = {
  offline: {
    label: "线下好店",
    defaultStatuses: ["想去", "常去", "去过", "收藏"],
    categoryAliases: {
      restaurant: "饭店",
      "饭馆": "饭店",
      "餐馆": "饭店",
      "餐厅": "饭店",
      hotel: "住宿",
      homestay: "住宿",
      "民宿": "住宿",
      "旅馆": "住宿",
      attraction: "景点",
      scenic: "景点",
      scenicspot: "景点",
      "打卡地": "景点",
      cafe: "咖啡店",
      coffee: "咖啡店",
      teahouse: "茶馆",
      tea: "茶馆",
      "茶室": "茶馆",
    },
    statusAliases: {
      "想打卡": "想去",
      "待去": "想去",
      wishlist: "想去",
      frequent: "常去",
      favorite: "常去",
      visited: "去过",
      "已去过": "去过",
      "去过了": "去过",
      saved: "收藏",
      bookmark: "收藏",
    },
  },
  shopping: {
    label: "网购好物",
    defaultStatuses: ["回购", "推荐", "在用", "收藏"],
    categoryAliases: {
      snack: "零食",
      food: "零食",
      digital: "数码",
      electronics: "数码",
      gadget: "数码",
      daily: "日用百货",
      household: "日用百货",
      home: "日用百货",
      fashion: "服饰",
      clothes: "服饰",
      clothing: "服饰",
      medicine: "药品",
      medical: "药品",
      health: "药品",
    },
    statusAliases: {
      rebuy: "回购",
      repurchase: "回购",
      recommended: "推荐",
      use: "在用",
      using: "在用",
      current: "在用",
      saved: "收藏",
      bookmark: "收藏",
    },
  },
  websites: {
    label: "网站收集",
    defaultStatuses: ["常用", "推荐", "收藏", "观察中"],
    categoryAliases: {
      tool: "文件工具",
      tools: "文件工具",
      filetool: "文件工具",
      "文件处理": "文件工具",
      "格式转换": "文件工具",
      ai: "AI 工具",
      aitool: "AI 工具",
      "人工智能": "AI 工具",
      resource: "资源网站",
      resources: "资源网站",
      directory: "资源网站",
      catalog: "资源网站",
      dev: "开发参考",
      developer: "开发参考",
      docs: "开发参考",
      reference: "开发参考",
    },
    statusAliases: {
      frequent: "常用",
      daily: "常用",
      recommended: "推荐",
      saved: "收藏",
      bookmark: "收藏",
      observing: "观察中",
      pending: "观察中",
      watch: "观察中",
    },
  },
};

export function getModuleAiConfig(moduleId) {
  const config = aiModuleConfigs[moduleId];

  if (!config) {
    throw new Error("不支持的模块类型。");
  }

  return config;
}

