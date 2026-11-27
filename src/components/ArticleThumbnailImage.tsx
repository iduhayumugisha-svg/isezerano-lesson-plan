import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';

interface ArticleThumbnailImageProps {
  src: string;
  alt: string;
  className?: string;
  compact?: boolean;
  priority?: boolean;
}

export const ArticleThumbnailImage: React.FC<ArticleThumbnailImageProps> = ({
  src,
  alt,
  className = '',
  compact = false,
  priority = false
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
        className={`w-full h-full bg-gradient-to-br from-slate-100 to-slate-200/70 flex items-center justify-center text-slate-400 text-center ${
          compact ? 'p-2' : 'p-4'
        }`}
      >
        <FileText className={compact ? 'w-5 h-5 opacity-55' : 'w-7 h-7 opacity-55'} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      onError={() => setHasError(true)}
    />
  );
};
