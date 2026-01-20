import sanitizeHtml from 'sanitize-html';

// Allowed tags for newsletter content
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'a', 'blockquote', 'pre', 'code',
  'hr', 'div', 'span'
];

const ALLOWED_ATTRIBUTES = {
  'a': ['href', 'target', 'rel'],
  'div': ['style'],
  'span': ['style'],
  'p': ['style'],
  '*': ['class']
};

// Allowed CSS properties for inline styles
const ALLOWED_STYLES = {
  '*': {
    'color': [/.*/],
    'background-color': [/.*/],
    'font-weight': [/.*/],
    'font-style': [/.*/],
    'text-align': [/.*/],
    'text-decoration': [/.*/],
  }
};

/**
 * Sanitize HTML content for safe rendering in the browser
 * Removes potentially dangerous elements like <script>, event handlers, etc.
 */
export function sanitizeNewsletterHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedStyles: ALLOWED_STYLES,
    // Ensure links open in new tab safely
    transformTags: {
      'a': (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      })
    }
  });
}

/**
 * Escape HTML entities for safe inclusion in HTML templates
 * Use this for plain text content that will be inserted into HTML
 */
export function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  };

  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}
