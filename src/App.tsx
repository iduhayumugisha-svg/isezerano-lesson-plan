import React, { useState, useEffect, Suspense, lazy } from 'react';

// Eager Public Shell & Homepage Components (Fast initial paint)
import { WebsiteHeader, WebsitePage } from './components/WebsiteHeader';
import { WebsiteFooter } from './components/WebsiteFooter';
import { HomeView } from './views/HomeView';
import { AdSlot } from './components/AdSlot';
import { AdscodBannerAd } from './components/AdscodBannerAd';
import { WhatsAppFloatingButton } from './components/WhatsAppFloatingButton';
import { MiniShopBar } from './components/MiniShopBar';

// Code-split Secondary Public Views & Modals
const BlogView = lazy(() => import('./views/BlogView').then((m) => ({ default: m.BlogView })));
const AboutView = lazy(() => import('./views/InfoPagesView').then((m) => ({ default: m.AboutView })));
const PrivacyPolicyView = lazy(() => import('./views/InfoPagesView').then((m) => ({ default: m.PrivacyPolicyView })));
const TermsConditionsView = lazy(() => import('./views/InfoPagesView').then((m) => ({ default: m.TermsConditionsView })));
const ContactView = lazy(() => import('./views/ContactView').then((m) => ({ default: m.ContactView })));

// Code-split Admin & Announcement Views
const AdminPortalGateway = lazy(() => import('./views/AdminPortalGateway').then((m) => ({ default: m.AdminPortalGateway })));
const AdminDashboardView = lazy(() => import('./views/AdminDashboardView').then((m) => ({ default: m.AdminDashboardView })));
const AnnouncementDetailModal = lazy(() => import('./components/AnnouncementDetailModal').then((m) => ({ default: m.AnnouncementDetailModal })));

import { PushAnnouncement, MiniShopProduct } from './types/platform';
import { LanguageProvider } from './i18n/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebsiteDesignProvider, useWebsiteDesign } from './context/WebsiteDesignContext';
import { initGoogleAnalytics, trackPageView } from './services/analyticsService';
import { updateWebsiteBrandingSeo } from './services/seoService';
import { BlogCategory, BlogPost, DEFAULT_AI_BLOG_CATEGORIES } from './types/blog';
import {
  subscribeToBlogPosts,
  subscribeToBlogCategories,
  mergeCategoriesForDisplay
} from './services/blogService';
import { subscribeToApprovedCommentCounts } from './services/commentService';
import { subscribeToActiveMiniShopProducts } from './services/miniShopService';
import { scrollMainContentToTop } from './utils/scrollUtils';

export type AppPage = WebsitePage;

// Helper to determine initial page from browser URL or hash
const getPageFromUrl = (): AppPage => {
  if (typeof window === 'undefined') return 'home';
  const pathname = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const search = new URLSearchParams(window.location.search);

  if (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/manage' ||
    pathname.startsWith('/manage/') ||
    hash === '#admin' ||
    hash === '#manage' ||
    search.get('page') === 'admin'
  ) {
    return 'admin';
  }
  if (pathname === '/blog' || pathname.startsWith('/blog/') || hash === '#blog' || hash.startsWith('#blog/') || search.get('page') === 'blog') return 'blog';
  if (pathname === '/about' || hash === '#about' || search.get('page') === 'about') return 'about';
  if (pathname === '/contact' || hash === '#contact' || search.get('page') === 'contact') return 'contact';
  if (pathname === '/privacy' || hash === '#privacy' || search.get('page') === 'privacy') return 'privacy';
  if (pathname === '/terms' || hash === '#terms' || search.get('page') === 'terms') return 'terms';

  return 'home';
};

const getBlogSlugFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  const pathname = window.location.pathname;
  if (pathname.toLowerCase().startsWith('/blog/')) {
    const slug = decodeURIComponent(pathname.slice('/blog/'.length)).replace(/\/+$/, '');
    return slug || null;
  }
  const hash = window.location.hash;
  if (hash.toLowerCase().startsWith('#blog/')) {
    const slug = decodeURIComponent(hash.slice('#blog/'.length)).replace(/\/+$/, '');
    return slug || null;
  }
  const searchSlug = new URLSearchParams(window.location.search).get('post');
  return searchSlug || null;
};

