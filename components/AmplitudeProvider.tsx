"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import * as amplitude from "@amplitude/analytics-browser";

const AMPLITUDE_API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;

let initialized = false;

export function AmplitudeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize Amplitude once
  useEffect(() => {
    if (initialized) return;

    if (!AMPLITUDE_API_KEY) {
      console.warn("[Amplitude] API key not configured");
      return;
    }

    amplitude.init(AMPLITUDE_API_KEY, {
      autocapture: {
        elementInteractions: true,
        pageViews: true,
        sessions: true,
        formInteractions: true,
      },
    });
    initialized = true;
  }, []);

  // Track page views on route changes
  useEffect(() => {
    if (initialized) {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
      amplitude.track("Page View", {
        page_path: pathname,
        page_url: url,
      });
    }
  }, [pathname, searchParams]);

  return <>{children}</>;
}

// Core tracking function
export function trackEvent(eventName: string, eventProperties?: Record<string, unknown>) {
  if (!initialized) return;
  amplitude.track(eventName, eventProperties);
}

// Navigation events
export function trackNavigation(method: "keyboard" | "swipe" | "click", direction: "next" | "prev", fromPoem: string, toPoem: string) {
  trackEvent("Poem Navigation", {
    method,
    direction,
    from_poem: fromPoem,
    to_poem: toPoem,
  });
}

// Menu events
export function trackMenuOpen(source: "hamburger" | "sidebar") {
  trackEvent("Menu Opened", { source });
}

export function trackMenuClose() {
  trackEvent("Menu Closed");
}

export function trackSidebarToggle(collapsed: boolean) {
  trackEvent("Sidebar Toggled", { collapsed });
}

// Search events
export function trackSearch(query: string, resultCount: number) {
  trackEvent("Search", {
    query,
    result_count: resultCount,
  });
}

// Poem events
export function trackPoemOpen(slug: string, title: string, source: "search" | "tree" | "navigation" | "direct") {
  trackEvent("Poem Opened", {
    poem_slug: slug,
    poem_title: title,
    source,
  });
}

export function trackCategoryToggle(categoryId: string, expanded: boolean) {
  trackEvent("Category Toggled", {
    category_id: categoryId,
    expanded,
  });
}

// Engagement events
export function trackLike(slug: string, action: "like" | "unlike") {
  trackEvent("Poem Liked", {
    poem_slug: slug,
    action,
  });
}

export function trackCommentModalOpen(slug: string) {
  trackEvent("Comment Modal Opened", {
    poem_slug: slug,
  });
}

export function trackCommentSubmit(slug: string) {
  trackEvent("Comment Submitted", {
    poem_slug: slug,
  });
}

// UI events
export function trackThemeToggle(newTheme: "light" | "dark") {
  trackEvent("Theme Toggled", {
    new_theme: newTheme,
  });
}

export function trackSubscribeModalOpen() {
  trackEvent("Subscribe Modal Opened");
}

export function trackSubscribeSubmit(success: boolean) {
  trackEvent("Subscribe Submitted", {
    success,
  });
}

export function trackNavArrowClick(direction: "prev" | "next", fromPoem: string, toPoem: string) {
  trackEvent("Poem Navigation", {
    method: "click",
    direction,
    from_poem: fromPoem,
    to_poem: toPoem,
  });
}

// Reading behavior
export function trackScrollDepth(slug: string, depth: 25 | 50 | 75 | 100) {
  trackEvent("Poem Scroll Depth", {
    poem_slug: slug,
    depth_percent: depth,
  });
}

export function trackTimeOnPoem(slug: string, seconds: number) {
  trackEvent("Time on Poem", {
    poem_slug: slug,
    seconds,
    minutes: Math.round(seconds / 60 * 10) / 10,
  });
}

// Navigation
export function trackAboutClick() {
  trackEvent("About Page Clicked");
}

export function trackUnsubscribe(success: boolean) {
  trackEvent("Unsubscribe", {
    success,
  });
}
