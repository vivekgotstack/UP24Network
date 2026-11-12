import { Button } from '@/components/ui/button';

export type AutomationJob = {
  key: string;
  name: string;
  enabled: boolean;
  intervalMinutes: number;
  lastRunAt: string | null;
  nextRunAt: string;
  lastResult: string;
  running: boolean;
  configured: boolean;
  configurationDetail: string;
  failureCount: number;
};

function time(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
      }).format(new Date(value))
    : 'Not run yet';
}

type Props = {
  jobs: AutomationJob[];
  busy: boolean;
  onSettings: (job: AutomationJob, enabled: boolean, interval: number) => Promise<void>;
  onRun: (job: AutomationJob) => Promise<void>;
};

export function AutomationPanel({ jobs, busy, onSettings, onRun }: Props) {
  return (
    <>
      <h2>Automation controls</h2>
      <p className="cms-muted">
        YouTube updates come from the official channel. Daily sections use approved API adapters.
        Provider keys stay on the server. Disabling Rashifal also hides its public section; saved
        editions are retained.
      </p>
      <div className="cms-job-list">
        {jobs.map((job) => (
          <article key={job.key}>
            <div className="cms-job-heading">
              <h3>{job.name}</h3>
              <label className="cms-switch">
                <span>{job.enabled ? 'Enabled' : 'Disabled'}</span>
                <input
                  type="checkbox"
                  role="switch"
                  aria-label={`Enable ${job.name}`}
                  checked={job.enabled}
                  disabled={busy || (!job.configured && !job.enabled)}
                  onChange={(event) =>
                    void onSettings(job, event.target.checked, job.intervalMinutes)
                  }
                />
              </label>
            </div>
            <p className="cms-muted">{job.configurationDetail}</p>
            <p role="status">{job.lastResult}</p>
            <div className="cms-job-meta">
              <span>Last run: {time(job.lastRunAt)}</span>
              <span>
                Next run: {job.enabled && job.configured ? time(job.nextRunAt) : 'Paused'}
              </span>
              {job.failureCount > 0 && <span>Consecutive failures: {job.failureCount}</span>}
            </div>
            <div className="cms-row-actions">
              <label>
                Run every{' '}
                <select
                  aria-label={`Interval for ${job.name}`}
                  value={job.intervalMinutes}
                  disabled={busy || !job.configured}
                  onChange={(event) =>
                    void onSettings(job, job.enabled, Number(event.target.value))
                  }
                >
                  <option value={5}>5 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={60}>Hour</option>
                  <option value={360}>6 hours</option>
                  <option value={1440}>Day</option>
                  <option value={10080}>Week</option>
                </select>
              </label>
              <Button
                variant="outline"
                disabled={busy || job.running || !job.configured}
                onClick={() => void onRun(job)}
              >
                {job.running ? 'Running…' : 'Run now'}
              </Button>
            </div>
            {job.key === 'rashifal' && (
              <p className="cms-muted">
                Daily means 00:05 IST. Rechecking the same day uses the saved edition without
                another provider call.
              </p>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
