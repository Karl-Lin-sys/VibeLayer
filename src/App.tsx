import { useState, useRef, useEffect, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Download, RefreshCw, X, Maximize2, Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { generateWallpaperVariation, expandVibePrompt } from './services/gemini';
import { Wallpaper, GenerationStatus } from './types';
import { cn } from './lib/utils';

export default function App() {
  const [vibe, setVibe] = useState('');
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper | null>(null);
  const [progress, setProgress] = useState(0);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async (e?: FormEvent, remixVibe?: string, referenceImage?: string) => {
    e?.preventDefault();
    const currentVibe = remixVibe || vibe;
    if (!currentVibe.trim()) return;

    setStatus('generating');
    setProgress(0);
    
    try {
      const detailedPrompt = await expandVibePrompt(currentVibe);
      
      const newWallpapers: Wallpaper[] = [];
      
      // Generate 4 variations in parallel
      const generationPromises = Array.from({ length: 4 }).map(async (_, i) => {
        try {
          const url = await generateWallpaperVariation(detailedPrompt, referenceImage);
          const wp: Wallpaper = {
            id: Math.random().toString(36).substring(7),
            url,
            prompt: detailedPrompt,
            vibe: currentVibe,
            timestamp: Date.now()
          };
          setProgress(prev => prev + 25);
          return wp;
        } catch (err) {
          console.error(`Variation ${i} failed`, err);
          return null;
        }
      });

      const results = await Promise.all(generationPromises);
      const successfulWallpapers = results.filter((wp): wp is Wallpaper => wp !== null);
      
      if (successfulWallpapers.length === 0) {
        throw new Error("Failed to generate any variations");
      }

      setWallpapers(prev => [...successfulWallpapers, ...prev]);
      setStatus('idle');
      if (!remixVibe) setVibe('');
      
      // Scroll to new results
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  const handleDownload = async (wp: Wallpaper) => {
    try {
      const response = await fetch(wp.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vibelayer-${wp.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  const handleRemix = (wp: Wallpaper) => {
    setSelectedWallpaper(null);
    handleGenerate(undefined, wp.vibe, wp.url);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-orange-500/30">
      {/* Search Header */}
      <header className="sticky top-0 z-40 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 pt-8 pb-6 px-6">
        <div className="max-w-xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <Sparkles size={18} className="text-black" />
              </div>
              <h1 className="text-xl font-bold tracking-tight uppercase">VibeLayer</h1>
            </div>
            <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">AI Wallpaper Gen</span>
          </div>

          <form onSubmit={(e) => handleGenerate(e)} className="relative group">
            <input
              type="text"
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              placeholder="Describe your vibe... (e.g. moody cyberpunk Tokyo)"
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all placeholder:text-white/20"
              disabled={status === 'generating'}
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-orange-500 transition-colors" size={18} />
            
            <button
              type="submit"
              disabled={status === 'generating' || !vibe.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-orange-500 text-black px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-orange-400 disabled:opacity-50 disabled:hover:bg-orange-500 transition-all flex items-center gap-2"
            >
              {status === 'generating' ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{progress}%</span>
                </>
              ) : (
                <span>Generate</span>
              )}
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-6 space-y-8">
        {/* Empty State */}
        {wallpapers.length === 0 && status !== 'generating' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center space-y-4"
          >
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-2">
              <ImageIcon size={32} className="text-white/20" />
            </div>
            <h2 className="text-xl font-medium">Create your first wallpaper</h2>
            <p className="text-white/40 text-sm max-w-xs">
              Every generation creates 4 unique 9:16 variations tailored to your specific aesthetic.
            </p>
          </motion.div>
        )}

        {/* Wallpaper Grid */}
        <div className="grid grid-cols-2 gap-4">
          <AnimatePresence>
            {wallpapers.map((wp, index) => (
              <motion.div
                key={wp.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="group relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer bg-white/5 border border-white/10"
                onClick={() => setSelectedWallpaper(wp)}
              >
                <img 
                  src={wp.url} 
                  alt={wp.vibe}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <p className="text-[10px] font-mono text-white/60 truncate uppercase tracking-wider">{wp.vibe}</p>
                </div>
                <div className="absolute top-3 right-3 p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 size={12} className="text-white" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Loading Skeleton Variations */}
        {status === 'generating' && (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i}
                className="aspect-[9/16] rounded-2xl bg-white/5 animate-pulse border border-white/10 flex items-center justify-center overflow-hidden"
              >
                <div className="w-full h-full relative overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 -translate-x-full animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Fullscreen Preview Modal */}
      <AnimatePresence>
        {selectedWallpaper && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col pt-safe"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 z-50">
              <button 
                onClick={() => setSelectedWallpaper(null)}
                className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 active:scale-95 transition-transform"
              >
                <X size={20} />
              </button>
              <div className="flex-1 px-4 truncate text-center">
                <span className="text-xs font-mono uppercase tracking-[0.2em] text-white/40">{selectedWallpaper.vibe}</span>
              </div>
              <div className="w-10" /> {/* Spacer */}
            </div>

            {/* Main Preview Image */}
            <div className="flex-1 relative flex items-center justify-center p-6 pb-20">
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="relative aspect-[9/16] h-full max-h-[75vh] w-auto rounded-[40px] shadow-2xl shadow-orange-500/10 overflow-hidden border border-white/10"
              >
                <img 
                  src={selectedWallpaper.url} 
                  alt={selectedWallpaper.vibe}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            </div>

            {/* Modal Footer Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-8 pt-12 bg-gradient-to-t from-black via-black/90 to-transparent flex gap-4 justify-center">
              <button
                onClick={() => handleDownload(selectedWallpaper)}
                className="flex-1 max-w-[160px] bg-white text-black py-4 rounded-2xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Download size={18} />
                <span>Save</span>
              </button>
              <button
                onClick={() => handleRemix(selectedWallpaper)}
                className="flex-1 max-w-[160px] bg-white/10 text-white backdrop-blur-xl py-4 rounded-2xl font-bold text-sm uppercase tracking-wider border border-white/20 flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <RefreshCw size={18} />
                <span>Remix</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS Overrides for shimmer effect */}
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%) skewx(12deg); }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
        .pt-safe {
          padding-top: env(safe-area-inset-top);
        }
      `}</style>
    </div>
  );
}

