'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { Account } from '@/lib/cms';
import { articleDesk } from '@/lib/newsroom/articles';
import type { ManagedArticle } from '@/lib/newsroom/types';

export function ContinueStoryButton({
  article,
  user,
  disabled,
  compact,
}: {
  article: ManagedArticle;
  user: Account;
  disabled?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const client = useQueryClient();
  const continuation = useMutation({
    mutationFn: () => articleDesk.continueStory(article.id),
    onSuccess: (draft) => {
      client.setQueryData(['newsroom', user.id, `admin/articles/${draft.id}`], draft);
      void client.invalidateQueries({
        queryKey: ['newsroom', user.id],
        predicate: ({ queryKey }) => String(queryKey[2]).startsWith('admin/articles/browse'),
      });
      router.push(`${user.role === 'ADMIN' ? '/admin' : '/newsroom'}/articles/${draft.id}`);
    },
  });

  if (
    article.status !== 'PUBLISHED' ||
    (user.role !== 'ADMIN' && (user.role === 'SUBSCRIBER' || article.authorId !== user.id))
  )
    return null;

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size={compact ? 'sm' : 'default'}
        disabled={disabled || continuation.isPending}
        onClick={() => continuation.mutate()}
      >
        {continuation.isPending ? 'Creating draft…' : 'Continue story'}
      </Button>
      {continuation.error && (
        <p className="inline-error" role="alert">
          {continuation.error.message}
        </p>
      )}
    </div>
  );
}
