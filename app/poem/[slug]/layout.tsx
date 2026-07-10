import { PageShell } from '@/components/PageShell';

interface PoemLayoutProps {
  children: React.ReactNode;
}

export default function PoemLayout({ children }: PoemLayoutProps) {
  return <PageShell>{children}</PageShell>;
}
