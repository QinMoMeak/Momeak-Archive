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
import { useI18n } from "@/providers/I18nProvider";

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
  const { t } = useI18n();
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
      setError(t("auth.passwordRequired"));
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
          : t("auth.loginFailed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[28px] border-0 p-0">
        <div className="border-b border-slate-100 bg-slate-900 px-6 py-5 text-white dark:border-slate-800 dark:bg-slate-100 dark:text-slate-950">
          <DialogHeader>
            <DialogTitle className="text-xl">{t("page.adminLogin")}</DialogTitle>
            <DialogDescription className="mt-2 text-slate-300 dark:text-slate-600">
              {t("auth.loginDescription")}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 p-6 dark:bg-slate-950">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {t("auth.password")}
            </label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("auth.passwordPlaceholder")}
            />
          </div>

          {defaultPasswordHint && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              {t("auth.defaultPasswordHint")}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? t("auth.verifying") : t("auth.enterAdminMode")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
