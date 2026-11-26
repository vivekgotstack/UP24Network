UPDATE automation_job
SET enabled = FALSE, name = 'YouTube auto-import'
WHERE job_key = 'youtube';
