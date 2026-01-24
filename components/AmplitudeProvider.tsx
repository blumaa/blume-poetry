"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initAnalytics, trackEvent, EVENTS } from "@/lib/analytics";

export function AmplitudeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize Amplitude once
  useEffect(() => {
    initAnalytics();
  }, []);

  // Track page views on route changes
  useEffect(() => {
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    trackEvent(EVENTS.PAGE_VIEW, {
      page_path: pathname,
      page_url: url,
    });
  }, [pathname, searchParams]);

  return <>{children}</>;
}

// Re-export for convenience
export { trackEvent, EVENTS } from "@/lib/analytics";

// Helper functions for specific events
export function trackNavigation(method: "keyboard" | "swipe" | "click", direction: "next" | "prev", fromPoem: string, toPoem: string) {
  trackEvent(EVENTS.POEM_NAVIGATION, {
    method,
    direction,
    from_poem: fromPoem,
    to_poem: toPoem,
  });
}

export function trackMenuOpen(source: "hamburger" | "sidebar") {
  trackEvent(EVENTS.MENU_OPENED, { source });
}

export function trackMenuClose() {
  trackEvent(EVENTS.MENU_CLOSED);
}

export function trackSidebarToggle(collapsed: boolean) {
  trackEvent(EVENTS.SIDEBAR_TOGGLED, { collapsed });
}

export function trackSearch(query: string, resultCount: number) {
  trackEvent(EVENTS.SEARCH, {
    query,
    result_count: resultCount,
  });
}

export function trackPoemOpen(slug: string, title: string, source: "search" | "tree" | "navigation" | "direct") {
  trackEvent(EVENTS.POEM_OPENED, {
    poem_slug: slug,
    poem_title: title,
    source,
  });
}

export function trackCategoryToggle(categoryId: string, expanded: boolean) {
  trackEvent(EVENTS.CATEGORY_TOGGLED, {
    category_id: categoryId,
    expanded,
  });
}

export function trackLike(slug: string, action: "like" | "unlike") {
  trackEvent(EVENTS.POEM_LIKED, {
    poem_slug: slug,
    action,
  });
}

export function trackCommentModalOpen(slug: string) {
  trackEvent(EVENTS.COMMENT_MODAL_OPENED, {
    poem_slug: slug,
  });
}

export function trackCommentSubmit(slug: string) {
  trackEvent(EVENTS.COMMENT_SUBMITTED, {
    poem_slug: slug,
  });
}

export function trackThemeToggle(newTheme: "light" | "dark") {
  trackEvent(EVENTS.THEME_TOGGLED, {
    new_theme: newTheme,
  });
}

export function trackSubscribeModalOpen() {
  trackEvent(EVENTS.SUBSCRIBE_MODAL_OPENED);
}

export function trackSubscribeSubmit(success: boolean) {
  trackEvent(EVENTS.SUBSCRIBE_SUBMITTED, {
    success,
  });
}

export function trackNavArrowClick(direction: "prev" | "next", fromPoem: string, toPoem: string) {
  trackEvent(EVENTS.POEM_NAVIGATION, {
    method: "click",
    direction,
    from_poem: fromPoem,
    to_poem: toPoem,
  });
}

export function trackScrollDepth(slug: string, depth: 25 | 50 | 75 | 100) {
  trackEvent(EVENTS.SCROLL_DEPTH, {
    poem_slug: slug,
    depth_percent: depth,
  });
}

export function trackTimeOnPoem(slug: string, seconds: number) {
  trackEvent(EVENTS.TIME_ON_POEM, {
    poem_slug: slug,
    seconds,
    minutes: Math.round(seconds / 60 * 10) / 10,
  });
}

export function trackAboutClick() {
  trackEvent(EVENTS.ABOUT_CLICKED);
}

export function trackUnsubscribe(success: boolean) {
  trackEvent(EVENTS.UNSUBSCRIBE, {
    success,
  });
}
