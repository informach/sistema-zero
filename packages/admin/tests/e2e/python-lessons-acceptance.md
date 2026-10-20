# Python lessons: serial local acceptance

These producers are **implemented but have not qualified the browser flows**. Unit tests exercise guards and failure journals only. They do not approve Admin, recorded lessons, live media, audio or performance.

`python-lesson-fixture.ts` creates only an empty course/module/lesson through the authenticated Admin BFF. Before editing, it checks the fresh course tree against the run's UUID, QA slug/title, empty career slot and exact module/lesson IDs. The Admin browser authors the Studio block, selects the server-discovered Python release, installs Turtle, edits `main.py` by keyboard, executes the real iframe, stops it, publishes and reopens. Enrollment rereads that tree and published lesson, then publishes the course with its current optimistic version before opening a new cohort and seat. It never opens a lobby, starts media or admits a student by SQL.

Use a new output directory for every attempt. Failures retain the created IDs and acknowledged statuses; do not delete a failed fixture to make a receipt green. The historical revoked enrollment `45b69128-70b1-4b56-9b90-4e8cadb499bf` must remain untouched.

Before either browser command, agree a heavy-test window with the coordinator, observe at least 4096 MiB free RAM, and start the owned host/chain/Next using the reviewed Windows operators. Review the **new actual host witness and approval SHA** before the canonical policy bind. Old process approvals do not authorize these runs. Admin and Kids Next run serially on exact parents `http://localhost:43107` and `http://localhost:43108`.

The Admin command accepts a reviewed config file with these fields:

```json
{
  "origin": "http://localhost:43107",
  "providerOrigin": "http://127.0.0.1:<observed-provider-port>",
  "runtime": {
    "profileId": "python-probe",
    "releaseId": "probe-1",
    "manifestSha256": "<reviewed-release-manifest-sha256>"
  },
  "modality": "live",
  "kind": "pro",
  "teacherId": "<actual-admin-account-uuid>",
  "accountId": "<actual-parent-account-uuid>",
  "learnerId": "<actual-ready-profile-uuid>"
}
```

Use `recorded` for a separate recorded course. Use `kind: "classic"` for a separate classic fixture: the Admin enables Blocos/Ponte and Python level3 through the UI, edits the real Ponte source editor, and requires both modes and the level in the published block. `kind` defaults to `pro`; the Kids receipt binds the actual kind rather than guessing it from the source. Each variant creates its own QA course. Set `STUDIO_LESSONS_QA_ADMIN_EMAIL` and `STUDIO_LESSONS_QA_ADMIN_PASSWORD` in process memory, then run from the repository root:

```powershell
bun packages/community-kids/tests/e2e/python-lesson-admin.ts <reviewed-config.json> <new-admin-output-directory>
```

The Admin output is scoped to the selected classic/Pro authoring/publication/reopen, rehearsal execution/resume and before-call Turtle execution. Rehearsal edits a local copy, executes and stops it, resumes through the real UI, and requires the server draft and revision to stay unchanged. It does not claim assessment evaluation or recorded-student execution. It retains no login payload, cookies, bearer credentials or trace containing authentication requests. Successful live output includes a new enrollment. Stop Admin by its captured owned state **before** starting Kids.

Set `STUDIO_LESSONS_QA_PARENT_EMAIL`, `STUDIO_LESSONS_QA_PARENT_PASSWORD` and `STUDIO_LESSONS_QA_LEARNER_ID` only in process memory:

```powershell
bun packages/community-kids/tests/e2e/python-lesson-kids.ts <passed-admin-output-directory>/receipt.json <new-kids-output-directory>
```

Kids requires the preceding successful Admin receipt and exact observed provider. It verifies canonical Python v3 Pro save/reopen, actual Turtle pixels and `input()` marker, a stale-revision refusal bound to the current document session, then a real second-tab takeover that withdraws the original iframe. Its source, snapshots and authority receipt remain isolated from historical JS proofs.

The current implementation labels dragging/editing blocks, rehearsal assessment evaluation, recorded-student execution, revocation/expiry/cross-user negatives, audio and SFU/TURN/recording as pending. Both classic/Ponte and Pro scripts still require real browser execution. Add remaining scenarios against fresh fixtures; do not infer their result from this gate. No product Core/Runtime bytes are changed by these acceptance scripts. Draft revisions use UUIDs; published lesson revisions use the canonical SHA-256 content hash.

Lightweight checks, without services:

```powershell
bun test packages/admin/tests/python-lesson-fixture.test.ts
bunx biome check packages/admin/tests/e2e/python-lesson-fixture.ts packages/admin/tests/python-lesson-fixture.test.ts packages/community-kids/tests/e2e/python-lesson-admin.ts packages/community-kids/tests/e2e/python-lesson-kids.ts
```

Full TypeScript checks and browser execution require the coordinated resource window. A Bun bundle checks syntax and imports only; it is not typechecking or browser evidence.

Both browser CLIs detach response listeners, close the context and browser, then drain pending response bodies. A separate 30-second cleanup terminal timer is armed before the scenario timer is cleared and remains active through receipt I/O. On expiry it retains any primary error, writes a failed receipt synchronously, marks resource cleanup unconfirmed and exits 1. The external owned-process controller must retain its independent deadline and reconcile browser descendants even after a terminal exit; a terminal receipt is not proof that resources were released. Inert child-process controls exercise body interruption, close rejection, listener rejection and never-ending close/body promises without launching a browser or sending HTTP:

```powershell
bun test packages/admin/tests/python-lesson-cleanup.test.ts
```
