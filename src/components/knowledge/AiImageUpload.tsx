import { ImagePlus, Trash2, Upload } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import type { AiInputImage } from "@/types/ai";

type AiImageUploadProps = {
  images: AiInputImage[];
  disabled?: boolean;
  helperText: string;
  onSelectFiles: (files: FileList | File[]) => void;
  onRemoveImage: (imageId: string) => void;
};

export function AiImageUpload({
  images,
  disabled = false,
  helperText,
  onSelectFiles,
  onRemoveImage,
}: AiImageUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function openFilePicker() {
    inputRef.current?.click();
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) {
            onSelectFiles(event.target.files);
            event.target.value = "";
          }
        }}
      />

      <div
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (disabled) {
            return;
          }

          if (event.dataTransfer.files?.length) {
            onSelectFiles(event.dataTransfer.files);
          }
        }}
        className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-950/80"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-slate-100 p-2.5 text-slate-500 dark:bg-slate-900 dark:text-slate-300">
              <ImagePlus className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                上传截图
              </div>
              <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {helperText}
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={openFilePicker}
            disabled={disabled}
          >
            <Upload className="mr-2 h-4 w-4" />
            选择图片
          </Button>
        </div>
      </div>

      {images.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                <img
                  src={image.dataUrl}
                  alt={image.name}
                  className="h-28 w-full object-cover"
                />
              </div>
              <div className="mt-2 min-w-0">
                <div className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                  {image.name}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {(image.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 h-8 w-full rounded-xl text-rose-600 hover:text-rose-700"
                onClick={() => onRemoveImage(image.id)}
                disabled={disabled}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                删除
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
