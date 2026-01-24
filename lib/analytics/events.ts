export const EVENTS = {
  // Page views
  PAGE_VIEW: "page_view",

  // Navigation
  POEM_NAVIGATION: "poem_navigation",
  POEM_OPENED: "poem_opened",
  CATEGORY_TOGGLED: "category_toggled",

  // Menu
  MENU_OPENED: "menu_opened",
  MENU_CLOSED: "menu_closed",
  SIDEBAR_TOGGLED: "sidebar_toggled",

  // Search
  SEARCH: "search",

  // Engagement
  POEM_LIKED: "poem_liked",
  COMMENT_MODAL_OPENED: "comment_modal_opened",
  COMMENT_SUBMITTED: "comment_submitted",

  // Reading
  SCROLL_DEPTH: "scroll_depth",
  TIME_ON_POEM: "time_on_poem",

  // Settings
  THEME_TOGGLED: "theme_toggled",

  // Subscribe
  SUBSCRIBE_MODAL_OPENED: "subscribe_modal_opened",
  SUBSCRIBE_SUBMITTED: "subscribe_submitted",
  UNSUBSCRIBE: "unsubscribe",

  // About
  ABOUT_CLICKED: "about_clicked",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
