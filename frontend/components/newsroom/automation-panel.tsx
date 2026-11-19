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
  minIntervalMinutes: number;
  maxIntervalMinutes: number;
};

const intervals = [5, 15, 60, 180, 360, 1440, 10080];

function intervalLabel(minutes: number) {
  if (minutes === 10080) return '7 days';
  if (minutes === 1440) return '1 day';
  if (minutes === 60) return '1 hour';
  if (minutes % 60 === 0) return `${minutes / 60} hours`;
  return `${minutes} minutes`;
}

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
            {job.key === 'rashifal' && !job.configured && (
              <div className="cms-muted">
                <p>
                  <a
                    href="https://developers.astrologics.in/auth/sign-up"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Get a free Hindi Rashifal API key
                  </a>{' '}
                  from AstroLogics. Select a live server key starting with <code>al_live_</code>.
                </p>
                <p>
                  Save it locally in <code>backend/.local/providers.properties</code> as{' '}
                  <code>up24.providers.astrologics.api-key</code>, then restart the backend. Enable
                  this job and select Run now to verify the first edition. Keep the key out of chat
                  and frontend settings.
                </p>
              </div>
            )}
            {job.key === 'cricket' && !job.configured && (
              <p className="cms-muted">
                Set <code>SPORTMONKS_CRICKET_API_TOKEN</code> in <code>backend/.env</code>, then
                restart the backend or redeploy. Enable the job and select Run now to fetch scores.
              </p>
            )}
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
                  {[...new Set([...intervals, job.intervalMinutes])]
                    .filter(
                      (interval) =>
                        interval >= job.minIntervalMinutes && interval <= job.maxIntervalMinutes,
                    )
                    .sort((a, b) => a - b)
                    .map((interval) => (
                      <option key={interval} value={interval}>
                        {intervalLabel(interval)}
                      </option>
                    ))}
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
