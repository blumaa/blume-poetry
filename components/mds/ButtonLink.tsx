'use client';

import Link from 'next/link';
import { Button, type ButtonProps } from '@mond-design-system/react';

/* Distributes over ButtonProps' iconOnly union, which a plain Omit would
   collapse. */
type WithoutAs<P> = P extends unknown ? Omit<P, 'as' | 'href'> : never;

export type ButtonLinkProps = WithoutAs<ButtonProps> & { href: string };

/* An MDS Button that navigates with next/link. Lives on the client side of
   the boundary: a server component cannot pass `as={Link}` itself, because
   there Link is a plain function, and functions do not cross into client
   components. */
export function ButtonLink(props: ButtonLinkProps) {
  return <Button as={Link} {...props} />;
}
