'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Account, Role } from '@/lib/cms';

const roles: Role[] = ['EDITOR', 'REPORTER', 'SUBSCRIBER'];
const permissions = [
  ['Administrator', 'Owner only. Manages the team, automation and every publication.'],
  ['Editor', 'Create, edit and publish reports.'],
  ['Reporter', 'Create and edit their own drafts.'],
  ['Subscriber', 'Reader account with no newsroom access.'],
];
export function TeamPanel({
  accounts,
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
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const visible = accounts.filter((a) =>
    `${a.displayName} ${a.email} ${a.role}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="cms-section-heading">
        <div>
          <p className="eyebrow">ACCESS & PERMISSIONS</p>
          <h2>Team and readers</h2>
        </div>
        <span className="result-count">{accounts.length} accounts</span>
      </div>
      <div className="cms-editor-grid team-layout">
        <section className="cms-card">
          <h3>Create an account</h3>
          <form
            className="cms-form"
            onSubmit={async (event) => {
              event.preventDefault();
              setError('');
              const form = event.currentTarget;
              const data = new FormData(form);
              if (new TextEncoder().encode(String(data.get('password'))).length > 72) {
                setError('Use a password of at most 72 UTF-8 bytes.');
                return;
              }
              if (await onCreate(Object.fromEntries(data))) form.reset();
            }}
          >
            <label>
              Name
              <input name="displayName" autoComplete="off" required maxLength={100} />
            </label>
            <label>
              Email
              <input name="email" type="email" autoComplete="off" required maxLength={254} />
            </label>
            <label>
              Initial password
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={72}
              />
            </label>
            <label>
              Account type
              <select name="role" defaultValue="REPORTER">
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
          <label className="team-search">
            <span>Find an account</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, email or role"
            />
          </label>
          <div className="cms-account-list">
            {visible.map((account) => (
              <article key={account.id}>
                <div className="account-avatar" aria-hidden="true">
                  {account.displayName.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <strong>
                    {account.displayName}
                    {account.id === currentUser.id && <small> You</small>}
                  </strong>
                  <span>{account.email}</span>
                </div>
                <label>
                  <span className="sr-only">Role for {account.displayName}</span>
                  <select
                    value={account.role}
                    disabled={busy || account.id === currentUser.id}
                    onChange={(event) => void onRole(account, event.target.value as Role)}
                  >
                    {account.role === 'ADMIN' && <option value="ADMIN">ADMIN</option>}
                    {roles.map((role) => (
                      <option key={role}>{role}</option>
                    ))}
                  </select>
                </label>
              </article>
            ))}
          </div>
          {!visible.length && <p className="muted-note">No matching accounts.</p>}
          <p className="field-help">
            Your own role cannot be changed here. Changes apply to existing sessions immediately.
          </p>
        </section>
      </div>
    </>
  );
}
