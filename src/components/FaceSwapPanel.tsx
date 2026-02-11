'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { labelImage } from '@/lib/labelImage';
import { buildImg2ImgPrompt } from '@/lib/prompts';

interface Props {
  onImageGenerated: (image: string, prompt: string) => void;
}

export default function FaceSwapPanel({ onImageGenerated }: Props) {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [targetImage, setTargetImage] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [clothingSource, setClothingSource] = useState<'target' | 'source'>('target');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback((file: File, setter: (url: string) => void) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, setter: (url: string) => void) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file, setter);
  }, [handleFile]);

  const generate = async () => {
    if (!sourceImage || !targetImage) return;
    setLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const [labeledSource, labeledTarget] = await Promise.all([
        labelImage(sourceImage, 'SOURCE_IDENTITY_REFERENCE'),
        labelImage(targetImage, 'TARGET_SCENE_CONTEXT'),
      ]);

      const prompt = buildImg2ImgPrompt({
        clothingSource,
        customPrompt: customPrompt || 'Transplant the source identity into the target scene naturally.',
        imageSize: '2K',
      });

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, images: [labeledSource, labeledTarget] }),
      });

      const data = await res.json();
      if (data.image) {
        setGeneratedImage(data.image);
        onImageGenerated(data.image, prompt);
      } else {
        setError(data.error || 'Generation failed');
      }
    } catch {
      setError('Network error — try again');
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!generatedImage) return;
    const a = document.createElement('a');
    a.href = generatedImage;
    a.download = `faceswap-${Date.now()}.png`;
    a.click();
  };

  const hoveredSetterRef = useRef<((url: string) => void) | null>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!hoveredSetterRef.current) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            e.stopImmediatePropagation();
            handleFile(file, hoveredSetterRef.current);
            return;
          }
        }
      }
    };
    document.addEventListener('paste', handlePaste, { capture: true });
    return () => document.removeEventListener('paste', handlePaste, { capture: true });
  }, [handleFile]);

  const UploadZone = ({ label, sublabel, image, onSet, onClear }: {
    label: string; sublabel: string; image: string | null;
    onSet: (url: string) => void; onClear: () => void;
  }) => (
    <div
      className="flex-1"
      onMouseEnter={() => { hoveredSetterRef.current = onSet; }}
      onMouseLeave={() => { hoveredSetterRef.current = null; }}
    >
      <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
      <p className="text-[10px] text-gray-400 mb-2">{sublabel}</p>
      {image ? (
        <div className="relative group">
          <img src={image} alt={label} className="w-full rounded-2xl object-cover aspect-[3/4]" />
          <button
            onClick={onClear}
            className="absolute top-2 right-2 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          >
            ×
          </button>
        </div>
      ) : (
        <label
          onDrop={(e) => handleDrop(e, onSet)}
          onDragOver={(e) => e.preventDefault()}
          className="flex flex-col items-center justify-center aspect-[3/4] border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-gray-300 hover:bg-gray-50/50 transition-colors"
        >
          <svg className="w-6 h-6 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-xs text-gray-400">Upload, drop, or paste</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file, onSet);
            }}
          />
        </label>
      )}
    </div>
  );

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-xl mx-auto space-y-6">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Face Swap</h2>
            <p className="text-xs text-gray-400 mt-0.5">Upload a source identity and the image to copy</p>
          </div>

          <div className="flex gap-4">
            <UploadZone
              label="Source Identity"
              sublabel="The face to transplant"
              image={sourceImage}
              onSet={setSourceImage}
              onClear={() => setSourceImage(null)}
            />
            <UploadZone
              label="Target Scene"
              sublabel="The image to replicate"
              image={targetImage}
              onSet={setTargetImage}
              onClear={() => setTargetImage(null)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Instructions (optional)</label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Any specific instructions..."
              rows={3}
              className="mt-1 w-full bg-gray-50 rounded-xl px-4 py-3 text-sm resize-none outline-none placeholder:text-gray-400 border border-gray-100 focus:border-gray-200 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Clothing from:</span>
            <button
              onClick={() => setClothingSource('target')}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                clothingSource === 'target' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              Target Scene
            </button>
            <button
              onClick={() => setClothingSource('source')}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                clothingSource === 'source' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              Source Identity
            </button>
          </div>

          <button
            onClick={generate}
            disabled={!sourceImage || !targetImage || loading}
            className="w-full py-3 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-30"
          >
            {loading ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>

      <div className="w-96 shrink-0 border-l border-gray-100 flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold tracking-tight">Output</h2>
          <p className="text-xs text-gray-400 mt-0.5">Generated result</p>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {generatedImage ? (
            <div className="space-y-4">
              <img src={generatedImage} alt="Generated" className="w-full rounded-2xl shadow-sm" />
              <div className="flex gap-2">
                <button onClick={download} className="flex-1 py-2.5 text-xs font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                  Download
                </button>
                <button onClick={generate} disabled={loading} className="flex-1 py-2.5 text-xs font-medium bg-black text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40">
                  Regenerate
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="w-10 h-10 border-2 border-gray-200 border-t-black rounded-full animate-spin mx-auto" />
                <p className="text-xs text-gray-400">Generating...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <p className="text-sm text-red-500">{error}</p>
                <button onClick={generate} className="px-4 py-2 text-xs font-medium bg-black text-white rounded-full hover:bg-gray-800 transition-colors">
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-gray-300">Upload both images and hit Generate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
