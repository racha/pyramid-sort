import type { Lang } from './sorter';

export interface Sample {
  id: string;
  title: string;
  lead: string;
  lang: Lang;
  source: string;
}

export const HERO: Sample = {
  id: 'hero',
  title: 'JSX attributes',
  lead: '',
  lang: 'typescriptreact',
  source: `<input
  className="rounded-md border px-3 text-sm"
  ref={inputRef}
  placeholder="Search files..."
  type="search"
  onChange={handleChange}
  value={query}
/>`,
};

export const SAMPLES: Sample[] = [
  {
    id: 'imports',
    title: 'Imports',
    lead: 'External packages first, then local and alias paths. Length decides the order inside each group.',
    lang: 'typescriptreact',
    source: `import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import clsx from 'clsx';
import { useState } from 'react';
import { useUser } from '@/hooks/use-user';
import { motion } from 'motion/react';
import { api } from './api';`,
  },
  {
    id: 'attributes',
    title: 'Attributes',
    lead: 'Multiline JSX and HTML tags. A spread like {...props} is a wall: attributes sort on each side and never cross it.',
    lang: 'typescriptreact',
    source: `<Button
  aria-label="Close dialog"
  variant="ghost"
  size="icon"
  {...props}
  onClick={onClose}
  disabled={isSaving}
  type="button"
/>`,
  },
  {
    id: 'types',
    title: 'Types',
    lead: 'Members of type, interface, and enum bodies. A blank line starts a new group, and each group sorts on its own.',
    lang: 'typescript',
    source: `interface User {
  emailVerifiedAt: Date | null;
  id: string;
  displayName: string;

  role: 'admin' | 'member';
  avatarUrl?: string;
  createdAt: Date;
}`,
  },
  {
    id: 'objects',
    title: 'Objects',
    lead: 'const objects and return { … }. Nested objects stay intact unless you opt in.',
    lang: 'typescript',
    source: `const config = {
  endpoint: '/api/v1/users',
  retries: 3,
  timeout: 3000,

  headers: { accept: 'application/json' },
  cache: true,
};`,
  },
  {
    id: 'css',
    title: 'CSS',
    lead: 'Declarations inside a rule, in CSS, SCSS, and Less. Selectors and nested rules stay where they are.',
    lang: 'css',
    source: `.card {
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.2);
  padding: 16px;
  border-radius: 12px;
  display: grid;

  background-color: #121422;
  color: #e8eef6;
}`,
  },
];

export const PLAYGROUND = `import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

type Props = {
  lastSeenAt: Date;
  name: string;
  isOnline: boolean;
};

export function UserCard({ name, lastSeenAt, isOnline }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Card
      className={clsx('flex items-center gap-3 p-4', open && 'ring-2')}
      onClick={() => setOpen(!open)}
      title={name}
      role="button"
    />
  );
}`;
