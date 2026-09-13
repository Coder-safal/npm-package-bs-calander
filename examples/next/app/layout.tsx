import type { ReactNode } from 'react';
import './style.css';

export const metadata = { title: 'BS Calendar — Next.js example' };
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
