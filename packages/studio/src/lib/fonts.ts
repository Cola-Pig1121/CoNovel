/**
 * Font configuration
 *
 * Uses CSS @font-face instead of next/font/local
 * to avoid webpack module loading issues in Next.js 15.5.x
 *
 * Font variables are defined in editorial.css via @font-face declarations.
 * This file exports the CSS class names for use in layout.
 */

export const fontClasses = {
  body: 'font-wenkai',
  mono: 'font-wenkai-mono',
};
