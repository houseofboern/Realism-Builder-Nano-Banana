'use client';

import { useState, useCallback } from 'react';
import ImageRow from '@/components/ImageRow';
import ChatPanel from '@/components/ChatPanel';
import GenerationPanel from '@/components/GenerationPanel';
import FaceSwapPanel from '@/components/FaceSwapPanel';
import HistoryDrawer from '@/components/HistoryDrawer';

interface LabeledImage {
  raw: string;
  labeled: string;
  label: string;
}

interface HistoryItem {
  image: string;
  prompt: string;
  timestamp: number;
}

export default function Home() {
  const [mode, setMode] = useState<'home' | 'faceswap'>('home');
  const [faceImages, setFaceImages] = useState<LabeledImage[]>([]);
  const [editTarget, setEditTarget] = useState<LabeledImage[]>([]);
  const [inspirationImages, setInspirationImages] = useState<LabeledImage[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<LabeledImage[]>([]);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState(0);
  const [imageHistory, setImageHistory] = useState<HistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const addToHistory = useCallback((image: string, prompt: string) => {
    setImageHistory(prev => [...prev, { image, prompt, timestamp: Date.now() }]);
  }, []);

  const getAllLabeledImages = useCallback((): string[] => {
    const all: string[] = [];
    for (const img of faceImages) all.push(img.labeled);
    for (const img of editTarget) all.push(img.labeled);
    for (const img of inspirationImages) all.push(img.labeled);
    for (const img of backgroundImage) all.push(img.labeled);
    return all;
  }, [faceImages, editTarget, inspirationImages, backgroundImage]);

  const generate = useCallback(async (prompt: string, images: string[]) => {
    setGenerating(true);
    setError(null);
    setGeneratedImage(null);
    setCurrentPrompt(prompt);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, images }),
      });
      const data = await res.json();
      if (data.image) {
        setGeneratedImage(data.image);
        addToHistory(data.image, prompt);
      } else {
        setError(data.error || 'Generation failed');
      }
    } catch {
      setError('Network error — try again');
    } finally {
      setGenerating(false);
    }
  }, [addToHistory]);

  const handleChatApply = useCallback((prompt: string, chatImages: string[]) => {
    const panelImages = getAllLabeledImages();
    generate(prompt, [...panelImages, ...chatImages]);
  }, [getAllLabeledImages, generate]);

  const handleNewChat = () => {
    setChatKey((k) => k + 1);
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold tracking-tight">Realism Builder</h1>
          <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
            Nano Bannaa Pro
          </span>
          <nav className="flex items-center gap-1 ml-4">
            <button
              onClick={() => setMode('home')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                mode === 'home' ? 'bg-black text-white' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setMode('faceswap')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                mode === 'faceswap' ? 'bg-black text-white' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              Face Swap
            </button>
          </nav>
        </div>
        <button
          onClick={() => setHistoryOpen(true)}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          title="History"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </button>
      </header>

      {mode === 'home' ? (
        <div className="flex-1 flex overflow-hidden">
          <div className="w-72 border-r border-gray-100 p-5 flex flex-col gap-6 overflow-y-auto shrink-0">
            <ImageRow
              title="Face References"
              sublabel="Reinforce the model's identity"
              labelPrefix="Face"
              images={faceImages}
              onChange={setFaceImages}
            />

            <ImageRow
              title="Image to Edit"
              sublabel="Base image to modify"
              labelPrefix="Edit Target"
              images={editTarget}
              onChange={setEditTarget}
              single
            />

            <ImageRow
              title="Inspiration"
              sublabel="Expression, pose, vibe references"
              labelPrefix="Inspiration"
              images={inspirationImages}
              onChange={setInspirationImages}
            />

            <ImageRow
              title="Background"
              sublabel="Scene / setting reference"
              labelPrefix="Background Image"
              images={backgroundImage}
              onChange={setBackgroundImage}
              single
            />

            <div className="mt-auto pt-2 text-[10px] text-gray-300 text-center">
              All rows optional &middot; Labels are baked into images
            </div>
          </div>

          <div className="flex-1 border-r border-gray-100 min-w-0">
            <ChatPanel
              key={chatKey}
              onApplyPrompt={handleChatApply}
              onNewChat={handleNewChat}
              generating={generating}
              panelImages={getAllLabeledImages()}
            />
          </div>

          <div className="w-96 shrink-0">
            <GenerationPanel
              image={generatedImage}
              loading={generating}
              error={error}
              currentPrompt={currentPrompt}
              onRegenerate={() => {
                if (!currentPrompt) return;
                generate(currentPrompt, getAllLabeledImages());
              }}
            />
          </div>
        </div>
      ) : (
        <FaceSwapPanel onImageGenerated={addToHistory} />
      )}

      <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} items={imageHistory} />
    </div>
  );
}
