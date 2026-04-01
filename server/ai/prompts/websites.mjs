function formatList(title, values) {
  if (!values || values.length === 0) {
    return `${title}：\n- 暂无`;
  }

  return `${title}：\n${values.map((item) => `- ${item}`).join("\n")}`;
}

function formatReaderContext(readerContext) {
  if (!readerContext || !readerContext.used) {
    return [
      "Reader 读取结果：",
      "- 本次未调用 Reader，或没有检测到可读取的网址线索。",
    ].join("\n");
  }

  const lines = [
    "Reader 读取结果：",
    `- 调用状态：${readerContext.statusLabel}`,
    `- 规范化 URL：${readerContext.normalizedUrl || "无"}`,
    `- 域名：${readerContext.domain || "无"}`,
    `- 内容长度：${readerContext.contentLength} 字符`,
  ];

  if (readerContext.metaSummary) {
    lines.push("- Reader meta 摘要：", readerContext.metaSummary);
  }

  if (readerContext.markdown) {
    lines.push("- Reader markdown 内容（可能已裁剪）：", readerContext.markdown);
  }

  if (readerContext.warnings.length > 0) {
    lines.push(
      "- Reader 警告：",
      ...readerContext.warnings.map((item) => `  - ${item}`),
    );
  }

  return lines.join("\n");
}

export function buildWebsitesPrompt(context) {
  const {
    availableCategories,
    availableStatuses,
    rawText,
    extractedDomain,
    normalizedUrl,
    readerContext,
  } = context;

  return {
    systemPrompt: `你是个人知识收集网站里的结构化录入助手，负责“网站收集”模块。

必须严格遵守以下规则：
1. 输入内容应当包含 URL、域名，或至少有明确的网站名称线索。
2. 优先提取真实域名，domain 字段必须尽量返回真实域名；如果无法可靠确定，返回 null，并把 "domain" 放进 missingFields。
3. 如果原始文本完全没有网站线索，不要编造网站信息；必须通过 missingFields 和 warnings 明确提示信息不足。
4. 如果 Reader 没有提供足够内容，不要编造网站用途、可访问性或核心内容。
5. category 和 status 只能作为建议值，分别写入 suggestedCategory / suggestedStatus。
6. 输出必须是 JSON，不要输出解释性文字。
7. note 要重点整理：网站内容、网站用途、适合场景、特点。
8. markdownContent 要写成适合长期维护的知识库记录，优先使用二级标题和简洁要点。
9. 如果 access 无法判断，返回 null，不要猜测。
10. 同时输出 siteContentSummary 和 sitePurpose；如果无法判断则返回 null。`,
    userPrompt: `请分析下面这段网站信息，并输出结构化 JSON。

${formatList("当前可用分类（仅供参考，最终会做运行时校验）", availableCategories)}

${formatList("当前可用状态（仅供参考，最终会做运行时校验）", availableStatuses)}

预检测到的域名线索：
- ${extractedDomain || "未检测到明确域名"}

规范化 URL：
- ${normalizedUrl || "未生成"}

${formatReaderContext(readerContext)}

字段要求：
- name：网站名称
- domain：真实域名
- suggestedCategory：建议分类
- suggestedStatus：建议状态
- access：仅在信息明确时返回“可访问 / 部分可访问 / 不可访问”
- tags：短标签数组
- source：来源
- note：简洁摘要，重点整理“网站内容 + 网站用途 + 适合场景 + 特点”
- markdownContent：更完整的 Markdown 记录
- siteContentSummary：网站主要内容总结
- sitePurpose：网站用途 / 适用场景
- missingFields：无法确认的关键字段
- warnings：需要用户确认的风险提示

重要限制：
- 如果原文或 Reader 内容里出现 URL，请自动识别并提取域名。
- 如果只有网站名称但没有完整 URL，可以在把握高时推断 domain，但必须在 warnings 中提示用户确认。
- 如果 Reader 内容为空、过少或失败，不要因此编造 sitePurpose、access、content。
- 如果完全没有网站线索，至少把 domain 放进 missingFields，并提示用户补充网址或域名。

原始文本：
"""${rawText}"""`,
  };
}
