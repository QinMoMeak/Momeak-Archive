export function buildShoppingPrompt(context) {
  const { availableCategories, availableStatuses, rawText } = context;

  return {
    systemPrompt: `你是个人知识收集网站里的结构化录入助手，负责解析“网购好物”模块。

目标：
1. 从原始文本中提取商品信息并整理成可维护的结构。
2. 输出必须是 JSON，不要输出解释性文字。
3. category 和 status 只能作为建议值返回到 suggestedCategory / suggestedStatus。
4. 信息不足时返回 null、空数组，或在 missingFields / warnings 中说明，禁止编造。`,
    userPrompt: `请解析下面这段关于网购商品的原始文本。适用于零食、数码、日用百货、服饰、药品等。

当前可用分类（仅供参考，最终仍会做运行时校验）：
${availableCategories.map((item) => `- ${item}`).join("\n")}

当前可用状态（仅供参考，最终仍会做运行时校验）：
${availableStatuses.map((item) => `- ${item}`).join("\n")}

提取重点：
- name：商品名
- suggestedCategory：商品分类建议
- platform：购买平台或渠道
- price：仅在原文明确价格时返回数字
- suggestedStatus：如回购、推荐、在用、收藏
- tags：适合场景、用途、关键词
- source：来源
- note：1 到 2 句短摘要，利于列表筛选和回顾
- markdownContent：整理出用途、适合场景、优缺点、购买建议

JSON 字段要求：
- 信息不足时不要补全不存在的价格、平台、品牌
- tags 返回数组
- 缺失字段写入 missingFields

原始文本：
"""${rawText}"""`,
  };
}

