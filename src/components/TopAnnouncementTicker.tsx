import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  X, 
  ExternalLink
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
  const [isExpanded, setIsExpanded] = useState(false);

  // Active messages only
  const activeMessages: AnnouncementItem[] = (settings?.messages || []).filter(
    (m) => m.active !== false && m.text.trim().length > 0
  );

  const total = activeMessages.length;

  // Auto rotation timer: automatically pauses when user hovers OR when message is expanded for reading
  useEffect(() => {
    if (!settings?.enabled || total <= 1 || isDismissed || isExpanded) return;
    if (settings.pauseOnHover && isHovered) return;

    const intervalMs = Math.max(2, settings.rotationIntervalSeconds || 5) * 1000;
    const timer = setInterval(() => {
      handleNext();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [settings?.enabled, settings?.rotationIntervalSeconds, settings?.pauseOnHover, total, isHovered, isDismissed, isExpanded, currentIndex]);

  // Collapse expansion and keep index within bounds if messages change
  useEffect(() => {
    setIsExpanded(false);
    if (currentIndex >= total && total > 0) {
      setCurrentIndex(0);
    }
  }, [total, currentIndex]);

  const triggerTransition = (targetIndex: number, direction: 'next' | 'prev') => {
    if (isTransitioning || total <= 1) return;
    setIsExpanded(false);
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

  // Length check: long announcement messages that benefit from "Read more"
  const isLongMessage = (currentMsg.text || '').trim().length > 60;

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
      if (link.startsWith('/blog/') || link === '/blog' || link === 'blog') {
        onNavigate('home');
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
      className={`no-print w-full relative z-50 border-b border-black/10 select-none shadow-xs transition-colors`}
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
      {/* 1. Main Ticker Row */}
      <div className={`max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 ${paddingClasses}`}>
        
        {/* Left Section: Icon / Tag */}
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
            className={`inline-flex items-center gap-1.5 sm:gap-2 max-w-full flex-wrap justify-${alignVal === 'center' ? 'center' : alignVal === 'right' ? 'end' : 'start'}`}
          >
            {/* Optional Badge Pill */}
            {settings.showBadgePill !== false && currentMsg.badge && (
              <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-white text-slate-900 shadow-2xs">
                {currentMsg.badge}
              </span>
            )}

            {/* Announcement Text: Collapsed Snippet or Full Text */}
            <span 
              className={`font-${settings.fontWeight || 'semibold'} leading-snug`}
              style={{
                fontWeight: settings.fontWeight === 'bold' ? 700 : settings.fontWeight === 'semibold' ? 600 : settings.fontWeight === 'medium' ? 500 : 400
              }}
              title={currentMsg.text}
            >
              {isLongMessage && !isExpanded
                ? `${currentMsg.text.slice(0, 70).trim()}...`
                : currentMsg.text}
            </span>

            {/* Read More Button for Long Messages */}
            {isLongMessage && !isExpanded && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(true);
                }}
                className="inline-flex items-center space-x-0.5 px-2 py-0.5 rounded-full text-xs font-bold underline decoration-current/70 hover:decoration-current bg-black/15 hover:bg-black/25 text-current transition-all cursor-pointer shrink-0 shadow-2xs"
                title="Read complete announcement"
                aria-expanded="false"
              >
                <span>Read more</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            )}

            {/* Read Less Button when Expanded in-line */}
            {isLongMessage && isExpanded && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                className="inline-flex items-center space-x-0.5 px-2 py-0.5 rounded-full text-xs font-bold bg-white/20 hover:bg-white/30 text-current transition-all cursor-pointer shrink-0 shadow-2xs"
                title="Collapse announcement"
                aria-expanded="true"
              >
                <span>Read less</span>
                <ChevronUp className="w-3 h-3" />
              </button>
            )}

            {/* External Link Indicator if clickable */}
            {currentMsg.linkUrl && (
              <button
                type="button"
                onClick={handleClickMessage}
                className="inline-flex items-center space-x-0.5 text-xs font-bold hover:underline opacity-90 hover:opacity-100 cursor-pointer ml-1"
                title="Open attached announcement link"
              >
                <span>Visit Link</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </button>
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

      {/* 2. Expandable Panel for Complete Announcement Reading */}
      {isExpanded && (
        <div 
          className="w-full border-t border-black/15 px-4 sm:px-8 py-3 bg-black/15 backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-1 duration-200"
          style={{ color: textVal }}
        >
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center space-x-2 flex-wrap">
                {currentMsg.badge && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-white text-slate-900 shadow-2xs">
                    {currentMsg.badge}
                  </span>
                )}
                <span className="text-[11px] font-bold uppercase tracking-wider opacity-85">
                  Full Announcement ({currentIndex + 1} of {total})
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-line select-text">
                {currentMsg.text}
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0 pt-1 sm:pt-0 self-end sm:self-start">
              {currentMsg.linkUrl && (
                <button
                  type="button"
                  onClick={handleClickMessage}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-900 shadow-sm hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <span>Open Link</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/20 hover:bg-white/30 text-current transition-all cursor-pointer shadow-2xs"
                title="Collapse announcement"
                aria-expanded="true"
              >
                <span>Read less</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
