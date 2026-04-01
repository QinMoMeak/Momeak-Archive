function formatList(title, values) {
  if (!values?.length) {
    return `${title}\n- 暂无`;
  }

  return `${title}\n${values.map((item) => `- ${item}`).join("\n")}`;
}

export function buildInboxPrompt({
  rawText,
  mode = "single",
  availableCategories = [],
  availableStatuses = [],
}) {
  const multipleHint =
    mode === "multiple"
      ? "当前是多条解析模式。请优先把清单、合集、歌词列表、聊天摘录、多个链接或多个想法拆成多条待处理候选。每条都要保留自己的 rawContent。"
      : "当前是单条解析模式。请把整段内容尽量整理成一条待处理记录。";

  const outputHint =
    mode === "multiple"
      ? "输出必须是一个 JSON 对象：{ entries: [...], warnings: [] }。每条 entry 都要尽量包含 rawContent。"
      : "输出必须是一个 JSON 对象，对应单条待处理记录。";

  return {
    systemPrompt: `你是个人知识库里的“待处理 / Inbox”整理助手。
${multipleHint}
${outputHint}

规则：
1. 这是原始内容收件箱，核心是保留原始内容，不要强迫结构化。
2. rawContent 是最重要字段。多条模式下，每条 entry 必须尽量保留属于自己的原始片段。
3. 你的任务是理解、摘要、打标签、给建议，而不是把内容改写成正式知识条目。
4. 信息不足时返回 null、空数组或 missingFields，不要编造。
5. suggestedCategory、suggestedStatus、suggestedTargetModule 都只是建议值。`,
    userPrompt: `请分析下面这段待处理原始内容。

${formatList("当前可用分类参考：", availableCategories)}

${formatList("当前可用状态参考：", availableStatuses)}

可建议的目标模块：
- offline
- shopping
- websites
- inbox

字段要求：
- name：如果原文没有标题，请生成一个简短标题
- rawContent：原样保留属于该条的原始内容
- detectedContentType：如 blog / review / lyrics / url / note / screenshot-note / idea / mixed / other
- suggestedCategory：建议分类
- suggestedStatus：建议状态
- tags / extractedTags：关键词标签数组
- source：来源
- note：适合列表展示的简短说明
- markdownContent：适合详情展示的 Markdown
- aiSummary：AI 摘要
- suggestedTargetModule：后续更适合去哪个模块，若不明确则返回 inbox
- suggestedNextAction：建议下一步，如“补充来源后转入网站收集”
- confidence：0 到 1 之间
- noteDraft：可直接作为人工补充说明草稿的内容
- missingFields / warnings：不确定项和风险提示

重点：
- 多条模式下，即使结构化信息不足，也要优先保留 rawContent 的拆分结果。
- 不要因为信息不足而拒绝输出待处理候选。

原始文本：
"""${rawText}"""`,
  };
}
