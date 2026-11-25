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
  decisionDueAt: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  preserved: boolean;
};
type InboxPage = { items: Message[]; hasNext: boolean };
type Change = { message: Message } & (
  { action: 'resolve'; resolutionNote?: string } | { action: 'preservation' } | { action: 'delete' }
);

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
  const [topic, setTopic] = useState('');
  const [reference, setReference] = useState('');
  const [decision, setDecision] = useState<{ id: string; note: string } | null>(null);
  const [confirmation, setConfirmation] = useState<Extract<
    Change,
    { action: 'delete' | 'preservation' }
  > | null>(null);
  const filters = new URLSearchParams({ open: String(openOnly), page: String(page) });
  if (reference) filters.set('reference', reference);
  else if (topic) filters.set('topic', topic);
  const inbox = useNewsroomResource<InboxPage>(
    account,
    `${path}?${filters}`,
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
    mutationFn: (input) => {
      const { message, action } = input;
      const endpoint = `${path}/${message.id}`;
      const version = message.version;
      if (action === 'delete') return cms<void>(endpoint, 'DELETE', { version });
      if (action === 'preservation') {
        return cms<void>(`${endpoint}/preservation`, 'PATCH', {
          version,
          preserved: !message.preserved,
        });
      }
      return cms<void>(endpoint, 'PATCH', {
        version,
        resolved: !message.resolved,
        resolutionNote: input.resolutionNote,
      });
    },
    onSuccess: (_, input) => {
      if (input.action === 'resolve') setDecision(null);
      return refresh();
    },
    onError: (reason) => {
      if (reason.status === 409) return refresh();
    },
  });

  return (
    <AdminWorkspace title="Reader inbox" active="inbox">
      <div className={styles.section}>
        <p>
          Review reader messages and record decisions. Open complaints, open privacy requests and
          records preserved for legal matters stay in the inbox during automatic cleanup.
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
          <label>
            Topic{' '}
            <select
              value={topic}
              disabled={Boolean(reference)}
              onChange={(event) => {
                setTopic(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All topics</option>
              {Object.entries(correspondenceTopics).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
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
        <form
          className={styles.controls}
          onSubmit={(event) => {
            event.preventDefault();
            setReference(String(new FormData(event.currentTarget).get('reference')));
            setOpenOnly(false);
            setPage(1);
          }}
        >
          <label>
            Reference number{' '}
            <input
              name="reference"
              className={styles.referenceInput}
              required
              maxLength={36}
              pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
            />
          </label>
          <Button type="submit" variant="outline">
            Find message
          </Button>
          {reference && (
            <Button type="reset" variant="outline" onClick={() => setReference('')}>
              Clear reference
            </Button>
          )}
        </form>
        {inbox.error && (
          <p className="inline-error" role="alert">
            {inbox.error.message}
          </p>
        )}
        {change.error && !confirmation && (
          <p className="inline-error" role="alert">
            {change.error.message}
          </p>
        )}
        {inbox.isPending && <p role="status">Loading messages…</p>}
        {inbox.data?.items.length === 0 && <p>No messages on this page.</p>}
        {inbox.data?.items.map((message) => {
          const needsDecision = message.topic === 'COMPLAINT' || message.topic === 'PRIVACY';
          return (
            <details className={styles.message} key={message.id}>
              <summary>
                <strong>{message.subject}</strong>
                <span>
                  {correspondenceTopics[message.topic]} · {message.resolved ? 'Resolved' : 'Open'} ·{' '}
                  <time dateTime={message.receivedAt}>
                    {receivedDate.format(new Date(message.receivedAt))}
                  </time>
                  {message.preserved && ' · Preserved'}
                  {!message.resolved && message.decisionDueAt && (
                    <>
                      {' '}
                      · Decision target{' '}
                      <time dateTime={message.decisionDueAt}>
                        {receivedDate.format(new Date(message.decisionDueAt))}
                      </time>
                    </>
                  )}
                </span>
              </summary>
              <div className={styles.content}>
                <p>
                  <strong>{message.name}</strong> ·{' '}
                  <a href={`mailto:${encodeURIComponent(message.email).replace('%40', '@')}`}>
                    {message.email}
                  </a>
                </p>
                <p>
                  Reference · <code>{message.id}</code>
                </p>
                <p className={styles.body}>{message.message}</p>
                {message.resolvedAt && (
                  <p>
                    Decision recorded ·{' '}
                    <time dateTime={message.resolvedAt}>
                      {receivedDate.format(new Date(message.resolvedAt))}
                    </time>
                  </p>
                )}
                {message.resolutionNote && <p className={styles.body}>{message.resolutionNote}</p>}
                {decision?.id === message.id && !message.resolved && (
                  <form
                    className={styles.decision}
                    onSubmit={(event) => {
                      event.preventDefault();
                      change.mutate({ message, action: 'resolve', resolutionNote: decision.note });
                    }}
                  >
                    <label>
                      Decision communicated to the reader
                      <textarea
                        value={decision.note}
                        required
                        maxLength={2000}
                        rows={3}
                        onChange={(event) =>
                          setDecision({ id: message.id, note: event.target.value })
                        }
                      />
                    </label>
                    <div className="cms-row-actions">
                      <Button type="submit" disabled={change.isPending || !decision.note.trim()}>
                        Record decision
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setDecision(null)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
                <div className="cms-row-actions">
                  <Button
                    variant="outline"
                    disabled={change.isPending}
                    onClick={() => {
                      if (!message.resolved && needsDecision)
                        setDecision({ id: message.id, note: '' });
                      else change.mutate({ message, action: 'resolve' });
                    }}
                  >
                    {message.resolved ? 'Reopen' : needsDecision ? 'Close case' : 'Mark resolved'}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={change.isPending}
                    onClick={() => {
                      if (message.preserved) {
                        change.reset();
                        setConfirmation({ message, action: 'preservation' });
                      } else change.mutate({ message, action: 'preservation' });
                    }}
                  >
                    {message.preserved ? 'Release record' : 'Preserve record'}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={
                      change.isPending || message.preserved || (needsDecision && !message.resolved)
                    }
                    onClick={() => {
                      change.reset();
                      setConfirmation({ message, action: 'delete' });
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </details>
          );
        })}
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
        open={Boolean(confirmation)}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmation(null);
            change.reset();
          }
        }}
        title={
          confirmation?.action === 'preservation' ? 'Release this record?' : 'Delete this message?'
        }
        description={
          confirmation?.action === 'preservation'
            ? 'The standard retention policy will apply. An expired record may be removed during the next cleanup.'
            : 'The message will be removed from the reader inbox.'
        }
        confirmLabel={confirmation?.action === 'preservation' ? 'Release record' : 'Delete message'}
        destructive
        onConfirm={() => (confirmation ? change.mutateAsync(confirmation) : undefined)}
      />
    </AdminWorkspace>
  );
}
