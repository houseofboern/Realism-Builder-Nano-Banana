'use client';

interface HistoryItem {
  image: string;
  prompt: string;
  timestamp: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  items: HistoryItem[];
}

export default function HistoryDrawer({ open, onClose, items }: Props) {
  if (!open) return null;

  const download = (image: string) => {
    const a = document.createElement('a');
    a.href = image;
    a.download = `realism-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-80 bg-white shadow-xl flex flex-col animate-in slide-in-from-right">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold tracking-tight">History</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="text-xs text-gray-300 text-center mt-8">No images yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {items.slice().reverse().map((item, i) => (
                <div key={i} className="group relative">
                  <img src={item.image} alt="" className="w-full rounded-xl object-cover aspect-square" />
                  <button
                    onClick={() => download(item.image)}
                    className="absolute bottom-1.5 right-1.5 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 5v14M5 12l7 7 7-7" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
