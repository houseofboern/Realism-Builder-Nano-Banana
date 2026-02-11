'use client';

import { useCallback, useState, useEffect } from 'react';

interface LabeledImage {
  raw: string;
  labeled: string;
  label: string;
}

interface Props {
  title: string;
  sublabel: string;
  labelPrefix: string;
  images: LabeledImage[];
  onChange: (images: LabeledImage[]) => void;
  single?: boolean;
}

export default function ImageRow({ title, sublabel, labelPrefix, images, onChange, single }: Props) {
  const [dragging, setDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const { labelImage } = await import('@/lib/labelImage');
      const newImages: LabeledImage[] = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const raw = await new Promise<string>((res) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result as string);
          reader.readAsDataURL(file);
        });
        const idx = single ? 1 : images.length + newImages.length + 1;
        const label = single ? labelPrefix : `${labelPrefix} ${idx}`;
        const labeled = await labelImage(raw, label);
        newImages.push({ raw, labeled, label });
      }

      if (single) {
        onChange(newImages.slice(0, 1));
      } else {
        onChange([...images, ...newImages]);
      }
    },
    [images, onChange, labelPrefix, single]
  );

  useEffect(() => {
    if (!isHovered) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        e.stopImmediatePropagation();
        addFiles(files);
      }
    };
    document.addEventListener('paste', handlePaste, { capture: true });
    return () => document.removeEventListener('paste', handlePaste, { capture: true });
  }, [isHovered, addFiles]);

  const remove = (index: number) => {
    const next = images.filter((_, i) => i !== index);
    onChange(next);
  };

  const openPicker = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = !single;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) addFiles(files);
    };
    input.click();
  };

  return (
    <div
      className="space-y-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-700">{title}</p>
          <p className="text-[10px] text-gray-400">{sublabel}</p>
        </div>
        {images.length > 0 && (
          <span className="text-[10px] text-gray-300">{images.length}</span>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {images.map((img, i) => (
          <div key={i} className="relative group w-16 h-16 shrink-0">
            <img src={img.raw} alt={img.label} className="w-full h-full object-cover rounded-xl" />
            <div className="absolute bottom-0 left-0 right-0 bg-green-600/90 rounded-b-xl px-1 py-0.5">
              <p className="text-[8px] text-white font-bold text-center truncate">{img.label}</p>
            </div>
            <button
              onClick={() => remove(i)}
              className="absolute -top-1 -right-1 w-4 h-4 bg-black text-white rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        ))}

        {(!single || images.length === 0) && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
            onClick={openPicker}
            className={`w-16 h-16 shrink-0 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all ${
              dragging ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
