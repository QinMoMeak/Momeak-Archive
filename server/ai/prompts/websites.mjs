function formatList(title, values) {
  if (!values?.length) {
    return `${title}\n- 暂无`;
  }

  return `${title}\n${values.map((item) => `- ${item}`).join("\n")}`;
}

function formatReaderContext(readerContexts = []) {
  if (!readerContexts.length) {
    return "Reader 结果：\n- 本次没有可用的 Reader 内容。";
  }

  return [
    "Reader 结果：",
    ...readerContexts.map((context, index) => {
      const lines = [
        `- 候选 ${index + 1}`,
        `  - URL：${context.normalizedUrl || "未知"}`,
        `  - 域名：${context.domain || "未知"}`,
        `  - 状态：${context.statusLabel}`,
        `  - 正文长度：${context.contentLength || 0}`,
      ];

      if (context.metaSummary) {
        lines.push(`  - Meta：${context.metaSummary}`);
      }

      if (context.markdown) {
        lines.push(`  - Markdown：\n${context.markdown}`);
      }

      if (context.warnings?.length) {
        lines.push(`  - 警告：${context.warnings.join("；")}`);
      }

      return lines.join("\n");
    }),
  ].join("\n");
}

export function buildWebsitesPrompt({
  rawText,
  mode = "single",
  extractedDomain = "",
  normalizedUrl = "",
  extractedDomains = [],
  availableCategories = [],
  availableStatuses = [],
  readerContext = null,
  readerContexts = [],
}) {
  const multipleHint =
    mode === "multiple"
      ? "当前是多条解析模式。若输入里出现多个网址、多个网站名称、榜单、合集、导航清单或多项目列表，请优先拆成多条独立网站候选。不要把整段网站合集压成一条记录。"
      : "当前是单条解析模式。请把整段内容尽量整理成一条网站记录。";

  const outputHint =
    mode === "multiple"
      ? "输出必须是一个 JSON 对象：{ entries: [...], warnings: [] }。entries 中每一项都是一条网站候选。"
      : "输出必须是一个 JSON 对象，对应单条网站记录。";

  const readerSection =
    mode === "multiple"
      ? formatReaderContext(readerContexts)
      : formatReaderContext(readerContext ? [readerContext] : []);

  return {
    systemPrompt: `你是个人知识库里的“网站收集”录入助手，负责把原始文本整理成长期可维护的网站条目。
${multipleHint}
${outputHint}

必须遵守：
1. 原始内容里应尽量包含 URL、域名或明确的网站名称线索。
2. 优先提取真实域名。domain 是关键字段，如果无法可靠确定，请返回 null，并把 "domain" 放进 missingFields。
3. 如果没有网站线索，不要编造网站用途、访问状态或核心内容。
4. note / markdownContent 要重点整理：网站内容、网站用途、适合场景、特点。
5. access 只有在信息明确时才返回，否则返回 null。
6. suggestedCategory / suggestedStatus 只是建议值，不能假设一定可直接落库。
7. 多条模式下，每个对象尽量独立成条。`,
    userPrompt: `请解析下面这段网站相关内容。

${formatList("当前可用分类（仅供参考，最终仍会做运行时校验）：", availableCategories)}

${formatList("当前可用状态（仅供参考，最终仍会做运行时校验）：", availableStatuses)}

预检测到的域名线索：
${mode === "multiple"
  ? extractedDomains.length
    ? extractedDomains.map((item) => `- ${item}`).join("\n")
    : "- 未检测到"
  : `- ${extractedDomain || "未检测到"}`}

规范化 URL：
${mode === "multiple"
  ? readerContexts.length
    ? readerContexts.map((item) => `- ${item.normalizedUrl || "未知"}`).join("\n")
    : "- 未生成"
  : `- ${normalizedUrl || "未生成"}`}

${readerSection}

字段要求：
- name：网站名称
- domain：真实域名
- suggestedCategory：建议分类
- suggestedStatus：建议状态
- access：仅返回“可访问 / 部分可访问 / 不可访问”之一，无法判断就返回 null
- tags：短标签数组
- source：来源
- note：适合列表展示的摘要
- markdownContent：适合详情展示的 Markdown
- siteContentSummary：网站主要内容
- sitePurpose：网站用途 / 适合场景
- missingFields：无法确定的关键字段
- warnings：风险提示

重要限制：
- 如果文本里有多个网址，请优先拆成多条。
- 如果只有网站名称但没有完整 URL，可以谨慎推断 domain，但必须在 warnings 里提醒用户确认。
- 如果 Reader 内容不足，不要编造网站用途。

原始文本：
"""${rawText}"""`,
  };
}
