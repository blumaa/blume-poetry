'use client';

/* MDS ships no 'use client' banner (built for SPA bundlers); this barrel is
   the client boundary. Server components import MDS through here, never from
   the package directly. */
export * from '@mond-design-system/react';
