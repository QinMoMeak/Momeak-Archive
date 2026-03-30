import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  ExternalLink,
  Globe,
  MapPin,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Tag,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type ModuleId = "offline" | "shopping" | "websites";

type ModuleDefinition = {
  id: ModuleId;
  label: string;
  icon: LucideIcon;
  description: string;
};

type BaseItem = {
  id: number;
  name: string;
  category: string;
  status: string;
  tags: string[];
  note: string;
  source: string;
  time: string;
};

type OfflineItem = BaseItem & {
  location: string;
  rating: string;
};

type ShoppingItem = BaseItem & {
  platform: string;
  price: string;
};

type WebsiteItem = BaseItem & {
  domain: string;
  access: string;
};

type ModuleRow = OfflineItem | ShoppingItem | WebsiteItem;

const modules: ModuleDefinition[] = [
  {
    id: "offline",
    label: "线下好店",
    icon: Store,
    description: "餐厅、住宿、景点等",
  },
  {
    id: "shopping",
    label: "网购好物",
    icon: ShoppingBag,
    description: "零食、数码、日用百货、服饰、药品等",
  },
  {
    id: "websites",
    label: "网站收集",
    icon: Globe,
    description: "域名、用途、可访问性等",
  },
];

const data: Record<ModuleId, ModuleRow[]> = {
  offline: [
    {
      id: 1,
      name: "山野食堂",
      category: "餐厅",
      location: "杭州 · 西湖区",
      rating: "4.8",
      status: "常去",
      tags: ["本地菜", "环境好", "适合朋友聚餐"],
      note: "适合周末聚餐，招牌鱼汤和桂花藕粉很值得再点一次。",
      source: "朋友推荐",
      time: "2026-03-18",
    },
    {
      id: 2,
      name: "青山里民宿",
      category: "住宿",
      location: "莫干山",
      rating: "4.7",
      status: "想去",
      tags: ["安静", "拍照出片", "周末短住"],
      note: "适合两天一晚放松，院子和早餐评价都不错。",
      source: "小红书收藏",
      time: "2026-03-22",
    },
    {
      id: 3,
      name: "潮汐观景台",
      category: "景点",
      location: "宁波",
      rating: "4.6",
      status: "去过",
      tags: ["日落", "海边", "自驾"],
      note: "推荐傍晚过去，风比较大，适合拍照和散步。",
      source: "旅行清单",
      time: "2026-03-09",
    },
  ],
  shopping: [
    {
      id: 11,
      name: "冻干草莓酸奶块",
      category: "零食",
      platform: "淘宝",
      price: "¥29",
      status: "回购",
      tags: ["低糖", "办公室", "囤货"],
      note: "口感脆，适合作为下午茶零食，冷藏后更好吃。",
      source: "自己买过",
      time: "2026-03-15",
    },
    {
      id: 12,
      name: "65W 氮化镓充电器",
      category: "数码",
      platform: "京东",
      price: "¥99",
      status: "推荐",
      tags: ["轻便", "双口", "出差"],
      note: "手机和电脑都能充，体积小，收纳方便。",
      source: "B站测评",
      time: "2026-03-20",
    },
    {
      id: 13,
      name: "抗菌收纳箱",
      category: "日用百货",
      platform: "拼多多",
      price: "¥42",
      status: "在用",
      tags: ["收纳", "搬家", "高性价比"],
      note: "透明可视，尺寸适合放在衣柜上层或床底。",
      source: "自己买过",
      time: "2026-03-11",
    },
  ],
  websites: [
    {
      id: 21,
      name: "CloudConvert",
      category: "文件工具",
      domain: "cloudconvert.com",
      access: "可访问",
      status: "常用",
      tags: ["格式转换", "在线工具", "效率"],
      note: "适合处理文档、图片、音视频格式转换，界面很干净。",
      source: "搜索发现",
      time: "2026-03-17",
    },
    {
      id: 22,
      name: "Remove.bg",
      category: "AI 工具",
      domain: "remove.bg",
      access: "可访问",
      status: "推荐",
      tags: ["抠图", "设计", "图片处理"],
      note: "适合快速抠图，免费额度有限，临时用很高效。",
      source: "设计群",
      time: "2026-03-13",
    },
    {
      id: 23,
      name: "Notion Widgets",
      category: "资源网站",
      domain: "widgetbox.app",
      access: "部分可访问",
      status: "收藏",
      tags: ["组件", "Notion", "美化"],
      note: "适合收集各种嵌入式组件和美化小工具。",
      source: "博客文章",
      time: "2026-03-05",
    },
  ],
};

