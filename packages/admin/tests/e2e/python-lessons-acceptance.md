# Python lessons: serial local acceptance

These producers are **implemented but have not qualified the browser flows**. Unit tests exercise guards and failure journals only. They do not approve Admin, recorded lessons, live media, audio or performance.

`python-lesson-fixture.ts` creates only an empty course/module/lesson through the authenticated Admin BFF. Before editing, it checks the fresh course tree against the run's UUID, QA slug/title, empty career slot and exact module/lesson IDs. The Admin browser authors the Studio block, selects the server-discovered Python release, installs Turtle, edits `main.py` by keyboard, executes the real iframe, stops it, publishes and reopens. Enrollment rereads that tree and published lesson, then publishes the course with its current optimistic version before opening a new cohort and seat. It never opens a lobby, starts media or admits a student by SQL.

Use a new output directory for every attempt. Failures retain the created IDs and acknowledged statuses; do not delete a failed fixture to make a receipt green. The historical revoked enrollment `45b69128-70b1-4b56-9b90-4e8cadb499bf` must remain untouched.

Before either browser command, agree a heavy-test window and review the per-stage incremental budget with the coordinator. The QA budget is not a product RAM requirement. Start the owned host/chain/Next using the reviewed Windows operators. Review the **new actual host witness and approval SHA** before the canonical policy bind. Old process approvals do not authorize these runs. Admin and Kids Next run serially on exact parents `http://localhost:43107` and `http://localhost:43108`, with one Chrome and one Next audience at a time. The reviewed Next prefix fixes heap1536; no automatic heap increase/retry on OOM.

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
pwsh -NoProfile -NonInteractive -File <reviewed-own-windows-directory>/python-lesson-browser-owned.ps1 -Action Run -Role adminBrowser -ExpectedPlanSha256 <bound-plan-sha> -ExpectedEnvSha256 <admin-browser-env-sha> -InputFile <reviewed-config.json> -ExpectedInputSha256 <config-sha> -NextStateFile <owned-admin-next-state.json> -ExpectedNextStateSha256 <state-sha> -StartCutoff <granted-UTC-cutoff> -WindowEnd <granted-UTC-end>
```

The Admin output is scoped to the selected classic/Pro authoring/publication/reopen, rehearsal execution/resume and before-call Turtle execution. Rehearsal edits a local copy, executes and stops it, resumes through the real UI, and requires the server draft and revision to stay unchanged. It does not claim assessment evaluation or recorded-student execution. It retains no login payload, cookies, bearer credentials or trace containing authentication requests. Successful live output includes a new enrollment. Stop Admin by its captured owned state **before** starting Kids.

Set `STUDIO_LESSONS_QA_PARENT_EMAIL`, `STUDIO_LESSONS_QA_PARENT_PASSWORD` and `STUDIO_LESSONS_QA_LEARNER_ID` only in process memory:

```powershell
pwsh -NoProfile -NonInteractive -File <reviewed-own-windows-directory>/python-lesson-browser-owned.ps1 -Action Run -Role kidsBrowser -ExpectedPlanSha256 <bound-plan-sha> -ExpectedEnvSha256 <kids-browser-env-sha> -InputFile <passed-admin-receipt.json> -ExpectedInputSha256 <receipt-sha> -NextStateFile <owned-kids-next-state.json> -ExpectedNextStateSha256 <state-sha> -StartCutoff <granted-UTC-cutoff> -WindowEnd <granted-UTC-end>
```

Kids requires the preceding successful Admin receipt and exact observed provider. It verifies canonical Python v3 Pro save/reopen, actual Turtle pixels and `input()` marker, a stale-revision refusal bound to the current document session, then a real second-tab takeover that withdraws the original iframe. Its source, snapshots and authority receipt remain isolated from historical JS proofs.

The current implementation labels dragging/editing blocks, rehearsal assessment evaluation, recorded-student execution, revocation/expiry/cross-user negatives, audio and SFU/TURN/recording as pending. Both classic/Ponte and Pro scripts still require real browser execution. Add remaining scenarios against fresh fixtures; do not infer their result from this gate. No product Core/Runtime bytes are changed by these acceptance scripts. Draft revisions use UUIDs; published lesson revisions use the canonical SHA-256 content hash.

Lightweight checks, without services:

```powershell
bun test packages/admin/tests/python-lesson-fixture.test.ts
bun test packages/admin/tests/python-lesson-admission.test.ts
bunx biome check packages/admin/tests/e2e/python-lesson-fixture.ts packages/admin/tests/python-lesson-fixture.test.ts packages/community-kids/tests/e2e/python-lesson-admission.ts packages/admin/tests/python-lesson-admission.test.ts packages/community-kids/tests/e2e/python-lesson-admin.ts packages/community-kids/tests/e2e/python-lesson-kids.ts
```

Full TypeScript checks and browser execution require the coordinated resource window. A Bun bundle checks syntax and imports only; it is not typechecking or browser evidence.

Both browser CLIs detach response listeners, close the context and browser, then drain pending response bodies. A separate 30-second cleanup terminal timer is armed before the scenario timer is cleared and remains active through receipt I/O. On expiry it retains any primary error, writes a failed receipt synchronously, marks resource cleanup unconfirmed and exits 1. The external owned-process controller must retain its independent deadline and reconcile browser descendants even after a terminal exit; a terminal receipt is not proof that resources were released. Inert child-process controls exercise body interruption, close rejection, listener rejection and never-ending close/body promises without launching a browser or sending HTTP:

```powershell
bun test packages/admin/tests/python-lesson-cleanup.test.ts
```

The external browser operator reuses the witnessed Windows claim protocol. Its adapter calls only the closed Admin/Kids export after the durable claim, forwards the audience's credential keys in memory, and holds the runner alive for a completion acknowledgement. The supervisor discovers descendants while the root is alive, persists PID/creation/executable/CLI-hash witnesses, samples tree memory and reconciles all known identities. A root-owned Windows console host remains in final reconciliation but is allowed to exit with its root after acknowledgement. Early root exit, nonzero scenario/process exit, deadline, forced fallback or residual descendants are NEG. A hard deadline can terminate only captured identities that still match; forced cleanup never qualifies a gate. No credentials are stored in job/environment/receipt files.

Every validated descendant retains its own `Process`/`SafeHandle`. Creation is checked against that object (CIM's microsecond precision on initial capture, exact object ticks afterward), and fallback calls `Kill()` only on the retained object; no numeric-PID stop or relookup occurs in that path. Handles are released in `finally`. Completion is published through a new temporary file followed by rename. Completion parsing, CIM or state-write failure enters a NEG catch that attempts durable state/fallback persistence and cleanup only of objects already retained, without assuming discovery was complete. If both persistence paths fail, stderr remains explicitly NEG. The old851/r3 receipts and source identity remain preserved; this follow-up does not rebind/reseal those artifacts.

Browser admission is a SHA-bound observation generated by that operator from the actual owned Next tree. It expires after 10 seconds and binds audience, Next root witness and reviewed plan. Fixed approved envelopes are Next2048, retained-base growth256, host reserve512, browser1024 Admin/1536 Kids (MiB). Required free RAM is rounded up to256MiB from browser + max(0,2048-current Next tree working set) +256+512. With Next1536 this is Admin2304/Kids2816MiB. A Next already above2048, stale/altered/foreign admission or insufficient memory is refused before `chromium.launch`; the CLI saves the observation/decision in its receipt. These envelopes are estimates to verify, not measured browser performance. There is no generic4096MiB fallback.

An explicit QA-only compact alternative uses admission **version2** and
`memoryProfileId: lessons-desktop-compact-r2` in a newly reviewed bound Windows plan.
Version1/default remains unchanged. Compact fixes Next heap768/tree1024,
browser+runner1024 for either audience (including both Kids takeover tabs),
retained-base growth128 and host reserve512MiB, rounding128. Admit the whole2688MiB
composition before Next; before Chrome require
`ceil128(1024 + max(0,1024-observedNextWS) +128+512)`. These are prospective bounds,
not a claim that the complete flow fits. No automatic heap increase or retry is allowed.

The fresh cache Next controller must import `python-lesson-memory-watch.ps1` alongside
the ownership/browser watcher helpers. Before launch call
`Assert-LessonCompactNextAdmission`; use the exact heap768 prefix. After the durable
Next claim, keep that same controller alive with
`Watch-LessonCompactNextWarmup $state $StateFile $baseRoots $WindowEnd`, where
`$baseRoots = Get-LessonCompactBaseRoots $plan.memoryRetainedBaseStates` comes from
Root-reviewed SHA-pinned live host/chain state files. Do not start a second monitor
process or reuse an old bind/approval. The browser launcher requires a fresh≤2s
warmup observation, validates actual Next heap/witness and leaves its scenario
unclaimed until its supervisor samples memory and atomically transfers monitoring.
The handoff lock ensures a warmup refusal cannot publish the scenario claim concurrently.

Compact samples owned Next/base/browser trees and free RAM at nominal500ms intervals
(plus query cost). Unknown observations or an exceeded budget produce NEG and request
normal browser shutdown; only after captured browser identities exit does it request
normal Next shutdown. No force/kill fallback is authorized for this profile; residuals
stay NEG for explicit reconciliation. Existing version1 supervision stays unchanged.
This is sampled monitoring, **not a kernel memory cap**: V8 heap is not total Next RSS,
Chrome1024 with two tabs is unqualified, and an OOM or sudden memory jump can occur
between samples. The same full acceptance scenarios and ownership/cleanup checks apply.

Lightweight checks (no browser/services): admission unit tests above and
`pwsh -NoProfile -File packages/admin/tests/e2e/python-lesson-memory-control.ps1`.

The direct internal CLI shape now requires `<input.json> <new-output-dir> <fresh-admission.json> <admission-sha256>`. Use the external operator for acceptance, which provides those arguments and owns the deadline/tree. Its Windows controls run only inert Bun parent/child processes, never Playwright/Chrome/HTTP:

The browser operator requires PowerShell 7.5 or newer, matching its `ConvertFrom-Json -DateKind String` parsing contract.

```powershell
pwsh -NoProfile -NonInteractive -File packages/admin/tests/e2e/python-lesson-supervisor-control.ps1 -Mode complete
pwsh -NoProfile -NonInteractive -File packages/admin/tests/e2e/python-lesson-supervisor-control.ps1 -Mode abrupt
pwsh -NoProfile -NonInteractive -File packages/admin/tests/e2e/python-lesson-supervisor-control.ps1 -Mode deadline
pwsh -NoProfile -NonInteractive -File packages/admin/tests/e2e/python-lesson-retained-handle-control.ps1
pwsh -NoProfile -NonInteractive -File packages/admin/tests/e2e/python-lesson-supervisor-control.ps1 -Mode completion-malformed
pwsh -NoProfile -NonInteractive -File packages/admin/tests/e2e/python-lesson-supervisor-control.ps1 -Mode monitor-save-failure
pwsh -NoProfile -NonInteractive -File packages/admin/tests/e2e/python-lesson-supervisor-control.ps1 -Mode monitor-cim-failure
pwsh -NoProfile -NonInteractive -File packages/admin/tests/e2e/python-lesson-supervisor-control.ps1 -Mode witness-query-failure
pwsh -NoProfile -NonInteractive -File packages/admin/tests/e2e/python-lesson-supervisor-control.ps1 -Mode monitor-parent-witness-missing
pwsh -NoProfile -NonInteractive -File packages/admin/tests/e2e/python-lesson-supervisor-control.ps1 -Mode completion-ack-slow
pwsh -NoProfile -NonInteractive -File packages/admin/tests/e2e/python-lesson-supervisor-control.ps1 -Mode retained-observation-failure -ObservationFault Refresh
pwsh -NoProfile -NonInteractive -File packages/admin/tests/e2e/python-lesson-supervisor-control.ps1 -Mode retained-observation-failure -ObservationFault HasExited
pwsh -NoProfile -NonInteractive -File packages/admin/tests/e2e/python-lesson-supervisor-control.ps1 -Mode retained-observation-failure -ObservationFault StartTime
```

The completion acknowledgement also uses temporary-file publication followed by rename. The slow-ack control pauses after writing its first byte; the adapter must see only the complete final JSON and exit successfully. This prevents a successful scenario from becoming a spurious NEG during the external cleanup handshake.

CIM query errors are terminating; only a successful query without a matching process returns a null witness. Discovery also refuses a missing or changed parent witness while that parent's retained kernel object remains alive. Both failures persist an incomplete-ownership NEG and reconcile only retained handles. The CIM control injects a nonterminating error at the actual `Get-CimInstance` command, rather than throwing from the witness function; a separate control checks genuine PID absence and another checks a missing witness with a live retained parent.

Retained process observations distinguish `alive`, proven `exited` and `unknown`. Observation errors, invalid handles or identity mismatches never count as an exit. Unknown observations prevent completion acknowledgement and produce NEG with incomplete ownership and unconfirmed cleanup; they are included in `unconfirmedProcessIds` during reconciliation. Stop still requires a fresh valid observation of the same retained object. The observation controls return scenario completion with an unreferenced live inert child, inject failures at each Process observation, and require no ACK or kill of that unknown object. A separate actual handle owned by the benign control reconciles its own child afterward, without qualifying monitor cleanup.

The additional explicit admission v3 profile `lessons-desktop-shared-r1` shares2048MiB between Next and browser, retaining browser cap1024, heap768, base growth128, OS reserve512, rounding128 and whole admission2688. Browser admission is ceil128(max(0,2048-NextWS)+128+512), with no second browser allocation. Runtime checks the actual sum; warmup uses browser0. v1/v2 keep their original interpretation. New cache Next warmup must pass the plan profile as its fifth argument and enable this profile explicitly. Old R7 NEG receipts remain NEG; replay under v3 is policy evidence, not retroactive cleanup or UI qualification. No ACK drain, deadline or force changes.

# Diagnóstico de exceções do monitor

Uma exceção do supervisor mantém NEG e incerteza de ownership. Antes de qualquer
cleanup, o ErrorRecord original fornece somente o nome de um dos três helpers
permitidos, a linha inteira positiva e um código de throw conhecido. Origem fora
da lista recebe `unknown`, linha `0` e código `unknown`. Mensagem, stack, texto da
invocação e caminhos completos não entram no recibo. Falhas secundárias do cleanup
continuam separadas. Isso não muda ACK, prazos, orçamento ou autoridade de stop,
nem identifica retroativamente a causa dos recibos R7/R8 anteriores.

Na descoberta de descendants, uma linha CIM incompleta só pode ser ignorada se
PID, nascimento e ParentId correspondem a um witness conhecido, os metadados
ainda disponíveis não o contradizem, e o registro retido tem o mesmo PID e
createdTicks (precisão CIM) com observação real `exited`. Se esse pai parcial tem
qualquer filho no mesmo snapshot, permanece NEG, pois ignorar o pai também
ocultaria esses filhos; não se infere ownership pela relação após seu encerramento.
Sem essa prova, inclusive
para processos novos, vivos ou desconhecidos, permanece NEG. O conversor geral
continua estrito. O diagnóstico acrescenta somente fase `parent`/`child`, PID
inteiro, identidade conhecida e indicadores de campos ausentes; outros dados da
exceção não são persistidos. Sem novas consultas, retry, ACK ou autoridade de stop.
Isso corrige o caso demonstrável de processo conhecido encerrado; não atribui
retroativamente esse caso à linha incompleta observada no R9.
