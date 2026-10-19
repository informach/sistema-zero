# Free runtime browser probe lacks the now-required audience

Status: resolved
Severity: medium (qualification blocker)

After remote audience authorization changes, the local browser qualification server fails before the first performance test with `Probe free options unavailable`. Its `FreeStudioAccessService` actor lacks `audience`; the real service correctly rejects an unknown audience.

Fix the local fixture to use a typed `FreeStudioActor` with `audience: 'kids'`. Keep production authorization intact. A successful server startup alone will not establish runtime or performance approval; rerun the affected native flows and evaluate the recorded measurements against the unchanged thresholds.

Initial failed attempt is preserved in `parallel-renderer-live-f1-1.log`. The next run uses unique timestamped logs and result directories so failures are not overwritten.

Native follow-up `parallel-c-public-export-1`: all six free-project cases passed across Classic/Pro and Chrome/Edge, including actual creation, extension installation, execution, revocation preserving source and recovery from transient discovery failure. All ten public-player cases also passed. Four independent web-export failures have a separate static-server metadata cause (issue 005); they do not justify changing authorization. Performance acceptance remains open in issues 003/004.
