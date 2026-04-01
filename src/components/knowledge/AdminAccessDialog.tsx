import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type AdminAccessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (password: string) => Promise<void> | void;
  defaultPasswordHint?: boolean;
};

export function AdminAccessDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultPasswordHint = false,
}: AdminAccessDialogProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setError("");
      setIsSubmitting(false);
    }
  }, [open]);

  async function handleSubmit() {
    if (!password.trim()) {
      setError("\u8bf7\u8f93\u5165\u7ba1\u7406\u5458\u5bc6\u7801\u3002");
      return;
    }

    try {
      setError("");
      setIsSubmitting(true);
      await onSubmit(password);
      onOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "\u767b\u5f55\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[28px] border-0 p-0">
        <div className="border-b border-slate-100 bg-slate-900 px-6 py-5 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {"\u7ba1\u7406\u5458\u767b\u5f55"}
            </DialogTitle>
            <DialogDescription className="mt-2 text-slate-300">
              {
                "\u767b\u5f55\u540e\u5c06\u5728\u5f53\u524d\u9875\u9762\u76f4\u63a5\u6253\u5f00\u7f16\u8f91\u80fd\u529b\uff0c\u516c\u5f00\u9605\u8bfb\u7ed3\u6784\u4fdd\u6301\u4e0d\u53d8\u3002"
              }
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              {"\u5bc6\u7801"}
            </label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={"\u8f93\u5165\u7ba1\u7406\u5458\u5bc6\u7801"}
            />
          </div>

          {defaultPasswordHint && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {
                "\u672c\u5730\u672a\u914d\u7f6e KNOWLEDGE_ADMIN_PASSWORD\uff0c\u5f53\u524d\u4f7f\u7528\u9ed8\u8ba4\u5bc6\u7801 admin123\u3002\u5efa\u8bae\u5c3d\u5feb\u5728 .env.local \u4e2d\u8986\u76d6\u3002"
              }
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {"\u53d6\u6d88"}
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "\u9a8c\u8bc1\u4e2d..." : "\u8fdb\u5165\u7f16\u8f91\u6a21\u5f0f"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
