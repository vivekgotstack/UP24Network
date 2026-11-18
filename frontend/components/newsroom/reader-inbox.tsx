'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AdminWorkspace } from '@/components/newsroom/admin-workspace';
import { cms, CmsError } from '@/lib/cms';
import { useNewsroomResource, useSession } from '@/lib/session';
import { correspondenceTopics, type CorrespondenceTopic } from '@/lib/correspondence';
import styles from './reader-inbox.module.css';

type Message = {
  id: string;
  topic: CorrespondenceTopic;
  name: string;
  email: string;
  subject: string;
  message: string;
  resolved: boolean;
  version: number;
  receivedAt: string;
};
type InboxPage = { items: Message[]; hasNext: boolean };
type Change = { message: Message; action: 'toggle' | 'delete' };

const path = 'admin/publication/inbox';
const receivedDate = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata',
});

export function ReaderInbox() {
  const account = useSession().data;
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [openOnly, setOpenOnly] = useState(true);
  const [removal, setRemoval] = useState<Message | null>(null);
  const inbox = useNewsroomResource<InboxPage>(
    account,
    `${path}?open=${openOnly}&page=${page}`,
    account?.role === 'ADMIN' && account.newsroomAccess === true,
    { refetchInterval: 60_000 },
  );

  const refresh = () =>
    client.invalidateQueries({
      queryKey: ['newsroom', account?.id],
      predicate: ({ queryKey }) =>
        typeof queryKey[2] === 'string' && queryKey[2].startsWith(`${path}?`),
    });
  const change = useMutation<void, CmsError, Change>({
    mutationFn: ({ message, action }) =>
      cms<void>(
        `${path}/${message.id}`,
        action === 'delete' ? 'DELETE' : 'PATCH',
        action === 'delete'
          ? { version: message.version }
          : { version: message.version, resolved: !message.resolved },
      ),
    onSuccess: refresh,
    onError: (reason) => {
      if (reason.status === 409) return refresh();
    },
  });

  return (
    <AdminWorkspace title="Reader inbox" active="inbox">
      <div className={styles.section}>
        <p>
          Review reader tips, corrections, complaints, and other enquiries. Messages expire after a
          year.
        </p>
        <div className={styles.controls}>
          <label>
            View{' '}
            <select
              value={openOnly ? 'open' : 'all'}
              onChange={(event) => {
                setOpenOnly(event.target.value === 'open');
                setPage(1);
              }}
            >
              <option value="open">Open messages</option>
              <option value="all">All messages</option>
            </select>
          </label>
          <Button
            variant="outline"
            disabled={inbox.isFetching}
            onClick={() => void inbox.refetch()}
          >
            Refresh
          </Button>
        </div>
        {inbox.error && (
          <p className="inline-error" role="alert">
            {inbox.error.message}
          </p>
        )}
        {change.error && !removal && (
          <p className="inline-error" role="alert">
            {change.error.message}
          </p>
        )}
        {inbox.isPending && <p role="status">Loading messages…</p>}
        {inbox.data?.items.length === 0 && <p>No messages on this page.</p>}
        {inbox.data?.items.map((message) => (
          <details className={styles.message} key={message.id}>
            <summary>
              <strong>{message.subject}</strong>
              <span>
                {correspondenceTopics[message.topic]} · {message.resolved ? 'Resolved' : 'Open'} ·{' '}
                <time dateTime={message.receivedAt}>
                  {receivedDate.format(new Date(message.receivedAt))}
                </time>
              </span>
            </summary>
            <div className={styles.content}>
              <p>
                <strong>{message.name}</strong> ·{' '}
                <a href={`mailto:${encodeURIComponent(message.email).replace('%40', '@')}`}>
                  {message.email}
                </a>
              </p>
              <p className={styles.body}>{message.message}</p>
              <div className="cms-row-actions">
                <Button
                  variant="outline"
                  disabled={change.isPending}
                  onClick={() => change.mutate({ message, action: 'toggle' })}
                >
                  {message.resolved ? 'Reopen' : 'Mark resolved'}
                </Button>
                <Button
                  variant="outline"
                  disabled={change.isPending}
                  onClick={() => {
                    change.reset();
                    setRemoval(message);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </details>
        ))}
        {(page > 1 || inbox.data?.hasNext) && (
          <nav className={styles.controls} aria-label="Inbox pagination">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span>Page {page}</span>
            <Button
              variant="outline"
              disabled={!inbox.data?.hasNext}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </nav>
        )}
      </div>
      <ConfirmDialog
        open={Boolean(removal)}
        onOpenChange={(open) => {
          if (!open) {
            setRemoval(null);
            change.reset();
          }
        }}
        title="Delete this message?"
        description="The message will be removed from the reader inbox."
        confirmLabel="Delete message"
        destructive
        onConfirm={() =>
          removal ? change.mutateAsync({ message: removal, action: 'delete' }) : undefined
        }
      />
    </AdminWorkspace>
  );
}
