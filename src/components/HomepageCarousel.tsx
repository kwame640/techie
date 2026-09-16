import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface HomepageBanner {
  image: string;
  title: string;
  link?: string;
}

export const homepageBanners: HomepageBanner[] = [
  {
    image: "/images/glorriet.png",
    title: "Glorriet Beauty Bloom",
    link: "/discover",
  },
  {
    image: "/images/qweku.png",
    title: "Qweku Khapii",
    link: "/discover",
  },
  {
    image: "/images/trendora.png",
    title: "Trendora Fashion Hub",
    link: "/discover",
  },
  {
    image: "/images/knorr.png",
    title: "Knorr Collection",
    link: "/discover",
  },
];

interface HomepageCarouselProps {
  banners?: HomepageBanner[];
  autoPlayInterval?: number;
}

export const HomepageCarousel: React.FC<HomepageCarouselProps> = ({
  banners = homepageBanners,
  autoPlayInterval = 3500,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [visibleCount, setVisibleCount] = useState(2);
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateVisibleCount = useCallback(() => {
    const width = window.innerWidth;
    if (width >= 1280) {
      setVisibleCount(5);
    } else if (width >= 1024) {
      setVisibleCount(4);
    } else if (width >= 768) {
      setVisibleCount(3);
    } else if (width >= 500) {
      setVisibleCount(2);
    } else {
      setVisibleCount(1);
    }
  }, []);

  useEffect(() => {
    updateVisibleCount();
    window.addEventListener('resize', updateVisibleCount);
    return () => window.removeEventListener('resize', updateVisibleCount);
  }, [updateVisibleCount]);

  const total = banners.length;
  const maxIndex = Math.max(0, total - visibleCount);

  useEffect(() => {
    if (isPaused || isTransitioning || total <= visibleCount) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, autoPlayInterval);
    return () => clearInterval(timer);
  }, [isPaused, isTransitioning, maxIndex, autoPlayInterval, total, visibleCount]);

  const goTo = (index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    const clamped = Math.max(0, Math.min(index, maxIndex));
    setActiveIndex(clamped);
    setTimeout(() => setIsTransitioning(false), 600);
  };

  const goPrev = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setActiveIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
    setTimeout(() => setIsTransitioning(false), 600);
  };

  const goNext = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setActiveIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    setTimeout(() => setIsTransitioning(false), 600);
  };

  const slideWidth = 100 / visibleCount;
  const translateX = -(activeIndex * slideWidth);
  const totalDots = maxIndex + 1;

  const Wrapper: React.FC<{ banner: HomepageBanner; children: React.ReactNode }> = ({ banner, children }) => {
    const style = { width: `${slideWidth}%`, flexShrink: 0 } as React.CSSProperties;
    if (banner.link) {
      return (
        <a
          href={banner.link}
          className="block"
          style={style}
          onClick={(e) => {
            if (isTransitioning) e.preventDefault();
          }}
        >
          {children}
        </a>
      );
    }
    return (
      <div className="block" style={style}>
        {children}
      </div>
    );
  };

  return (
    <section
      className="w-full py-6 sm:py-8 lg:py-10"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      ref={containerRef}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4 sm:mb-5 lg:mb-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-primary rounded-full" />
            <h2 className="text-xl sm:text-2xl lg:text-2xl font-bold text-text">Featured Businesses</h2>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={goPrev}
              aria-label="Previous slide"
              className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-card flex items-center justify-center text-primary hover:bg-accent-beige hover:border-accent-tan transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={total <= visibleCount}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goNext}
              aria-label="Next slide"
              className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-card flex items-center justify-center text-primary hover:bg-accent-beige hover:border-accent-tan transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={total <= visibleCount}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="relative">
          <div
            className="overflow-hidden rounded-2xl"
            ref={trackRef}
          >
            <div
              className="flex transition-transform ease-out duration-500"
              style={{ transform: `translateX(${translateX}%)`, transitionDuration: isTransitioning ? '500ms' : '0ms' }}
            >
              {banners.map((banner, idx) => (
                <Wrapper key={banner.title + idx} banner={banner}>
                  <div className="px-1.5 sm:px-2 h-full">
                    <div className="group h-full bg-white rounded-2xl border border-gray-100 shadow-card hover:shadow-soft hover:border-accent-tan/60 transition-all duration-300 overflow-hidden">
                      <div className="relative w-full aspect-[4/3] sm:aspect-[5/3] lg:aspect-[16/10] flex items-center justify-center bg-gradient-to-br from-background via-accent-beige/30 to-white p-4 sm:p-6 lg:p-8">
                        <img
                          src={banner.image}
                          alt={banner.title}
                          loading={idx < visibleCount ? 'eager' : 'lazy'}
                          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105 select-none"
                          draggable={false}
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.visibility = 'hidden';
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('.fallback-brand')) {
                              const fb = document.createElement('div');
                              fb.className = 'fallback-brand absolute inset-0 flex items-center justify-center';
                              fb.innerHTML = `<span class="text-sm sm:text-base lg:text-lg font-bold text-primary opacity-70 text-center px-3">${banner.title}</span>`;
                              parent.appendChild(fb);
                            }
                          }}
                        />
                      </div>
                      <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-t border-gray-50 text-center">
                        <span className="text-xs sm:text-sm font-semibold text-text truncate block">{banner.title}</span>
                      </div>
                    </div>
                  </div>
                </Wrapper>
              ))}
            </div>
          </div>

          {total > visibleCount && (
            <>
              <button
                onClick={goPrev}
                aria-label="Previous slide"
                className="sm:hidden absolute -left-0.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm shadow-soft border border-gray-100 flex items-center justify-center text-primary hover:bg-white transition-all duration-200 active:scale-95 z-10"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goNext}
                aria-label="Next slide"
                className="sm:hidden absolute -right-0.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm shadow-soft border border-gray-100 flex items-center justify-center text-primary hover:bg-white transition-all duration-200 active:scale-95 z-10"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {totalDots > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-4 lg:mt-5">
            {Array.from({ length: totalDots }).map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`rounded-full transition-all duration-300 ${
                  i === activeIndex
                    ? 'w-5 sm:w-7 h-1.5 sm:h-2 bg-primary'
                    : 'w-1.5 sm:w-2 h-1.5 sm:h-2 bg-accent-tan/70 hover:bg-accent-tan'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default HomepageCarousel;
