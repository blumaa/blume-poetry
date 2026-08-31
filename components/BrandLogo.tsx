import { useId } from 'react';
import styles from './BrandLogo.module.css';

/* The official logo (Blumenous Poetry Logo Directions): the moonflower mark —
   a crescent moon with three petals drifting out of it — beside the two-tone
   wordmark.
   Both are inlined rather than <img>-linked for two reasons: the fills read
   the --logo-* theme variables (terracotta mark on light, peach on dark), and
   an external SVG cannot load the Space Grotesk the wordmark is set in — a
   browser never fetches fonts for an SVG inside <img>.

   Decorative throughout: the link wrapping it supplies the accessible name.
   The mask id comes from useId because the mark can appear twice on one page
   (mobile header and sidebar), and duplicate ids make every copy read the
   first one's mask. */
export function BrandLogo() {
  const maskId = `${useId()}-crescent`;

  return (
    <span className={styles.logo}>
      {/* <svg */}
      {/*   className={styles.mark} */}
      {/*   viewBox="0 0 42 42" */}
      {/*   aria-hidden="true" */}
      {/*   focusable="false" */}
      {/* > */}
      {/*   <defs> */}
      {/*     <mask id={maskId}> */}
      {/*       <rect width="42" height="42" fill="black" /> */}
      {/*       <circle cx="21" cy="21" r="15" fill="white" /> */}
      {/*       <circle cx="15" cy="15" r="13.5" fill="black" /> */}
      {/*     </mask> */}
      {/*   </defs> */}
      {/*   <rect width="42" height="42" fill="var(--logo-mark)" mask={`url(#${maskId})`} /> */}
      {/*   <circle cx="17" cy="14" r="3.2" fill="var(--logo-mark)" /> */}
      {/*   <circle cx="11.5" cy="19.5" r="3.2" fill="var(--logo-mark)" opacity="0.65" /> */}
      {/*   <circle cx="14" cy="26" r="3.2" fill="var(--logo-mark)" opacity="0.4" /> */}
      {/* </svg> */}
      <svg
        className={styles.wordmark}
        viewBox="0 0 318 44"
        aria-hidden="true"
        focusable="false"
      >
        <text x="0" y="32" fontFamily="var(--font-logo), 'Space Grotesk', sans-serif" fontSize="30">
          <tspan fontWeight="400" fill="var(--logo-word)">
            blumenous
          </tspan>
          <tspan fontWeight="300" fill="var(--logo-word-sub)">
            poetry
          </tspan>
        </text>
      </svg>
    </span>
  );
}
