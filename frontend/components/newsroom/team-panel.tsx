'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useNewsroomResource } from '@/lib/session';
import {
  accountAdministration,
  accountBrowsePath,
  type AccountPage,
  type AccountScope,
} from '@/lib/newsroom/accounts';
import type { Account, Role } from '@/lib/cms';
import styles from './team-admin.module.css';

const roles: Role[] = ['EDITOR', 'REPORTER', 'SUBSCRIBER'];
const permissions = [
  ['Administrator', 'Owner only. Controls content, employees, sources and site settings.'],
  ['Editor', 'Works across the desk and submits new stories and updates for approval.'],
  ['Reporter', 'Creates drafts and requests publication or updates for their own stories.'],
  ['Subscriber', 'Reader account with no newsroom access.'],
];

function AccountRow({
  account,
  currentUser,
  busy,
  onRole,
  onChanged,
}: {
  account: Account;
  currentUser: Account;
  busy: boolean;
  onRole: (account: Account, role: Role) => Promise<unknown>;
  onChanged: () => Promise<unknown>;
}) {
  const client = useQueryClient();
  const [editing, setEditing] = useState(false),
    [name, setName] = useState(account.displayName),
    [enabled, setEnabled] = useState(account.enabled !== false);
  const [version, setVersion] = useState(account.version ?? 0),
    [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState<'revoke' | 'delete' | null>(null);
  const protectedAccount = account.id === currentUser.id || account.role === 'ADMIN';
  const active = account.enabled !== false;
  const blocked = busy || pending;
  async function run(action: () => Promise<unknown>, success: string) {
    setPending(true);
    setError('');
    setNotice('');
    try {
      await action();
      await onChanged();
      if (account.id === currentUser.id)
        await client.invalidateQueries({ queryKey: ['identity', 'session'] });
      setNotice(success);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The account could not be updated.');
      return false;
    } finally {
      setPending(false);
    }
  }
  const resetEditor = () => {
    setName(account.displayName);
    setEnabled(active);
    setVersion(account.version ?? 0);
    setError('');
  };
  return (
    <article className={styles.accountCard}>
      <div className="account-avatar" aria-hidden="true">
        {account.displayName.slice(0, 1).toUpperCase()}
      </div>
      <div className={styles.details}>
        <strong>
          {account.displayName}
          {account.id === currentUser.id && ' · You'}
        </strong>
        <p>{account.email}</p>
        <span className={styles.status}>
          {active ? 'Active' : 'Suspended'} · {account.role.toLowerCase()}
        </span>
      </div>
      <div className={styles.actions}>
        <label className={styles.role}>
          Role
          <select
            aria-label={`Role for ${account.displayName}`}
            value={account.role}
            disabled={blocked || protectedAccount}
            onChange={(event) =>
              void run(
                () => onRole(account, event.target.value as Role),
                'Role updated. Existing logins have ended.',
              )
            }
          >
            {account.role === 'ADMIN' && <option value="ADMIN">ADMIN</option>}
            {roles.map((role) => (
              <option key={role}>{role}</option>
            ))}
          </select>
        </label>
        <Button
          variant="outline"
          disabled={blocked}
          onClick={() => {
            resetEditor();
            setEditing((value) => !value);
          }}
        >
          Edit account
        </Button>
        <Button
          variant="outline"
          disabled={blocked || account.id === currentUser.id}
          onClick={() => setConfirmation('revoke')}
        >
          End logins
        </Button>
        <Button
          variant="destructive"
          disabled={blocked || active || protectedAccount}
          onClick={() => setConfirmation('delete')}
        >
          Delete account
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={blocked}
          onClick={() => {
            if (!editing) resetEditor();
            setEditing((value) => !value);
          }}
        >
          Edit account
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={blocked || account.id === currentUser.id}
          onClick={() => setConfirmation('revoke')}
        >
          End all logins
        </Button>
        {!protectedAccount && (
          <Button
            size="sm"
            variant="destructive"
            disabled={blocked || active}
            onClick={() => setConfirmation('delete')}
          >
            Delete account
          </Button>
        )}
      </div>
      {editing && (
        <form
          className={`cms-form ${styles.profile}`}
          onSubmit={async (event) => {
            event.preventDefault();
            if (
              await run(
                () => accountAdministration.profile(account, name, enabled, version),
                'Account saved.',
              )
            )
              setEditing(false);
          }}
        >
          <label>
            Display name
            <input
              value={name}
              maxLength={100}
              required
              disabled={blocked}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={enabled}
              disabled={blocked || protectedAccount}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            Account active
          </label>
          <p className="field-help">
            Suspending an account ends its current logins and prevents further sign-in. The
            administrator account stays active.
          </p>
          <div className="cms-row-actions">
            <Button disabled={blocked}>{pending ? 'Saving…' : 'Save account'}</Button>
            <Button
              type="button"
              variant="outline"
              disabled={blocked}
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={blocked}
              onClick={async () => {
                await onChanged();
                setEditing(false);
                setError('');
                setNotice('Account reloaded. Open Edit account to continue.');
              }}
            >
              Reload account
            </Button>
          </div>
        </form>
      )}
      {(error || notice) && (
        <p
          className={`${styles.feedback} ${error ? 'inline-error' : ''}`}
          role={error ? 'alert' : 'status'}
        >
          {error || notice}
        </p>
      )}
      <ConfirmDialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
        title={
          confirmation === 'delete'
            ? 'Permanently delete this suspended account?'
            : 'End this account’s logins?'
        }
        description={
          confirmation === 'delete'
            ? 'The account and its login credentials will be removed. Article bylines and reporting history remain.'
            : 'Every existing login for this account will stop working. The person can sign in again if the account is active.'
        }
        confirmLabel={confirmation === 'delete' ? 'Delete account' : 'End all logins'}
        destructive
        onConfirm={() =>
          run(
            () =>
              confirmation === 'delete'
                ? accountAdministration.remove(account)
                : accountAdministration.revoke(account),
            confirmation === 'delete' ? 'Account deleted.' : 'Existing logins have ended.',
          )
        }
      />
    </article>
  );
}

export function TeamPanel({
  currentUser,
  busy,
  onCreate,
  onRole,
}: {
  accounts: Account[];
  currentUser: Account;
  busy: boolean;
  onCreate: (account: Record<string, FormDataEntryValue>) => Promise<boolean>;
  onRole: (account: Account, role: Role) => Promise<unknown>;
}) {
  const client = useQueryClient(),
    formRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState(''),
    [search, setSearch] = useState(''),
    [scope, setScope] = useState<AccountScope>('ALL'),
    [page, setPage] = useState(1),
    [error, setError] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);
  const result = useNewsroomResource<AccountPage>(
    currentUser,
    accountBrowsePath(search, page, scope),
  );
  const refresh = useCallback(
    () =>
      client.invalidateQueries({
        predicate: (entry) =>
          entry.queryKey[0] === 'newsroom' &&
          entry.queryKey[1] === currentUser.id &&
          typeof entry.queryKey[2] === 'string' &&
          entry.queryKey[2].startsWith('admin/accounts'),
      }),
    [client, currentUser.id],
  );
  const visible = result.data?.items ?? [];
  const currentPage = result.data?.page ?? page;
  return (
    <>
      <div className="cms-section-heading">
        <div>
          <p className="eyebrow">ACCESS & PERMISSIONS</p>
          <h2>Team and readers</h2>
        </div>
        <span className="result-count">{result.data?.total ?? 0} accounts</span>
      </div>
      <div className="cms-editor-grid team-layout">
        <section className="cms-card">
          <h3>Create an account</h3>
          <form
            className="cms-form"
            ref={formRef}
            onSubmit={async (event) => {
              event.preventDefault();
              setError('');
              const form = event.currentTarget,
                data = new FormData(form);
              if (new TextEncoder().encode(String(data.get('password'))).length > 72) {
                setError('Use a password of at most 72 UTF-8 bytes.');
                return;
              }
              try {
                if (await onCreate(Object.fromEntries(data))) {
                  form.reset();
                  await refresh();
                }
              } catch (reason) {
                setError(
                  reason instanceof Error ? reason.message : 'The account could not be created.',
                );
              }
            }}
          >
            <label>
              Name
              <input
                name="displayName"
                autoComplete="off"
                required
                maxLength={100}
                disabled={busy}
              />
            </label>
            <label>
              Email
              <input
                name="email"
                type="email"
                autoComplete="off"
                required
                maxLength={254}
                disabled={busy}
              />
            </label>
            <label>
              Initial password
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={64}
                disabled={busy}
              />
            </label>
            <div className={styles.passwordTools}>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  const input = formRef.current?.elements.namedItem('password');
                  if (!(input instanceof HTMLInputElement)) return;
                  const random = crypto.getRandomValues(new Uint8Array(18));
                  input.value = btoa(String.fromCharCode(...random))
                    .replaceAll('+', '-')
                    .replaceAll('/', '_');
                }}
              >
                Generate password
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={async () => {
                  const input = formRef.current?.elements.namedItem('password');
                  if (!(input instanceof HTMLInputElement) || !input.value) return;
                  try {
                    await navigator.clipboard.writeText(input.value);
                    setError('');
                  } catch {
                    setError(
                      'The password could not be copied. Enter an initial password manually.',
                    );
                  }
                }}
              >
                Copy initial password
              </Button>
            </div>
            <p className="field-help">
              Copy the initial password before creating the account. It cannot be read back
              afterward.
            </p>
            <label>
              Account type
              <select name="role" defaultValue="REPORTER" disabled={busy}>
                {roles.map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
            </label>
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
            <Button disabled={busy} type="submit">
              Create account
            </Button>
          </form>
          <dl className="role-guide">
            {permissions.map(([role, detail]) => (
              <div key={role}>
                <dt>{role}</dt>
                <dd>{detail}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section>
          <div className={styles.filters}>
            <label>
              Find an account
              <input
                type="search"
                value={query}
                maxLength={120}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name or email starts with…"
              />
            </label>
            <label>
              Account type
              <select
                value={scope}
                onChange={(event) => {
                  setScope(event.target.value as AccountScope);
                  setPage(1);
                }}
              >
                <option value="ALL">All accounts</option>
                <option value="STAFF">Editorial staff</option>
                <option value="ADMIN">Administrator</option>
                <option value="EDITOR">Editors</option>
                <option value="REPORTER">Reporters</option>
                <option value="SUBSCRIBER">Subscribers</option>
              </select>
            </label>
          </div>
          {result.error && (
            <p className="inline-error" role="alert">
              {result.error.message}
            </p>
          )}
          {result.isLoading && <p role="status">Loading accounts…</p>}
          {visible.map((account) => (
            <AccountRow
              key={account.id}
              account={account}
              currentUser={currentUser}
              busy={busy}
              onRole={onRole}
              onChanged={refresh}
            />
          ))}
          {!result.isLoading && !visible.length && (
            <p className="muted-note">No matching accounts.</p>
          )}
          <div className={styles.pagination}>
            <Button
              variant="outline"
              disabled={currentPage <= 1 || result.isFetching}
              onClick={() => setPage(currentPage - 1)}
            >
              Previous
            </Button>
            <span>
              Page {currentPage} of {result.data?.pages ?? 1}
            </span>
            <Button
              variant="outline"
              disabled={currentPage >= (result.data?.pages ?? 1) || result.isFetching}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
          <p className="field-help">
            Search uses indexed name and email prefixes. Suspend an account before deleting it; role
            and access changes end existing logins.
          </p>
        </section>
      </div>
    </>
  );
}
