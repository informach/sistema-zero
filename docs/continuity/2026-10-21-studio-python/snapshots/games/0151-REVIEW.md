# Pac-Man1.1 native packet — ready for Root review, no native START

Owner worktree/branch remains Games/feat/studio-python-games-acceptance at 9557e17bcafbe529d0079c8d941485b7f67061c4, clean. Root authorized offline ZIP/packet preparation; execution still needs a fresh absolute UTC window. No browser/Docker/TSC/performance/service/native interpreter was started.

## Actual canonical artifact, already produced — do not recreate

C:/Users/tocha/projects/sistema-zero-python-games/.cache/studio-python-l0/pacman-canonical11-9557-r1

- Actual export UTC2026-10-21 03:46:24.723–03:46:25.500, BunPID24208 closed/exit0/no force. export-process.json and stdout/stderr logs are preserved here.
- 32 files; source.zip449180B SHA8de6df6a881a579a6aed4918318cfb92ff249d99b361f924073cbfc9389f4ce9.
- receipt.json SHA4aff52e28081d67691c5fead0b8da1f59a0a87e83eb5d91a3c78b09a29debc09.
- Main exact9557/portable-audio-1.1.0 SHA3ccbfc081e26b5ac8c3bab5e44dae35841dc0cd54e956af81a3ca5d913edcb76.
- Original19corpus inputs identical between Root/Games; five Python game modules, nine GIF and three WAV, licenses and media bytes preserved. ZIP excludes QA modules. Export warnings=[] and known-release audio package included.
- Exporter/Core/catalog/validator were actual Root65b6960d7277b0efd76230589d12325588803e35 via absolute imports/Core alias realpath, plus only the Games9557 main-source recipe. This is explicit composition of Root original fixture with reviewed Games portable main, not a claim Root had integrated9557. Subsequent Root8b6 metadata does not relabel or invalidate this historical export.
- 32 relevant exporter/corpus/Core/dependency source pins e7deb16fa1604d34012035783a8a407db89a53cc7b548094e4ffd5be8ef9a1f4; producer b4824bfb72aca40f51f71fbed6815e361d51ff7ce3c1adff5480d2eb0fe8b565. Scope is declared relevant files, not an exhaustive transitive graph.
- Distributiona8a6/release0123 verified offline, all distribution file hashes checked. No runtime build, host or closed-host authority used. Historical1.0 preparation/ZIP remain unchanged.

## Exact packet

packet.json SHA f27267e9c69b833980cd250ded3467442a37e52a81b6d1b47bcde11d214941af.

Three cache scripts:

- pacman_native.py SHA3a5c977393bd4f8a48f6ee62fcfcdc6ab588c16095a7adb1ae6ac1e8a134c075.
- pacman_observer.py SHA1908592ec015b6dddc985300daa383bca0ed8f623c1e6bbc67cbe56a8d7fa5bc, byte-identical to tracked observer.
- run_pacman_native.mjs SHA2888d0bfb8e5e642d27569e5bc32fdb51db825faac92e5ea9c65160a16894471.

Runner derives from tracked native runner and reuses the six classic scenario rule assertions from the preserved Root native1.0 harness. Geometry/AI are outside this batch. Its cleanup finally AST is identical to the tracked reviewed runner. No exported source is rewritten; the existing external observer is compiled outside the extracted tree with only its scenario CONFIG selected. Main loop, collisions, rendering, actual timers and playback delegate to the exported game unchanged.

Before each Python spawn the supervisor verifies this explicit packet SHA, permitted scenario/output/path, all3scripts,14environment/7audio pins, actual ZIP/receipt/inventory and frozen9557 recipe/corpus/R8. Fresh output mkdir is exclusive. An exact valid absolute UTC window with at least40seconds remaining is required immediately before the child spawn. Each child has30s additional cooperative QA deadline and40s external cap, limited by the same window. Expired/ambiguous dates refuse before output or Python spawn. No retry; stop first negative and diagnose preserved outputs.

Reused interpreter: C:/Users/tocha/projects/sistema-zero-python-games/.cache/studio-python-l0/games-native-env-r1/Scripts/python.exe, official3.14.2. Native package dependencies miniaudio1.71/cffi2.1.1/pycparser3.11 and7audio files match the new ZIP. Setuptools84.2 is build-only. Installed bytes/environment were rehashed without starting that interpreter; actual backend remains to be observed afresh. No clean-install claim.

