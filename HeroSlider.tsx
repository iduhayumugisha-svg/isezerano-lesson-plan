import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, LayoutDashboard, PlusCircle, BookOpen, Sparkles } from 'lucide-react';
import { HeroSlide } from '../types/slider';
import { getPublishedSlides, subscribeToPublishedSlides, DEFAULT_HERO_SLIDES } from '../services/sliderService';
import { WebsitePage } from './WebsiteHeader';

interface HeroSliderProps {
  onNavigate: (page: WebsitePage) => void;
}

export const HeroSlider: React.FC<HeroSliderProps> = ({ onNavigate }) => {
  const [slides, setSlides] = useState<HeroSlide[]>(DEFAULT_HERO_SLIDES);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  // Load published slides and attach real-time listener
  useEffect(() => {
    let isMounted = true;
    const fetchSlides = async () => {
      try {
        const published = await getPublishedSlides();
        if (isMounted && published && published.length > 0) {
          setSlides(published);
        }
      } catch (err) {
        console.warn('HeroSlider fetch error:', err);
      }
    };
    fetchSlides();

    const unsubscribe = subscribeToPublishedSlides((remoteSlides) => {
      if (isMounted && remoteSlides && remoteSlides.length > 0) {
        setSlides(remoteSlides);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const totalSlides = slides.length;

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % (totalSlides || 1));
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + (totalSlides || 1)) % (totalSlides || 1));
  }, [totalSlides]);

  // Autoplay ~5 seconds (5000ms) with pause-on-hover/touch
  useEffect(() => {
    if (totalSlides <= 1 || isPaused) return;

    const interval = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => clearInterval(interval);
  }, [totalSlides, isPaused, nextSlide]);

  // Mobile Touch & Swipe gesture handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    setTouchStartX(e.touches[0].clientX);
    setTouchEndX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 45; // pixels
    if (distance > minSwipeDistance) {
      // Swiped Left -> Next slide
      nextSlide();
    } else if (distance < -minSwipeDistance) {
      // Swiped Right -> Previous slide
      prevSlide();
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  const handleActionClick = (link?: string) => {
    if (!link) {
      onNavigate('dashboard');
      return;
    }
    const clean = link.trim().toLowerCase();
    if (clean === 'create' || clean === 'saved' || clean === 'dashboard' || clean === 'about' || clean === 'contact' || clean === 'privacy' || clean === 'home' || clean === 'settings') {
      onNavigate(clean as WebsitePage);
    } else if (link.startsWith('http://') || link.startsWith('https://')) {
      window.location.href = link;
    } else {
      onNavigate('dashboard');
    }
  };

  if (!slides || slides.length === 0) {
    return null;
  }

  const currentSlide = slides[currentIndex] || slides[0];

  return (
    <div 
      className="relative w-full max-w-6xl mx-auto mb-10 sm:mb-14 overflow-hidden rounded-2xl sm:rounded-3xl shadow-xl bg-slate-900 border border-slate-800"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Homepage Educational Hero Slider"
    >
      {/* Aspect Ratio Container: 16:9 on mobile, comfortable banner height on desktop */}
      <div className="relative h-[360px] sm:h-[420px] md:h-[480px] w-full overflow-hidden select-none">
        
        {/* Slides rendering with crossfade animation */}
        {slides.map((slide, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              key={slide.id || index}
              className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
                isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
              }`}
              aria-hidden={!isActive}
            >
              {/* Background Image with responsive cover & subtle zoom effect */}
              <img
                src={slide.imageUrl}
                alt={slide.headline || 'ISEZERANO ONLINE – GS GITUMBA'}
                className={`w-full h-full object-cover object-center transition-transform duration-7000 ease-out ${
                  isActive ? 'scale-105' : 'scale-100'
                }`}
                loading={index === 0 ? 'eager' : 'lazy'}
              />

              {/* Multi-layered dark gradient scrim for flawless contrast and readability on all devices */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/20" />
              <div className="absolute inset-0 bg-radial-at-c from-transparent via-slate-950/30 to-slate-950/70" />

              {/* Slide Content Box */}
              <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8 md:p-12 text-left z-20">
                <div className="max-w-2xl space-y-3 sm:space-y-4">
                  
                  {/* Category / CBC Pill */}
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/20 backdrop-blur-md border border-teal-400/40 text-teal-300 text-xs font-semibold shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                    <span>ISEZERANO ONLINE • GS GITUMBA</span>
                  </div>

                  {/* Headline */}
                  <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight leading-snug sm:leading-tight drop-shadow-md">
                    {slide.headline}
                  </h2>

                  {/* Description */}
                  <p className="text-xs sm:text-sm md:text-base text-slate-200 line-clamp-2 sm:line-clamp-3 leading-relaxed max-w-xl font-normal drop-shadow">
                    {slide.description}
                  </p>

                  {/* Call to Action Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleActionClick(slide.buttonLink)}
                      className="inline-flex items-center space-x-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold text-white bg-teal-600 hover:bg-teal-500 active:bg-teal-700 border border-teal-400/30 shadow-lg shadow-teal-900/40 transition-all cursor-pointer transform hover:-translate-y-0.5"
                    >
                      <span>{slide.buttonText || 'Go to Dashboard'}</span>
                      <ArrowRight className="w-4 h-4 text-teal-200" />
                    </button>
                  </div>

                </div>
              </div>

            </div>
          );
        })}

        {/* Navigation Arrows (Prev / Next) */}
        {totalSlides > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
              }}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-95 shadow-md hover:scale-105"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-95 shadow-md hover:scale-105"
              aria-label="Next slide"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
          </>
        )}

        {/* Bottom Slide Indicator Dots & Counter */}
        {totalSlides > 1 && (
          <div className="absolute bottom-3 sm:bottom-5 right-4 sm:right-8 z-30 flex items-center space-x-2 sm:space-x-3 bg-slate-950/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-300">
              {currentIndex + 1} / {totalSlides}
            </span>
            <div className="flex items-center space-x-1 sm:space-x-1.5">
              {slides.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(dotIdx);
                  }}
                  className={`transition-all rounded-full cursor-pointer ${
                    dotIdx === currentIndex
                      ? 'w-5 sm:w-6 h-1.5 sm:h-2 bg-teal-400 shadow-xs'
                      : 'w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white/40 hover:bg-white/80'
                  }`}
                  aria-label={`Go to slide ${dotIdx + 1}`}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
