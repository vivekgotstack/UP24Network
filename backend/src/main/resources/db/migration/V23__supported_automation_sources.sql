-- These categories remain editorial desks, not pretend external integrations.
DELETE FROM automation_job WHERE job_key IN ('health','books','awards');
