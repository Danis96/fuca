import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, ExternalLink, Maximize2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface PostGamePhotoProps {
  src: string;
  alt: string;
  compact?: boolean;
}

export function PostGamePhoto({ src, alt, compact = false }: PostGamePhotoProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    setIsOpen(false);
  }, [src]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  const showPlaceholder = !loaded || failed;

  return (
    <>
      <div
        className={`group relative isolate overflow-hidden rounded-2xl border border-white/10 bg-black/25 ${
          compact ? 'mt-4 aspect-[16/7]' : 'aspect-video'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        {showPlaceholder && (
          <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_30%,rgba(16,185,129,0.16),transparent_55%),linear-gradient(135deg,rgba(255,255,255,0.035),rgba(255,255,255,0.01))] px-5 text-center">
            <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.7)_1px,transparent_1px)] [background-size:28px_28px]" />
            <span className="relative mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-300 shadow-[0_0_30px_-10px_rgba(16,185,129,0.8)]">
              <Camera className="h-5 w-5" />
            </span>
            <p className="relative text-xs font-bold uppercase tracking-[0.24em] text-white/80">Post game pic</p>
            <p className="relative mt-1 text-xs text-white/40">Photo coming after the final whistle</p>
          </div>
        )}

        {!failed && (
          <img
            src={src}
            alt={alt}
            className={`absolute inset-0 h-full w-full object-cover transition duration-500 ${
              loaded ? 'opacity-100 group-hover:scale-[1.025]' : 'opacity-0'
            }`}
            onLoad={() => setLoaded(true)}
            onError={() => {
              setLoaded(false);
              setFailed(true);
            }}
          />
        )}

        {loaded && !failed && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/75 via-black/5 to-black/10 p-4 text-left transition hover:from-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400"
            aria-label="Open post game photo"
          >
            <span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-300">Post game pic</span>
              <span className="mt-0.5 block text-xs text-white/70">Tap to view full size</span>
            </span>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-black/40 text-white backdrop-blur-sm transition group-hover:border-emerald-400/40 group-hover:text-emerald-300">
              <Maximize2 className="h-4 w-4" />
            </span>
          </button>
        )}
      </div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && loaded && !failed && (
            <motion.div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 backdrop-blur-md sm:p-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              role="dialog"
              aria-modal="true"
              aria-label="Post game photo preview"
            >
              <motion.img
                src={src}
                alt={alt}
                className="max-h-[calc(100vh-4rem)] max-w-full rounded-2xl object-contain shadow-2xl"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.22 }}
                onClick={(event) => event.stopPropagation()}
              />
              <div className="absolute right-4 top-4 flex gap-2 sm:right-7 sm:top-7">
                <a
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-black/50 px-4 text-sm font-medium text-white backdrop-blur-md transition hover:border-emerald-400/40 hover:text-emerald-300"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">Open original</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-black/50 text-white backdrop-blur-md transition hover:border-white/30 hover:bg-black/70"
                  aria-label="Close photo preview"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
