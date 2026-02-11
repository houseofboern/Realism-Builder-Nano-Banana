'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface MessageImage {
  dataUrl: string;
}

interface Message {
  role: 'user' | 'model';
  text: string;
  images?: MessageImage[];
  error?: boolean;
}

interface Props {
  onApplyPrompt: (prompt: string, images: string[]) => void;
  onNewChat: () => void;
  generating: boolean;
  panelImages: string[];
}

function extractPromptBlock(text: string): { before: string; prompt: string; after: string } | null {
  const match = text.match(/```prompt\s*\n([\s\S]*?)```/);
  if (!match) return null;
  const idx = match.index!;
  return {
    before: text.slice(0, idx).trim(),
    prompt: match[1].trim(),
    after: text.slice(idx + match[0].length).trim(),
  };
}

export default function ChatPanel({ onApplyPrompt, onNewChat, generating, panelImages }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [pendingImages, setPendingImages] = useState<MessageImage[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const addImageFiles = useCallback((files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        setPendingImages((prev) => [...prev, { dataUrl: reader.result as string }]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        addImageFiles(imageFiles);
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [addImageFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addImageFiles(e.dataTransfer.files);
  }, [addImageFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const removePendingImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const getAllChatImages = (): string[] => {
    const imgs: string[] = [];
    for (const m of messages) {
      if (m.images) {
        for (const img of m.images) imgs.push(img.dataUrl);
      }
    }
    return imgs;
  };

  const toPayload = (msgs: Message[]) =>
    msgs.map((m) => ({
      role: m.role,
      text: m.text,
      images: m.images?.map((img) => img.dataUrl),
    }));

  const sendMessages = async (msgs: Message[]) => {
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: toPayload(msgs), panelImages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages([...msgs, { role: 'model', text: data.error || 'Something went wrong', error: true }]);
      } else if (!data.text || data.text.trim() === '') {
        setMessages([...msgs, { role: 'model', text: 'No response — try rephrasing or retry', error: true }]);
      } else {
        setMessages([...msgs, { role: 'model', text: data.text }]);
      }
    } catch {
      setMessages([...msgs, { role: 'model', text: 'Network error — check your connection', error: true }]);
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    if ((!input.trim() && pendingImages.length === 0) || loading) return;
    const userMsg: Message = {
      role: 'user',
      text: input.trim(),
      images: pendingImages.length > 0 ? [...pendingImages] : undefined,
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setPendingImages([]);
    await sendMessages(next);
  };

  const retry = () => {
    const withoutError = messages.filter((m) => !m.error);
    setMessages(withoutError);
    sendMessages(withoutError);
  };

  const handleUsePrompt = (prompt: string) => {
    const images = getAllChatImages();
    onApplyPrompt(prompt, images);
  };

  const renderModelMessage = (m: Message) => {
    if (m.error) {
      return (
        <div className="px-4 py-3 space-y-2">
          <p className="text-red-500 text-sm">{m.text}</p>
          <button
            onClick={retry}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            Retry
          </button>
        </div>
      );
    }

    const extracted = extractPromptBlock(m.text);
    if (!extracted) {
      return <p className="px-4 py-3 whitespace-pre-wrap">{m.text}</p>;
    }

    return (
      <div className="px-4 py-3 space-y-3">
        {extracted.before && <p className="whitespace-pre-wrap">{extracted.before}</p>}
        <div className="bg-white/80 border border-gray-200 rounded-xl p-3 space-y-2">
          <p className="text-xs font-medium text-gray-400">Prompt</p>
          <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{extracted.prompt}</p>
          <button
            onClick={() => handleUsePrompt(extracted.prompt)}
            disabled={generating}
            className="w-full py-2 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            {generating ? 'Generating...' : 'Use This Prompt'}
          </button>
        </div>
        {extracted.after && <p className="whitespace-pre-wrap">{extracted.after}</p>}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Prompt Studio</h2>
          <p className="text-xs text-gray-400 mt-0.5">Chat, attach images, refine your prompt</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={onNewChat}
            className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
          >
            New Chat
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-sm">
              <p className="text-gray-400 text-sm">Describe what you&apos;re going for</p>
              <p className="text-gray-300 text-xs mt-2">
                Paste or drop images &middot; Describe the vibe &middot; Refine until it&apos;s right
              </p>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-black text-white rounded-br-md'
                  : m.error
                  ? 'bg-red-50 text-gray-800 border border-red-100 rounded-bl-md'
                  : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-bl-md'
              }`}
            >
              {m.images && m.images.length > 0 && (
                <div className="p-2 pb-0 flex gap-2 flex-wrap">
                  {m.images.map((img, j) => (
                    <img key={j} src={img.dataUrl} alt="" className="w-20 h-20 object-cover rounded-xl" />
                  ))}
                </div>
              )}
              {m.role === 'model' ? renderModelMessage(m) : (
                m.text && <p className="px-4 py-3 whitespace-pre-wrap">{m.text}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-gray-100">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="bg-gray-50 rounded-2xl px-4 py-3"
        >
          {pendingImages.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-2">
              {pendingImages.map((img, i) => (
                <div key={i} className="relative group">
                  <img src={img.dataUrl} alt="" className="w-16 h-16 object-cover rounded-xl" />
                  <button
                    onClick={() => removePendingImage(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-black text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Describe what you want... (paste or drop images)"
              rows={1}
              className="flex-1 bg-transparent text-sm resize-none outline-none placeholder:text-gray-400"
            />
            <button
              onClick={send}
              disabled={(!input.trim() && pendingImages.length === 0) || loading}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-black text-white disabled:opacity-30 transition-opacity hover:bg-gray-800 shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
