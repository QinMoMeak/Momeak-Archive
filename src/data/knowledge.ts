import inboxData from "../../data/inbox.json";
import offlineData from "../../data/offline.json";
import shoppingData from "../../data/shopping.json";
import taxonomyData from "../../data/taxonomy.json";
import websitesData from "../../data/websites.json";
import type {
  InboxEntry,
  KnowledgeData,
  ModuleDefinition,
  ModuleId,
  OfflineEntry,
  ShoppingEntry,
  WebsiteEntry,
} from "@/types/knowledge";

export const moduleDefinitions: Record<ModuleId, ModuleDefinition> = {
  offline: {
    id: "offline",
    label: "\u7ebf\u4e0b\u597d\u5e97",
    description:
      "\u996d\u5e97\u3001\u4f4f\u5bbf\u3001\u666f\u70b9\u7b49\u503c\u5f97\u53cd\u590d\u56de\u770b\u7684\u5730\u70b9",
    summary:
      "\u8bb0\u5f55\u771f\u5b9e\u53bb\u8fc7\u3001\u60f3\u53bb\u6216\u51c6\u5907\u957f\u671f\u6536\u85cf\u7684\u7ebf\u4e0b\u5730\u70b9\u3002",
    iconKey: "store",
    tableHeaders: [
      "\u540d\u79f0",
      "\u5206\u7c7b",
      "\u5730\u70b9",
      "\u8bc4\u5206",
      "\u72b6\u6001",
      "\u6807\u7b7e",
    ],
    primaryFieldLabel: "\u5730\u70b9",
    secondaryFieldLabel: "\u8bc4\u5206",
    defaultCategories: taxonomyData.categories.offline,
    defaultStatuses: [
      "\u60f3\u53bb",
      "\u5e38\u53bb",
      "\u53bb\u8fc7",
      "\u6536\u85cf",
    ],
  },
  shopping: {
    id: "shopping",
    label: "\u7f51\u8d2d\u597d\u7269",
    description:
      "\u96f6\u98df\u3001\u6570\u7801\u3001\u65e5\u7528\u767e\u8d27\u3001\u670d\u9970\u3001\u836f\u54c1\u7b49",
    summary:
      "\u4fdd\u7559\u771f\u6b63\u503c\u5f97\u56de\u8d2d\u3001\u63a8\u8350\u548c\u7ee7\u7eed\u89c2\u5bdf\u7684\u5546\u54c1\u3002",
    iconKey: "shoppingBag",
    tableHeaders: [
      "\u540d\u79f0",
      "\u5206\u7c7b",
      "\u5e73\u53f0",
      "\u4ef7\u683c",
      "\u72b6\u6001",
      "\u6807\u7b7e",
    ],
    primaryFieldLabel: "\u5e73\u53f0",
    secondaryFieldLabel: "\u4ef7\u683c",
    defaultCategories: taxonomyData.categories.shopping,
    defaultStatuses: [
      "\u56de\u8d2d",
      "\u63a8\u8350",
      "\u5728\u7528",
      "\u6536\u85cf",
    ],
  },
  websites: {
    id: "websites",
    label: "\u7f51\u7ad9\u6536\u96c6",
    description:
      "\u57df\u540d\u3001\u7f51\u7ad9\u5185\u5bb9\u3001\u7528\u9014\u3001\u662f\u5426\u53ef\u8bbf\u95ee\u7b49",
    summary:
      "\u6309\u7528\u9014\u6574\u7406\u7f51\u7ad9\uff0c\u800c\u4e0d\u662f\u8ba9\u6d4f\u89c8\u5668\u4e66\u7b7e\u7ee7\u7eed\u5931\u63a7\u3002",
    iconKey: "globe",
    tableHeaders: [
      "\u540d\u79f0",
      "\u5206\u7c7b",
      "\u57df\u540d",
      "\u53ef\u8bbf\u95ee",
      "\u72b6\u6001",
      "\u6807\u7b7e",
    ],
    primaryFieldLabel: "\u57df\u540d",
    secondaryFieldLabel: "\u53ef\u8bbf\u95ee",
    defaultCategories: taxonomyData.categories.websites,
    defaultStatuses: [
      "\u5e38\u7528",
      "\u63a8\u8350",
      "\u6536\u85cf",
      "\u89c2\u5bdf\u4e2d",
    ],
  },
  inbox: {
    id: "inbox",
    label: "\u5f85\u5904\u7406",
    description:
      "\u5148\u6536\u8d77\u6765\u7684\u94fe\u63a5\u3001\u7247\u6bb5\u3001\u60f3\u6cd5\u548c\u5176\u4ed6\u539f\u59cb\u5185\u5bb9",
    summary:
      "\u5148\u4fdd\u5b58\u539f\u59cb\u5185\u5bb9\uff0c\u4e0d\u5f3a\u8feb\u5f53\u4e0b\u5b8c\u6210\u7ed3\u6784\u5316\u6574\u7406\uff0c\u540e\u7eed\u518d\u7528 AI \u5206\u6790\u6216\u8f6c\u79fb\u5230\u6b63\u5f0f\u6a21\u5757\u3002",
    iconKey: "inbox",
    tableHeaders: [
      "\u6807\u9898",
      "\u5206\u7c7b",
      "\u539f\u59cb\u5185\u5bb9\u6458\u8981",
      "AI \u6458\u8981",
      "\u72b6\u6001",
      "\u6807\u7b7e",
    ],
    primaryFieldLabel: "\u539f\u59cb\u5185\u5bb9",
    secondaryFieldLabel: "AI \u6458\u8981",
    defaultCategories: taxonomyData.categories.inbox,
    defaultStatuses: [
      "\u672a\u5904\u7406",
      "\u5df2\u5206\u6790",
      "\u5df2\u6574\u7406",
      "\u5df2\u5f52\u6863",
    ],
  },
};

export const moduleList = Object.values(moduleDefinitions);

export const initialKnowledgeData: KnowledgeData = {
  offline: offlineData as OfflineEntry[],
  shopping: shoppingData as ShoppingEntry[],
  websites: websitesData as WebsiteEntry[],
  inbox: inboxData as InboxEntry[],
};
