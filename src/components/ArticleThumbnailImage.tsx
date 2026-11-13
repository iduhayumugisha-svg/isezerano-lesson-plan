import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';

interface ArticleThumbnailImageProps {
  src: string;
  alt: string;
  className?: string;
  compact?: boolean;
}

export const ArticleThumbnailImage: React.FC<ArticleThumbnailImageProps> = ({
  src,
  alt,
  className = '',
  compact = false
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div
        role="img"
        aria-label={alt || 'Article placeholder'}
        className={`w-full h-full bg-gradient-to-br from-slate-100 to-slate-200/70 flex flex-col items-center justify-center text-slate-400 text-center ${
          compact ? 'p-2' : 'p-4 space-y-1.5'
        }`}
      >
        <FileText className={compact ? 'w-5 h-5 opacity-55' : 'w-7 h-7 opacity-55'} />
        {!compact && (
          <span className="text-[11px] font-medium tracking-wide uppercase text-slate-500">
            GS GITUMBA
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
};
