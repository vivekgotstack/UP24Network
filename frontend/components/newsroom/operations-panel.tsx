'use client';

import { AdminWorkspace } from '@/components/newsroom/admin-workspace';
import { Button } from '@/components/ui/button';
import { useNewsroomResource, useSession } from '@/lib/session';
import styles from './operations-panel.module.css';

type JobState = 'PENDING' | 'DISPATCHED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
type JobStatus = { transport: string; counts: Partial<Record<JobState, number>> };
type ServiceConfiguration = { id: string; name: string; configured: boolean; required: boolean; detail: string };
const states: { key: JobState; label: string; detail: string }[] = [
  { key: 'PENDING', label: 'Waiting', detail: 'Saved and waiting for dispatch or retry.' },
  {
    key: 'DISPATCHED',
    label: 'Dispatched',
    detail: 'Handed to the configured transport; awaiting execution.',
  },
  { key: 'RUNNING', label: 'Processing', detail: 'Claimed by a worker with a renewable lease.' },
  {
    key: 'SUCCEEDED',
    label: 'Completed',
    detail: 'Finished successfully; protected payload removed.',
  },
  {
    key: 'FAILED',
    label: 'Needs attention',
    detail: 'Expired, permanently rejected or retry allowance exhausted.',
  },
];

export function OperationsPanel() {
  const session = useSession();
  const result = useNewsroomResource<JobStatus>(
    session.data,
    'admin/operations/jobs',
    session.data?.role === 'ADMIN' && session.data.newsroomAccess,
    { refetchInterval: 15000 },
  );
  const services = useNewsroomResource<ServiceConfiguration[]>(session.data, 'admin/operations/services', session.data?.role === 'ADMIN' && session.data.newsroomAccess);
  return (
    <AdminWorkspace title="Operations" active="operations">
      <section className={`admin-card ${styles.panel}`} aria-labelledby="services-heading">
        <div><p className="eyebrow">SERVICE CONFIGURATION</p><h2 id="services-heading">Connections and credentials</h2></div>
        <p>Configuration values stay in the server environment. These indicators show presence of settings; they do not claim a live provider check.</p>
        {services.error && <p className="inline-error" role="alert">{services.error.message}</p>}
        <dl className={styles.stats}>{services.data?.map((service) => <div key={service.id}>
          <dt>{service.name}</dt><dd>{service.configured ? 'Configured' : service.required ? 'Setup required' : 'Optional'}</dd><p>{service.detail}</p>
        </div>)}</dl>
      </section>
      <section className={`admin-card ${styles.panel}`} aria-labelledby="operations-heading">
        <div className={styles.heading}>
          <div>
            <p className="eyebrow">BACKGROUND DELIVERY</p>
            <h2 id="operations-heading">Mail and media jobs</h2>
          </div>
          <Button
            variant="outline"
            disabled={result.isFetching}
            onClick={() => void result.refetch()}
          >
            {result.isFetching ? 'Updating…' : 'Refresh status'}
          </Button>
        </div>
        <p>
          Monitor the persisted work queue without exposing recipients, sign-in codes, credentials
          or uploaded source content.
        </p>
        {result.isLoading && <p role="status">Loading background-job status…</p>}
        {result.error && (
          <p className="inline-error" role="alert">
            {result.error.message}
          </p>
        )}
        {result.data && (
          <>
            <p className={styles.transport}>
              Configured transport:{' '}
              <strong>
                {result.data.transport === 'rabbitmq'
                  ? 'RabbitMQ'
                  : result.data.transport === 'local'
                    ? 'Local worker'
                    : result.data.transport}
              </strong>
            </p>
            <dl className={styles.stats}>
              {states.map((state) => (
                <div key={state.key}>
                  <dt>{state.label}</dt>
                  <dd>{(result.data?.counts[state.key] ?? 0).toLocaleString('en-IN')}</dd>
                  <p>{state.detail}</p>
                </div>
              ))}
            </dl>
            <div className={styles.notes}>
              <h3>Delivery and recovery</h3>
              <p>
                Transient failures retry with a delay. Expired sign-in codes are discarded;
                completed jobs retain status metadata without their sensitive payload. A worker
                restart releases stalled work after its lease expires.
              </p>
              <p>
                These counts describe application job records. They do not certify broker
                availability or a recipient’s inbox delivery. A completed email job means the
                configured email service accepted the request.
              </p>
            </div>
          </>
        )}
      </section>
    </AdminWorkspace>
  );
}
