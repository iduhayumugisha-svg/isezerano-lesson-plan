import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  ExternalLink,
  Volume2,
  Megaphone
} from 'lucide-react';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import { AnnouncementStripSettings, AnnouncementItem } from '../types/websiteDesign';

interface TopAnnouncementTickerProps {
  onNavigate?: (page: any) => void;
  // Optional override for live preview in admin dashboard
  overrideSettings?: AnnouncementStripSettings;
  isPreview?: boolean;
}

export const TopAnnouncementTicker: React.FC<TopAnnouncementTickerProps> = ({
  onNavigate,
  overrideSettings,
  isPreview = false
}) => {
  const { announcements: contextAnnouncements } = useWebsiteDesign();
  const settings = overrideSettings || contextAnnouncements;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'next' | 'prev'>('next');
  const [isHovered, setIsHovered] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Active messages only
  const activeMessages: AnnouncementItem[] = (settings?.messages || []).filter(
    (m) => m.active !== false && m.text.trim().length > 0
  );

  const total = activeMessages.length;

  // Auto rotation timer
  useEffect(() => {
    if (!settings?.enabled || total <= 1 || isDismissed) return;
    if (settings.pauseOnHover && isHovered) return;

    const intervalMs = Math.max(2, settings.rotationIntervalSeconds || 5) * 1000;
    const timer = setInterval(() => {
      handleNext();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [settings?.enabled, settings?.rotationIntervalSeconds, settings?.pauseOnHover, total, isHovered, isDismissed]);

  // Keep index within bounds if messages change
  useEffect(() => {
    if (currentIndex >= total && total > 0) {
      setCurrentIndex(0);
    }
  }, [total, currentIndex]);

  const triggerTransition = (targetIndex: number, direction: 'next' | 'prev') => {
    if (isTransitioning || total <= 1) return;
    setTransitionDirection(direction);
    setIsTransitioning(true);

    setTimeout(() => {
      setCurrentIndex(targetIndex);
      setIsTransitioning(false);
    }, 280); // matches transition duration
  };

  const handleNext = () => {
    if (total <= 1) return;
    const nextIdx = (currentIndex + 1) % total;
    triggerTransition(nextIdx, 'next');
  };

  const handlePrev = () => {
    if (total <= 1) return;
    const prevIdx = (currentIndex - 1 + total) % total;
    triggerTransition(prevIdx, 'prev');
  };

  // If disabled or dismissed or no active messages
  if (!settings?.enabled || total === 0 || isDismissed) {
    return null;
  }

  const currentMsg = activeMessages[currentIndex] || activeMessages[0];

  // Height padding map
  const paddingClasses = {
    compact: 'py-1 sm:py-1.5 px-3 sm:px-4',
    normal: 'py-2 sm:py-2.5 px-3.5 sm:px-6',
    spacious: 'py-2.5 sm:py-3 px-4 sm:px-8'
  }[settings.heightPadding || 'normal'];

  // Font size in px
  const fontSizePx = settings.fontSize || 13;
  const fontFamilyVal = settings.fontFamily || "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const bgVal = settings.backgroundColor || '#0f766e';
  const textVal = settings.textColor || '#ffffff';
  const alignVal = settings.textAlign || 'center';

  const handleClickMessage = () => {
    if (!currentMsg.linkUrl) return;
    const link = currentMsg.linkUrl.trim();
    if (link.startsWith('http://') || link.startsWith('https://')) {
      window.open(link, '_blank', 'noopener,noreferrer');
    } else if (onNavigate) {
      if (link.startsWith('/blog/')) {
        const slug = link.replace('/blog/', '');
        onNavigate('blog_post');
      } else if (link === '/blog' || link === 'blog') {
        onNavigate('blog');
      } else if (link === '/dashboard' || link === 'dashboard') {
        onNavigate('dashboard');
      } else if (link === '/create' || link === 'create') {
        onNavigate('create');
      } else {
        window.location.href = link;
      }
    }
  };

  // Transition style calculations
  const getTransitionStyle = (): React.CSSProperties => {
    if (settings.transitionEffect === 'fade') {
      return {
        opacity: isTransitioning ? 0 : 1,
        transition: 'opacity 280ms cubic-bezier(0.4, 0, 0.2, 1)'
      };
    }
    // Slide transition
    const translateY = isTransitioning 
      ? (transitionDirection === 'next' ? '-8px' : '8px')
      : '0px';
    return {
      opacity: isTransitioning ? 0 : 1,
      transform: `translateY(${translateY})`,
      transition: 'all 280ms cubic-bezier(0.4, 0, 0.2, 1)'
    };
  };

  return (
    <div
      className={`no-print w-full relative z-50 border-b border-black/10 select-none shadow-xs transition-colors ${paddingClasses}`}
      style={{
        backgroundColor: bgVal,
        color: textVal,
        fontFamily: fontFamilyVal,
        fontSize: `${fontSizePx}px`
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="region"
      aria-label="Important Announcement Strip"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Left Section: Icon / Tag or Empty Spacer */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-3 h-3 text-current animate-pulse" />
          </div>
          <span className="hidden md:inline-block text-[10px] uppercase font-bold tracking-wider opacity-85 px-1.5 py-0.5 rounded bg-black/15">
            Press
          </span>
        </div>

        {/* Center Section: Message Content & Animation */}
        <div 
          className={`flex-1 min-w-0 flex items-center justify-${alignVal === 'center' ? 'center' : alignVal === 'right' ? 'end' : 'start'} text-${alignVal}`}
        >
          <div 
            style={getTransitionStyle()}
            className={`inline-flex items-center gap-2 max-w-full ${currentMsg.linkUrl ? 'cursor-pointer hover:underline' : ''}`}
            onClick={handleClickMessage}
          >
            {/* Optional Badge Pill */}
            {settings.showBadgePill !== false && currentMsg.badge && (
              <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-white text-slate-900 shadow-2xs">
                {currentMsg.badge}
              </span>
            )}

            {/* Announcement Text */}
            <span 
              className={`truncate sm:whitespace-normal font-${settings.fontWeight || 'semibold'} leading-snug`}
              style={{
                fontWeight: settings.fontWeight === 'bold' ? 700 : settings.fontWeight === 'semibold' ? 600 : settings.fontWeight === 'medium' ? 500 : 400
              }}
              title={currentMsg.text}
            >
              {currentMsg.text}
            </span>

            {/* External Link Indicator if clickable */}
            {currentMsg.linkUrl && (
              <ExternalLink className="w-3 h-3 opacity-80 shrink-0 hidden sm:inline" />
            )}
          </div>
        </div>

        {/* Right Section: Navigation Controls & Dismiss */}
        <div className="flex items-center space-x-1 shrink-0">
          
          {/* Multi-message pagination counter & arrows */}
          {total > 1 && settings.showNavigationArrows !== false && (
            <div className="flex items-center space-x-0.5 bg-black/15 rounded-lg p-0.5 backdrop-blur-2xs">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1 rounded hover:bg-white/20 text-current transition-colors cursor-pointer"
                title="Previous announcement"
                aria-label="Previous announcement"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="text-[10px] font-mono px-1 opacity-90 select-none">
                {currentIndex + 1}/{total}
              </span>

              <button
                type="button"
                onClick={handleNext}
                className="p-1 rounded hover:bg-white/20 text-current transition-colors cursor-pointer"
                title="Next announcement"
                aria-label="Next announcement"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Dismiss Button */}
          {settings.showDismissButton !== false && !isPreview && (
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1 rounded-lg hover:bg-white/20 text-current transition-colors cursor-pointer ml-1"
              title="Dismiss announcement banner"
              aria-label="Dismiss announcement banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
