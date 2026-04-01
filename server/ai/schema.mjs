import { z } from "zod";

const nullableTrimmedString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== "string") {
      return null;
    }

    const normalized = value.trim();
    return normalized ? normalized : null;
  });

const nullableNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    const normalized = value.trim();

    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : value;
  }

  return value;
}, z.number().nullable());

const normalizedStringArray = z
  .union([z.array(z.string()), z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (Array.isArray(value)) {
      return value
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (typeof value === "string") {
      return value
        .split(/[,\n，、/]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  });

export const aiParseRequestSchema = z.object({
  moduleId: z.enum(["offline", "shopping", "websites"]),
  rawText: z.string().trim().min(1, "请先输入原始文本。"),
});

export const aiModelOutputSchema = z
  .object({
    name: nullableTrimmedString,
    suggestedCategory: nullableTrimmedString,
    categoryReason: nullableTrimmedString,
    categoryConfidence: nullableNumber,
    suggestedStatus: nullableTrimmedString,
    statusReason: nullableTrimmedString,
    statusConfidence: nullableNumber,
    tags: normalizedStringArray,
    source: nullableTrimmedString,
    note: nullableTrimmedString,
    markdownContent: nullableTrimmedString,
    missingFields: normalizedStringArray,
    warnings: normalizedStringArray,
    location: nullableTrimmedString,
    rating: nullableNumber,
    platform: nullableTrimmedString,
    price: nullableNumber,
    domain: nullableTrimmedString,
    access: nullableTrimmedString,
    content: nullableTrimmedString,
    purpose: nullableTrimmedString,
    siteContentSummary: nullableTrimmedString,
    sitePurpose: nullableTrimmedString,
  })
  .strip();

export const aiModelOutputJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: ["string", "null"] },
    suggestedCategory: { type: ["string", "null"] },
    categoryReason: { type: ["string", "null"] },
    categoryConfidence: { type: ["number", "null"] },
    suggestedStatus: { type: ["string", "null"] },
    statusReason: { type: ["string", "null"] },
    statusConfidence: { type: ["number", "null"] },
    tags: {
      type: "array",
      items: { type: "string" },
    },
    source: { type: ["string", "null"] },
    note: { type: ["string", "null"] },
    markdownContent: { type: ["string", "null"] },
    missingFields: {
      type: "array",
      items: { type: "string" },
    },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
    location: { type: ["string", "null"] },
    rating: { type: ["number", "null"] },
    platform: { type: ["string", "null"] },
    price: { type: ["number", "null"] },
    domain: { type: ["string", "null"] },
    access: { type: ["string", "null"] },
    content: { type: ["string", "null"] },
    purpose: { type: ["string", "null"] },
    siteContentSummary: { type: ["string", "null"] },
    sitePurpose: { type: ["string", "null"] },
  },
  required: [
    "name",
    "suggestedCategory",
    "categoryReason",
    "categoryConfidence",
    "suggestedStatus",
    "statusReason",
    "statusConfidence",
    "tags",
    "source",
    "note",
    "markdownContent",
    "missingFields",
    "warnings",
    "location",
    "rating",
    "platform",
    "price",
    "domain",
    "access",
    "content",
    "purpose",
    "siteContentSummary",
    "sitePurpose",
  ],
};
