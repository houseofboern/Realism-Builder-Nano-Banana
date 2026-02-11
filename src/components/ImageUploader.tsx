'use client';

import { useCallback, useState } from 'react';

interface Props {
  label: string;
  sublabel: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

export default function ImageUploader({ label, sublabel, value, onChange }: Props) {
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => onChange(reader.result as string);
      reader.readAsDataURL(file);
    },
    [onChange]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => {
        if (value) return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) handleFile(file);
        };
        input.click();
      }}
      className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden group
        ${dragging ? 'border-black bg-gray-50 scale-[1.02]' : 'border-gray-200 hover:border-gray-400'}
        ${value ? 'aspect-auto' : 'aspect-[4/5]'}
      `}
    >
      {value ? (
        <>
          <img src={value} alt={label} className="w-full h-full object-cover rounded-xl" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-gray-500 hover:text-black hover:bg-white transition-all shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className="text-xs text-gray-400 mt-1">{sublabel}</p>
          </div>
        </div>
      )}
    </div>
  );
}