function AppContent() {
  const { user, isAdmin, signOutUser } = useAuth();
  const { colors, branding, miniShopDisplay } = useWebsiteDesign();

  // Route state initialized from browser URL
  const [currentPage, setCurrentPage] = useState<AppPage>(() => getPageFromUrl());
  const [activeBlogSlug, setActiveBlogSlug] = useState<string | null>(() => getBlogSlugFromUrl());

  // Shared Newspaper Feed & Live Firestore Categories
  const [publishedPosts, setPublishedPosts] = useState<BlogPost[]>([]);
  const [rawNewsCategories, setRawNewsCategories] = useState<BlogCategory[]>(
    DEFAULT_AI_BLOG_CATEGORIES
  );
  const [newsCategoriesInitialized, setNewsCategoriesInitialized] = useState<boolean>(false);
  const [isNewsLoading, setIsNewsLoading] = useState<boolean>(true);
  const [selectedNewsCategory, setSelectedNewsCategory] = useState<string>('All Categories');
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [focusArticleComments, setFocusArticleComments] = useState<boolean>(false);
  const [selectedNotice, setSelectedNotice] = useState<PushAnnouncement | null>(null);
  const [activeMiniShopProducts, setActiveMiniShopProducts] = useState<MiniShopProduct[]>([]);
  const [miniShopHeight, setMiniShopHeight] = useState<number>(0);

  // Live newspaper articles, Firestore categories, comments, and Mini Shop subscription
  useEffect(() => {
    setIsNewsLoading(true);
    const unsubPosts = subscribeToBlogPosts((posts) => {
      setPublishedPosts(posts);
      setIsNewsLoading(false);
    }, false);

    const unsubCategories = subscribeToBlogCategories((fetchedCats, initialized) => {
      setRawNewsCategories(fetchedCats);
      setNewsCategoriesInitialized(initialized);
    });

    const unsubComments = subscribeToApprovedCommentCounts((counts) => {
      setCommentCounts(counts);
    });

    const unsubMiniShop = subscribeToActiveMiniShopProducts((products) => {
      setActiveMiniShopProducts(products);
    });

    return () => {
      unsubPosts();
      unsubCategories();
      unsubComments();
      unsubMiniShop();
    };
  }, []);

  const newsCategories = mergeCategoriesForDisplay(
    rawNewsCategories,
    newsCategoriesInitialized,
    publishedPosts
  );

  useEffect(() => {
    // Check if user arrived via FCM notification click (?notice=<id>)
    if (typeof window !== 'undefined' && window.location.search) {
      try {
        const noticeId = new URLSearchParams(window.location.search).get('notice');
        if (noticeId) {
          import('./services/fcmService')
            .then(({ getAnnouncementById }) => getAnnouncementById(noticeId))
            .then((notice) => {
              if (notice) {
                setSelectedNotice(notice);
              }
            })
            .catch((err) => {
              console.warn('[FCM] Error loading notice deep-link:', err);
            });
        }
      } catch {
        // ignore
      }
    }

    // Listen to browser navigation (back/forward button and hash changes)
    const handleUrlChange = () => {
      const detected = getPageFromUrl();
      setCurrentPage(detected);
      setActiveBlogSlug(getBlogSlugFromUrl());
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);

    // Clean up unwanted tracking parameters (e.g. ?utm_source=...) from browser URL
    if (typeof window !== 'undefined' && window.location.search) {
      try {
        const url = new URL(window.location.href);
        let modified = false;
        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((key) => {
          if (url.searchParams.has(key)) {
            url.searchParams.delete(key);
            modified = true;
          }
        });
        if (modified) {
          const cleanPath = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '') + url.hash;
          window.history.replaceState({}, document.title, cleanPath);
        }
      } catch {
        // ignore
      }
    }

    // Defer Google Analytics 4 initialization until after initial paint/idle
    let gaTimeoutId: number | undefined;
    let gaIdleId: number | undefined;
    const scheduleGa = () => initGoogleAnalytics();
    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const idleWin = typeof window !== 'undefined' ? (window as IdleWindow) : undefined;
    if (idleWin?.requestIdleCallback) {
      gaIdleId = idleWin.requestIdleCallback(scheduleGa, { timeout: 2000 });
    } else if (idleWin) {
      gaTimeoutId = idleWin.setTimeout(scheduleGa, 1200);
    }

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
      if (gaIdleId !== undefined && idleWin?.cancelIdleCallback) {
        idleWin.cancelIdleCallback(gaIdleId);
      }
      if (gaTimeoutId !== undefined && idleWin) {
        idleWin.clearTimeout(gaTimeoutId);
      }
    };
  }, []);

  // Track SPA navigation in Google Analytics 4 and keep browser title/SEO metadata in sync with Admin branding
  useEffect(() => {
    trackPageView(currentPage);
  }, [currentPage]);

  useEffect(() => {
    if (currentPage === 'blog' && activeBlogSlug) {
      return; // BlogView manages per-article SEO tags cleanly
    }
    updateWebsiteBrandingSeo(branding);
  }, [branding, currentPage, activeBlogSlug]);

  const handleNavigate = (page: WebsitePage | AppPage) => {
    setCurrentPage(page);
    if (page === 'blog') {
      setActiveBlogSlug(null);
    }
    scrollMainContentToTop('auto');

    if (typeof window !== 'undefined') {
      try {
        const targetPath = page === 'home'
          ? '/'
          : page === 'admin'
          ? '/admin'
          : `/${page}`;
        if (window.location.pathname !== targetPath) {
          window.history.pushState({ page }, '', targetPath);
        }
      } catch {
        // ignore
      }
    }
  };

  const handleSelectBlogPostSlug = (slug: string | null) => {
    setActiveBlogSlug(slug);
    if (typeof window !== 'undefined') {
      try {
        const targetPath = slug ? `/blog/${encodeURIComponent(slug)}` : '/blog';
        if (window.location.pathname !== targetPath) {
          window.history.pushState({ page: 'blog', slug }, '', targetPath);
        }
      } catch {
        // ignore
      }
    }
  };

  const handleOpenNewspaperArticle = (post: BlogPost, openComments = false) => {
    setFocusArticleComments(openComments);
    setActiveBlogSlug(post.slug);
    setCurrentPage('blog');
    if (!openComments) {
      scrollMainContentToTop('auto');
    }
    if (typeof window !== 'undefined') {
      try {
        const targetPath = `/blog/${encodeURIComponent(post.slug)}`;
        if (window.location.pathname !== targetPath) {
          window.history.pushState({ page: 'blog', slug: post.slug }, '', targetPath);
        }
      } catch {
        // ignore
      }
    }
  };

  const showMiniShop = currentPage !== 'admin' && activeMiniShopProducts.length > 0;
  const effectiveMiniShopOffset = showMiniShop ? miniShopHeight : 0;

  return (
    <div
      className="min-h-screen flex flex-col w-full antialiased overflow-x-clip selection:bg-teal-700 selection:text-white transition-colors"
      style={{
        backgroundColor: colors.bodyBg,
        color: colors.bodyText
      }}
    >
      {/* 0. Fixed Mini Shop / Product Showcase (Always pinned above WebsiteHeader on public pages) */}
      <MiniShopBar
        products={activeMiniShopProducts}
        visible={showMiniShop}
        onHeightChange={setMiniShopHeight}
        displaySettings={miniShopDisplay}
      />
      {effectiveMiniShopOffset > 0 && (
        <div
          aria-hidden="true"
          data-testid="mini-shop-spacer"
          className="no-print w-full shrink-0"
          style={{ height: `${effectiveMiniShopOffset}px` }}
        />
      )}

      {/* 1. Fixed/Sticky Global Newspaper Header */}
      <WebsiteHeader
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onSelectAnnouncement={(notice) => setSelectedNotice(notice)}
        newsCategories={newsCategories}
        selectedCategory={selectedNewsCategory}
        onSelectCategory={setSelectedNewsCategory}
        topOffsetPx={effectiveMiniShopOffset}
      />

      {/* 2. Adscod banner (existing publisher integration) */}
      <AdscodBannerAd />

      {/* 3. Admin-managed below-header advertisement slot */}
      <AdSlot placement="below_header" className="no-print" />

      {/* 3. Natural Document Flow Main Body */}
      <main className="flex-1 w-full min-w-0 relative z-0">
        {/* PUBLIC PAGE 1: Online Newspaper Homepage (Default opening page at /) */}
        {currentPage === 'home' && (
          <HomeView
            onNavigate={handleNavigate}
            posts={publishedPosts}
            categories={newsCategories}
            commentCounts={commentCounts}
            isNewsLoading={isNewsLoading}
            selectedCategory={selectedNewsCategory}
            onSelectCategory={setSelectedNewsCategory}
            onOpenArticle={(post) => handleOpenNewspaperArticle(post, false)}
            onOpenArticleComments={(post) => handleOpenNewspaperArticle(post, true)}
          />
        )}

        <Suspense
          fallback={
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 text-center text-sm text-slate-500">
              Loading page...
            </div>
          }
        >
          {/* PUBLIC PAGE 1B: Public Blog & Article Reading View */}
          {currentPage === 'blog' && (
            <BlogView
              initialSlug={activeBlogSlug}
              onSelectPostSlug={handleSelectBlogPostSlug}
              selectedCategory={selectedNewsCategory}
              onSelectCategory={setSelectedNewsCategory}
              onReturnHome={() => handleNavigate('home')}
              commentCounts={commentCounts}
              focusComments={focusArticleComments}
              onConsumeFocusComments={() => setFocusArticleComments(false)}
            />
          )}

          {/* PUBLIC PAGE 2: About Us View */}
          {currentPage === 'about' && (
            <AboutView onNavigate={handleNavigate} />
          )}

          {/* PUBLIC PAGE 3: Contact Us View */}
          {currentPage === 'contact' && (
            <ContactView onNavigate={handleNavigate} />
          )}

          {/* PUBLIC PAGE 4: Privacy Policy View */}
          {currentPage === 'privacy' && (
            <PrivacyPolicyView onNavigate={handleNavigate} />
          )}

          {/* PUBLIC PAGE 5: Terms and Conditions View */}
          {currentPage === 'terms' && (
            <TermsConditionsView onNavigate={handleNavigate} />
          )}

          {/* ADMIN MANAGEMENT & DASHBOARD PORTAL: Accessible via /admin or menu */}
          {currentPage === 'admin' && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              {isAdmin && user ? (
                <AdminDashboardView
                  onNavigate={handleNavigate}
                  onLogout={async () => {
                    await signOutUser();
                    handleNavigate('home');
                  }}
                />
              ) : (
                <AdminPortalGateway
                  onNavigate={handleNavigate}
                />
              )}
            </div>
          )}
        </Suspense>
      </main>

      {/* Ad Placement: Above Footer (Scrolls naturally with page content) */}
      <AdSlot placement="above_footer" className="no-print" />

      {/* 4. Global Professional Public Website Footer */}
      <WebsiteFooter onNavigate={handleNavigate} />

      {/* 5. Dynamic Configurable WhatsApp Contact Button */}
      <WhatsAppFloatingButton currentPage={currentPage} />

      {/* 5. Push Alert Detail Modal */}
      {selectedNotice && (
        <Suspense fallback={null}>
          <AnnouncementDetailModal
            announcement={selectedNotice}
            isOpen={!!selectedNotice}
            onClose={() => setSelectedNotice(null)}
          />
        </Suspense>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <WebsiteDesignProvider>
          <AppContent />
        </WebsiteDesignProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
