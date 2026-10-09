import { PageShell } from '@/components/PageShell';

/* One shell for every public page. As a layout it is not re-rendered on
   navigation, so the sidebar's search, open folders and scroll survive. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <PageShell>{children}</PageShell>;
}
