function formatList(title, values) {
  if (!values?.length) {
    return `${title}\n- 暂无`;
  }

  return `${title}\n${values.map((item) => `- ${item}`).join("\n")}`;
}

export function buildShoppingPrompt({
  rawText,
  mode = "single",
  availableCategories = [],
  availableStatuses = [],
}) {
  const multipleHint =
    mode === "multiple"
      ? "当前是多条解析模式。请优先识别榜单、表格、推荐清单里不同商品，并拆成多条候选。红榜商品表、多条评价摘要、合集推荐是重点场景。"
      : "当前是单条解析模式。请把整段内容尽量聚合成一条最适合保存的商品记录。";

  const outputHint =
    mode === "multiple"
      ? "输出必须是一个 JSON 对象：{ entries: [...], warnings: [] }。"
      : "输出必须是一个 JSON 对象，对应单条商品记录。";

  return {
    systemPrompt: `你是个人知识库里的“网购好物”录入助手，负责从原始文本中提取商品信息。
${multipleHint}
${outputHint}

规则：
1. suggestedCategory / suggestedStatus 只是建议值，不要假设一定能直接落库。
2. 信息不足时不要编造价格、平台、品牌、规格。
3. note 用于列表摘要；markdownContent 用于详情展示。
4. 多条模式下，尽量一件商品一条记录。`,
    userPrompt: `请解析下面这段关于网购商品的原始内容。

${formatList("当前可用分类（仅供参考，最终仍会做运行时校验）：", availableCategories)}

${formatList("当前可用状态（仅供参考，最终仍会做运行时校验）：", availableStatuses)}

字段要求：
- name：商品名
- suggestedCategory：建议分类
- platform：平台或购买渠道
- price：仅在文本明确提到时返回数值
- suggestedStatus：建议状态
- tags：短标签数组
- source：来源
- note：适合列表显示的摘要
- markdownContent：适合详情展示的 Markdown
- missingFields：无法确定的关键字段
- warnings：需要人工确认的提示

重点：
- 识别商品用途、适合场景、优缺点
- 红榜商品表、排行榜、多个推荐商品请拆成多条
- 不要把整张表压成一条记录

原始文本：
"""${rawText}"""`,
  };
}
