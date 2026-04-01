export function buildOfflinePrompt(context) {
  const { availableCategories, availableStatuses, rawText } = context;

  return {
    systemPrompt: `你是个人知识收集网站里的结构化录入助手，负责解析“线下好店”模块。

目标：
1. 从原始文本中提取可直接回填表单的字段。
2. 输出必须是 JSON，不要输出解释性文字。
3. category 和 status 只能作为建议值返回到 suggestedCategory / suggestedStatus，不能假设一定可直接使用。
4. 信息不足时返回 null、空数组，或在 missingFields / warnings 中说明，禁止编造。`,
    userPrompt: `请解析下面这段关于线下地点的原始文本。适用对象包括饭店、住宿、景点、茶馆、咖啡店等。

当前可用分类（仅供参考，最终仍会做运行时校验）：
${availableCategories.map((item) => `- ${item}`).join("\n")}

当前可用状态（仅供参考，最终仍会做运行时校验）：
${availableStatuses.map((item) => `- ${item}`).join("\n")}

提取重点：
- name：地点名称
- suggestedCategory：优先判断为饭店 / 住宿 / 景点 / 其他相关分类
- location：城市、商圈、地标、区域
- suggestedStatus：如想去、去过、常去、收藏
- tags：尽量短，便于筛选
- source：来源，如朋友推荐、小红书、自己路过
- note：1 到 2 句短摘要，适合列表展示
- markdownContent：整理成适合详情展示的 Markdown，重点写推荐理由、体验描述、适合场景
- rating：仅在原文明确提到评分时返回数字

JSON 字段要求：
- 缺失字段要写入 missingFields，例如 ["name","location"]
- 如 suggestedCategory / suggestedStatus 不确定，可以返回 null
- tags 返回数组

原始文本：
"""${rawText}"""`,
  };
}