## Six serial scenarios, ending fix first

| Order | Scenario | Prospective result |
| --- | --- | --- |
| 1 | victory-near-end | Declared near-final pellet injection; zero collectables/player stop/all7enemies hidden+stop; whole history namedbye3000 scheduled1/fired1/sameclock/elapsed>=3/naturalclose1; no QA close |
| 2 | defeat-near-end | Declared lives1/enemy collision; lives0/reset/player hidden+stop; same strict actual natural ending; no QA close |
| 3 | pellet | Existing isolated pellet placement, +2 and one less pellet, bounded QA close after authored tick3 |
| 4 | power | Existing power placement, +50/one less power/speed+3, actual unchanged3000ms reset by tick250, independent reset_speed callback; bounded QA close |
| 5 | death | Existing collision placement, lives3→2/reset, bounded QA close after tick3 |
| 6 | observe | No state injection; seven enemies and actual authored key bindings after tick250, bounded QA close; no OS keyboard claim |

All require exact5module imports from the owned extraction, real canvas>100items, no callback/backend errors, Map0/Destroy1, audioReleased, ownedTempAbsent, exportTreeUnchanged and clean exit without deadline/signal. The ending history counts only callback=bye AND delay3000; reset_speed may legitimately share3000ms. Native WASAPI output is not acoustic capture, physical keyboard, browser, full game, FPS, Mural or fresh-install acceptance.

## Exact invocation after Root grants a window

Use the actual Root-granted literal UTC deadline for PacmanWindowEnd, never a relative recomputation or an old window. Node24.22 SHAba93f9a70bd86fce3ebbb39ec758501458453467aa92a34a0a3602d1e3fc2b9c. All paths and cases come from the pinned packet. Root may execute fewer than six; no case should start without a full40s remaining.

    $packetDir = 'C:/Users/tocha/projects/sistema-zero-python-games/.cache/studio-python-l0/games-functional-r1/pacman11-native-package-r1'
    $packet = Get-Content -LiteralPath ($packetDir + '/packet.json') -Raw | ConvertFrom-Json
    # $PacmanWindowEnd = '<literal absolute UTC deadline granted by Root>'
    foreach ($case in $packet.scenarios) {
      & $packet.node --max-old-space-size=384 ($packetDir + '/run_pacman_native.mjs') $packet.python $packet.artifact $packet.outputs.$case $case $PacmanWindowEnd 'f27267e9c69b833980cd250ded3467442a37e52a81b6d1b47bcde11d214941af'
      if ($LASTEXITCODE -ne 0) { throw ('STOP first native negative: ' + $case) }
    }

Proposed exclusive window <=240s, target~60s ESTIMATE for six; child budgets are ceilings, not reservations. Check current clock/RAM/pins before admitting each child. No resources reserved while waiting. Root must announce START/END in queue/status and retain exact Node/Python PIDs. The supervisor writes owner.json/stdout.log/stderr.log/supervisor.json and runner result/native.json into new own-cache paths pacman11-native-<case>-r1. Existing outputs refuse overwrite.

Normal cleanup is owned Tk root destroy, miniaudio shutdown, unchanged extracted tree check and removal of the exact owned temporary directory. External child.kill uses the directly owned Python handle only and is always a failed/incomplete result, never graceful evidence. Retain any cleanup errors/temp path for diagnosis; do not stop processes by generic name or delete unrelated temp trees.

## Light verification performed, not native acceptance

32ZIP members/inventory hashes/entry and installed7audio matches passed; Python3.12 stdlib compiled ZIP Python sources without importing them. Node--check supervisor passed. Pure-review.json SHA1613f6ab1772b3470276205caab0608ea30ff67986c7f6a115e24482ceafd3d5: cleanup finally AST unchanged,3valid oracle controls,6invalid histories rejected,3UTC admission refusals created no output/spawned no Python. Both cache preparation negatives are preserved: stale8d0 HEAD refused before export; pure AST selector originally omitted orelse and was corrected without changing any runner/packet/artifact bytes.

Still pending: Root review of this cache runner delta and exact command; new absolute UTC execution authorization; actual native results and Root-owned semantic review. No native1.1 START has occurred. Existing1.0 evidence cannot qualify1.1. Games source/R8/Space1.2 remain frozen; no source commit, integration, push or rebase in this preparation.
