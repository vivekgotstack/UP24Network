'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { AdminWorkspace } from '@/components/newsroom/admin-workspace';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useSession, useNewsroomResource } from '@/lib/session';
import { cms, type Account } from '@/lib/cms';
import { accountBrowsePath, type AccountPage } from '@/lib/newsroom/accounts';
import { defaultWorkflow, type WorkflowPolicy } from '@/lib/newsroom/workflows';
import { sections } from '@/lib/sections';
import { Button } from '@/components/ui/button';
import styles from './team-admin.module.css';

function EmployeeWorkflow({
  account,
  onDirty,
}: {
  account: Account;
  onDirty: (dirty: boolean) => void;
}) {
  const session = useSession();
  const resource = useNewsroomResource<WorkflowPolicy>(
    session.data,
    `admin/accounts/${account.id}/workflow`,
  );
  const [draft, setDraft] = useState<WorkflowPolicy | null>(null),
    [notice, setNotice] = useState('');
  const stored = resource.data ?? { ...defaultWorkflow, accountId: account.id };
  const policy = draft ?? stored;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(stored);
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const saving = useMutation({
    mutationFn: () => cms<WorkflowPolicy>(`admin/accounts/${account.id}/workflow`, 'PUT', policy),
    onSuccess: (saved) => {
      resource.setData(saved);
      setDraft(null);
      setNotice('Workflow saved. These requirements apply to this employee’s next edit.');
    },
  });
  const blocked = resource.isLoading || Boolean(resource.error) || saving.isPending;
  return (
    <section className="admin-card">
      <h2>{account.displayName}</h2>
      <p>
        {account.role.toLowerCase()} · {account.email}
        {account.enabled === false ? ' · Suspended' : ''}
      </p>
      <p>
        Choose which additional checks this employee completes. The administrator reviews every
        publication request and proposed update to a live story.
      </p>
      {resource.error && (
        <p role="alert" className="inline-error">
          {resource.error.message}
        </p>
      )}
      <form
        className="cms-form"
        onSubmit={(event) => {
          event.preventDefault();
          saving.mutate();
        }}
      >
        <fieldset disabled={blocked} className="workflow-flags">
          {(
            [
              ['requireDateline', 'Require a location or dateline'],
              ['requireSources', 'Require private reporting sources'],
              ['requireMedia', 'Require a photograph or video'],
              ['autofill', 'Allow metadata fetching and draft helpers'],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={policy[key]}
                onChange={(event) => {
                  setDraft({ ...policy, [key]: event.target.checked });
                  setNotice('');
                }}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <label>
          Default news section
          <select
            value={policy.defaultCategory}
            disabled={blocked}
            onChange={(event) => setDraft({ ...policy, defaultCategory: event.target.value })}
          >
            {sections.map((section) => (
              <option key={section}>{section}</option>
            ))}
          </select>
        </label>
        <label>
          Default city or dateline
          <input
            value={policy.defaultCity}
            maxLength={100}
            disabled={blocked}
            onChange={(event) => setDraft({ ...policy, defaultCity: event.target.value })}
          />
        </label>
        <div className="cms-row-actions">
          <Button disabled={blocked}>{saving.isPending ? 'Saving…' : 'Save workflow'}</Button>
          {draft && (
            <Button
              type="button"
              variant="outline"
              disabled={saving.isPending}
              onClick={() => {
                setDraft(null);
                setNotice('Changes discarded.');
                saving.reset();
              }}
            >
              Discard changes
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={saving.isPending}
            onClick={() => void resource.refetch()}
          >
            Reload saved settings
          </Button>
        </div>
        {saving.error && (
          <p role="alert" className="inline-error">
            {saving.error.message} Your changes are retained until you save or discard them.
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
      </form>
    </section>
  );
}

export function WorkflowPanel() {
  const session = useSession(),
    router = useRouter();
  const [query, setQuery] = useState(''),
    [search, setSearch] = useState(''),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState('');
  const [dirty, setDirty] = useState(false),
    [pending, setPending] = useState<(() => void) | null>(null);
  const accounts = useNewsroomResource<AccountPage>(
    session.data,
    accountBrowsePath(search, page, 'STAFF'),
    session.data?.role === 'ADMIN',
  );
  const staff = accounts.data?.items ?? [];
  const current = staff.find((account) => account.id === selected) ?? staff[0];
  const currentPage = accounts.data?.page ?? page;
  const move = (action: () => void) => {
    if (dirty) setPending(() => action);
    else action();
  };
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.defaultPrevented
      )
        return;
      const link =
        event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (
        !link ||
        link.target === '_blank' ||
        link.hasAttribute('download') ||
        link.href === window.location.href
      )
        return;
      event.preventDefault();
      const destination = new URL(link.href);
      setPending(
        () => () =>
          destination.origin === window.location.origin
            ? router.push(destination.pathname + destination.search + destination.hash)
            : window.location.assign(destination.href),
      );
    };
    document.addEventListener('click', guard, true);
    return () => document.removeEventListener('click', guard, true);
  }, [dirty, router]);
  return (
    <AdminWorkspace title="Staff workflows" active="workflows">
      <div className="admin-form-grid">
        <section className="admin-card">
          <h2>Employee controls</h2>
          <p>
            Set the reporting requirements for each editor and reporter. Staff submit the finished
            copy and their verification notes to the review queue.
          </p>
          <div className={styles.selector}>
            <form
              className="cms-form"
              onSubmit={(event) => {
                event.preventDefault();
                move(() => {
                  setSearch(query.trim());
                  setPage(1);
                  setSelected('');
                });
              }}
            >
              <label>
                Find an employee
                <input
                  type="search"
                  maxLength={120}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Name or email starts with…"
                />
              </label>
              <Button variant="outline" disabled={accounts.isFetching}>
                Find employees
              </Button>
            </form>
            <div className="cms-form">
              <label>
                Employee
                <select
                  value={current?.id ?? ''}
                  disabled={accounts.isFetching || !staff.length}
                  onChange={(event) => {
                    const id = event.target.value;
                    move(() => setSelected(id));
                  }}
                >
                  {staff.map((account) => (
                    <option value={account.id} key={account.id}>
                      {account.displayName} · {account.role.toLowerCase()}
                      {account.enabled === false ? ' · suspended' : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={styles.pagination}>
              <Button
                variant="outline"
                disabled={currentPage <= 1 || accounts.isFetching}
                onClick={() =>
                  move(() => {
                    setPage(currentPage - 1);
                    setSelected('');
                  })
                }
              >
                Previous
              </Button>
              <span>
                {currentPage} / {accounts.data?.pages ?? 1}
              </span>
              <Button
                variant="outline"
                disabled={currentPage >= (accounts.data?.pages ?? 1) || accounts.isFetching}
                onClick={() =>
                  move(() => {
                    setPage(currentPage + 1);
                    setSelected('');
                  })
                }
              >
                Next
              </Button>
            </div>
          </div>
          {accounts.error && <p role="alert">{accounts.error.message}</p>}
        </section>
        {current ? (
          <EmployeeWorkflow account={current} onDirty={setDirty} key={current.id} />
        ) : (
          <section className="admin-card">
            <h2>{accounts.isLoading ? 'Loading employees…' : 'No matching employees'}</h2>
            <p>Create an Editor or Reporter account from Team & readers, or clear your search.</p>
          </section>
        )}
      </div>
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title="Discard unsaved workflow changes?"
        description="Your changes have not been saved. Stay here to save them, or discard them and continue."
        confirmLabel="Discard and continue"
        destructive
        onConfirm={() => {
          const action = pending;
          setPending(null);
          setDirty(false);
          action?.();
          return true;
        }}
      />
    </AdminWorkspace>
  );
}
