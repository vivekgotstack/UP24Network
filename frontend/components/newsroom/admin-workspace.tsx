'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { LayoutDashboard, FileText, Users, Settings2, Images, Newspaper, SlidersHorizontal, Trash2, Activity, Inbox, ClipboardCheck } from 'lucide-react';
import { useSession } from '@/lib/session';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';

const adminPages = [
  { key: 'overview', href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { key: 'articles', href: '/admin/articles', label: 'Articles', icon: FileText },
  { key: 'reviews', href: '/admin/reviews', label: 'Editorial review', icon: ClipboardCheck },
  { key: 'trash', href: '/admin/trash', label: 'Withdrawn & trash', icon: Trash2 },
  { key: 'media', href: '/admin/media', label: 'Media library', icon: Images },
  { key: 'pages', href: '/admin/pages', label: 'Publication pages', icon: Newspaper },
  { key: 'inbox', href: '/admin/inbox', label: 'Reader inbox', icon: Inbox },
  { key: 'accounts', href: '/admin/accounts', label: 'Team & readers', icon: Users },
  { key: 'workflows', href: '/admin/workflows', label: 'Staff workflows', icon: SlidersHorizontal },
  { key: 'automations', href: '/admin/automations', label: 'Automations', icon: Settings2 },
  { key: 'operations', href: '/admin/operations', label: 'Operations', icon: Activity },
  { key: 'settings', href: '/admin/settings', label: 'Site settings', icon: Settings2 },
];

export function AdminNavigation({ active, staff = false }: { active: string; staff?: boolean }) {
  const pages = staff ? adminPages.slice(0,2).map(item => ({ ...item, href: item.href.replace('/admin','/newsroom') })) : adminPages;
  return <nav className="cms-tabs cms-nav cms-control-nav" aria-label="Newsroom pages">
    {pages.map(item => <Link key={item.key} href={item.href} aria-current={active === item.key ? 'page' : undefined}>
      <item.icon size={17} aria-hidden="true" />{item.label}
    </Link>)}
  </nav>;
}

export function AdminWorkspace({ title, active, children }: { title: string; active: string; children: ReactNode }) {
  const session = useSession();
  if (session.isLoading) return <main id="main-content" className="account-loading" role="status">Opening administration…</main>;
  if (!session.data?.newsroomAccess || session.data.role !== 'ADMIN') return <main id="main-content" className="empty-state">
    <h1>Administrator verification required</h1><Link href="/admin/sign-in">Verify your sign-in</Link>
  </main>;
  return <main id="main-content" className="cms-shell" lang="en">
    <header className="cms-heading"><div><Link className="cms-home cms-brand-link" href="/"><BrandLogo />UP24Network / Back to reader</Link><h1>{title}</h1></div>
      <div className="cms-identity"><div><strong>{session.data.displayName}</strong><span>Administrator</span></div>
        <Button variant="outline" onClick={() => void session.signOut()}>Sign out</Button></div>
    </header>
    <AdminNavigation active={active} />{children}
  </main>;
}