const columnMap: Record<ModuleId, string[]> = {
  offline: ["名称", "分类", "地点", "评分", "状态", "标签"],
  shopping: ["名称", "分类", "平台", "价格", "状态", "标签"],
  websites: ["名称", "分类", "域名", "可访问", "状态", "标签"],
};

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: number | string;
  hint: string;
}) {
  return (
    <Card className="rounded-2xl border-0 bg-white/80 shadow-sm backdrop-blur">
      <CardContent className="p-5">
        <div className="text-sm text-slate-500">{title}</div>
        <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
        <div className="mt-1 text-xs text-slate-400">{hint}</div>
      </CardContent>
    </Card>
  );
}

function getPrimaryMeta(item: ModuleRow) {
  if ("location" in item) {
    return item.location;
  }

  if ("platform" in item) {
    return item.platform;
  }

  return item.domain;
}

function getSecondaryMeta(item: ModuleRow) {
  if ("rating" in item) {
    return item.rating;
  }

  if ("price" in item) {
    return item.price;
  }

  return item.access;
}

export default function PersonalKnowledgeSiteUIMockup() {
  const [activeModule, setActiveModule] = useState<ModuleId>("offline");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<ModuleRow | null>(null);

  const rows = data[activeModule];

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return rows;
    }

    return rows.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(query),
    );
  }, [rows, search]);

  const currentModule = modules.find((module) => module.id === activeModule) ?? modules[0];
  const Icon = currentModule.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="flex w-full flex-col justify-between border-b border-slate-200 bg-white/80 p-5 backdrop-blur-xl lg:w-[280px] lg:border-b-0 lg:border-r">
          <div>
            <div className="mb-8">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Personal KB
              </div>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                个人知识收集站
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                数据与条目都托管在 GitHub，像个人版 Notion 一样管理你的线下体验、网购好物与网站收藏。
              </p>
            </div>

            <div className="space-y-2">
              {modules.map((module) => {
                const ModuleIcon = module.icon;
                const active = activeModule === module.id;

                return (
                  <button
                    key={module.id}
                    onClick={() => setActiveModule(module.id)}
                    className={`w-full rounded-2xl p-4 text-left transition-all ${
                      active
                        ? "bg-slate-900 text-white shadow-lg"
                        : "bg-slate-50 text-slate-800 hover:bg-slate-100"
                    }`}
                    type="button"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`rounded-xl p-2 ${
                          active ? "bg-white/15" : "bg-white"
                        }`}
                      >
                        <ModuleIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium">{module.label}</div>
                        <div
                          className={`mt-1 text-xs ${
                            active ? "text-slate-300" : "text-slate-500"
                          }`}
                        >
                          {module.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <Card className="mt-6 rounded-2xl border-0 bg-slate-900 text-white shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm font-medium">GitHub 驱动</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                建议后续使用 GitHub Pages + JSON/Markdown 数据源，实现低成本、可追踪、可长期维护。
              </div>
            </CardContent>
          </Card>
        </aside>

        <main className="flex-1 p-6 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-slate-500 shadow-sm">
                  <Icon className="h-3.5 w-3.5" /> 当前模块
                </div>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                  {currentModule.label}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  表格总览 + 单项详情弹窗，适合做持续积累型个人知识库。
                </p>
              </div>

              <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="搜索名称、标签、备注、来源..."
                    className="h-11 rounded-xl border-slate-200 bg-white pl-9"
                  />
                </div>
                <Button className="h-11 rounded-xl px-5">新增条目</Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <StatCard title="总条目" value={rows.length} hint="当前模块统计" />
              <StatCard title="高频收藏" value="12" hint="可扩展为自动统计" />
              <StatCard title="最近更新" value="3 天" hint="适合接入 Git 提交记录同步" />
            </div>

            <Card className="rounded-[24px] border-0 bg-white/85 shadow-sm backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">表格总览</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="grid grid-cols-6 gap-3 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
                    {columnMap[activeModule].map((column) => (
                      <div key={column}>{column}</div>
                    ))}
                  </div>

                  <div className="divide-y divide-slate-100 bg-white">
                    {filteredRows.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="grid w-full grid-cols-6 items-center gap-3 px-4 py-4 text-left transition hover:bg-slate-50"
                        type="button"
                      >
                        <div className="font-medium text-slate-800">{item.name}</div>
                        <div className="text-slate-500">{item.category}</div>
                        <div className="truncate text-slate-500">{getPrimaryMeta(item)}</div>
                        <div className="text-slate-500">{getSecondaryMeta(item)}</div>
                        <div>
                          <Badge
                            variant="secondary"
                            className="rounded-full px-2.5 py-0.5 text-xs"
                          >
                            {item.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {item.tags.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="rounded-full bg-slate-100 text-slate-600"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </button>
                    ))}

                    {filteredRows.length === 0 && (
                      <div className="px-4 py-10 text-center text-sm text-slate-500">
                        没有匹配到相关内容。
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>

      <Dialog
        open={selectedItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItem(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl overflow-hidden rounded-[28px] border-0 p-0">
          {selectedItem && (
            <div className="bg-white">
              <div className="border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-700 p-6 text-white">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-semibold">
                    {selectedItem.name}
                  </DialogTitle>
                  <DialogDescription className="mt-2 text-slate-300">
                    查看详细信息、来源、标签与补充备注
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="grid gap-6 p-6 md:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-5">
                  <div>
                    <div className="text-sm font-medium text-slate-500">
                      详细备注
                    </div>
                    <p className="mt-2 text-sm leading-7 text-slate-700">
                      {selectedItem.note}
                    </p>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-slate-500">标签</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedItem.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="rounded-full bg-slate-100 text-slate-700"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-3 text-sm text-slate-700">
                    <Tag className="h-4 w-4 text-slate-400" />
                    分类：{selectedItem.category}
                  </div>
                  {"location" in selectedItem && (
                    <div className="flex items-center gap-3 text-sm text-slate-700">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      地点：{selectedItem.location}
                    </div>
                  )}
                  {"rating" in selectedItem && (
                    <div className="flex items-center gap-3 text-sm text-slate-700">
                      <Star className="h-4 w-4 text-slate-400" />
                      评分：{selectedItem.rating}
                    </div>
                  )}
                  {"platform" in selectedItem && (
                    <div className="flex items-center gap-3 text-sm text-slate-700">
                      <ShoppingBag className="h-4 w-4 text-slate-400" />
                      平台：{selectedItem.platform}
                    </div>
                  )}
                  {"domain" in selectedItem && (
                    <div className="flex items-center gap-3 text-sm text-slate-700">
                      <ExternalLink className="h-4 w-4 text-slate-400" />
                      域名：{selectedItem.domain}
                    </div>
                  )}
                  {"access" in selectedItem && (
                    <div className="flex items-center gap-3 text-sm text-slate-700">
                      <ShieldCheck className="h-4 w-4 text-slate-400" />
                      访问状态：{selectedItem.access}
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm text-slate-700">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    收录时间：{selectedItem.time}
                  </div>
                  <div className="rounded-xl bg-white p-3 text-sm text-slate-600">
                    来源：{selectedItem.source}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
