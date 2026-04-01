function formatList(title, values) {
  if (!values?.length) {
    return `${title}\n- 暂无`;
  }

  return `${title}\n${values.map((item) => `- ${item}`).join("\n")}`;
}

export function buildOfflinePrompt({
  rawText,
  mode = "single",
  availableCategories = [],
  availableStatuses = [],
}) {
  const multipleHint =
    mode === "multiple"
      ? "当前是多条解析模式。请优先把榜单、清单、表格、序号列表里的不同店铺、景点或住宿拆成多条独立候选。若无法可靠拆分，再返回较少的条目，不要硬拆。"
      : "当前是单条解析模式。请把整段内容尽量聚合成一条最有代表性的记录。";

  const outputHint =
    mode === "multiple"
      ? "输出必须是一个 JSON 对象：{ entries: [...], warnings: [] }。entries 中每一项都是一条候选记录。"
      : "输出必须是一个 JSON 对象，对应单条记录。";

  return {
    systemPrompt: `你是个人知识库里的“线下好店”录入助手，负责从原始文本中提取饭店、住宿、景点、咖啡店、茶馆等线下地点信息。
${multipleHint}
${outputHint}

规则：
1. category 和 status 只作为建议值，分别返回到 suggestedCategory / suggestedStatus。
2. 信息不足时返回 null、空数组，或在 missingFields / warnings 里说明，不要编造。
3. note 适合列表摘要；markdownContent 适合详情阅读。
4. 多条模式下，每条记录尽量独立，不要把整段清单压成一条。`,
    userPrompt: `请解析下面这段关于线下地点的原始内容。

${formatList("当前可用分类（仅供参考，最终仍会做运行时校验）：", availableCategories)}

${formatList("当前可用状态（仅供参考，最终仍会做运行时校验）：", availableStatuses)}

字段要求：
- name：地点名称
- suggestedCategory：建议分类，如饭店 / 住宿 / 景点 / 咖啡店 / 茶馆
- location：城市、商圈、地标、区域等
- suggestedStatus：建议状态
- tags：短标签数组
- source：来源
- note：1 到 2 句摘要
- markdownContent：适合详情展示的 Markdown
- rating：仅在文本明确提到时返回数值
- missingFields：无法确定的关键字段
- warnings：需要用户确认的风险提示

原始文本：
"""${rawText}"""`,
  };
}
