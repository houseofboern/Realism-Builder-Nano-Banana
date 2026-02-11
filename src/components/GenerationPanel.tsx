'use client';

interface Props {
  image: string | null;
  loading: boolean;
  error: string | null;
  currentPrompt: string;
  onRegenerate: () => void;
}

export default function GenerationPanel({ image, loading, error, currentPrompt, onRegenerate }: Props) {
  const download = () => {
    if (!image) return;
    const a = document.createElement('a');
    a.href = image;
    a.download = `realism-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold tracking-tight">Output</h2>
        <p className="text-xs text-gray-400 mt-0.5">Generated result</p>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {image ? (
          <div className="space-y-4">
            <img src={image} alt="Generated" className="w-full rounded-2xl shadow-sm" />
            <div className="flex gap-2">
              <button
                onClick={download}
                className="flex-1 py-2.5 text-xs font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Download
              </button>
              <button
                onClick={onRegenerate}
                disabled={loading}
                className="flex-1 py-2.5 text-xs font-medium bg-black text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40"
              >
                Regenerate
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <div className="w-10 h-10 border-2 border-gray-200 border-t-black rounded-full animate-spin mx-auto" />
              <p className="text-xs text-gray-400">Generating with Nano Bannaa Pro...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <p className="text-sm text-red-500">{error}</p>
              <button
                onClick={onRegenerate}
                className="px-4 py-2 text-xs font-medium bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-gray-300">Upload images and hit Generate</p>
          </div>
        )}
      </div>

      {currentPrompt && (
        <div className="px-5 py-3 border-t border-gray-100">
          <details className="group">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 transition-colors">
              View current prompt
            </summary>
            <pre className="mt-2 p-3 bg-gray-50 rounded-xl text-xs text-gray-600 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
              {currentPrompt}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
