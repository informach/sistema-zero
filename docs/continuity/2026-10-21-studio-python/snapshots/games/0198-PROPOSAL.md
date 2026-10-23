# Next smallest native gap: Space Arena1.2 Q08-pause

Preparation only. No native execution or resource reservation. Games source remains9557e17bcafbe529d0079c8d941485b7f67061c4, no own native/host/browser process active. Root cache is read-only; no oracle, game, Core/Runtime fingerprint, export, provider or staging mutation.

## Why this case is new and needed

S08 requires pause, visibility, state transitions and serviced timers. Space1.2 Q02–Q07 already passed in official native Turtle/Tk, but those six cases remain in playing state and do not execute a real paused timer interval. The earlier standalone1.1 pause-reference control isolates an old loop body; the later1.2 browser input pause proof is browser-only. Neither is the full exported1.2 native pause/resume observation proposed here.

Q08-pause was already authored and reviewed in the existing qualification module, documented as unexecuted. This packet only makes its missing module available beside the existing1.2 runner. It does not repeat the six green native rule fixtures or Pac-Man's six native scenarios and does not introduce a framework.

One full real exported game process: invoke the registered authored s callback; observe an initial original playing frame/pools; invoke p and c; wait for the unchanged QA1200ms timer and authored FPS1000ms timer while paused. Positions/velocities/health/fuel/camera/particles and original Sprite/Enemy/Missile/Camera/render method counters must stay frozen. FPS may reset game.frame; that reset is explicitly not mistaken for simulation. Invoke C and P; require original sprite/enemy/render methods to resume, canonical pools unchanged, a real pen.clear and unique bounded completion.

This is callback invocation through actual authored bindings, not physical keyboard/focus or a full played game. It covers a native S08 causal slice and pool-preservation witnesses. It does not close allS08 orS01–S10, BGM120s replay, Stop/restart browser lifecycle, raster completeness, Pro/Mural, performance/endurance or installation on a new machine.

## Immutable inputs and exact reuse

Packet SHA b6f60e6551dca748be2ee2cac3d3e09c3a5ad07592d8b429071c2c6164df9ac8.

Artifact C:/Users/tocha/projects/sistema-zero-python-games/.cache/studio-python-l0/space-arena-canonical12-face-r1,42files; source.zip SHA14b95ac84cf7eefc9ff3bdcd6abc6c743c230dd52c0632eaf2c1a0659608a6c1; receipt9acc5ea7b0d1d4fc4f9239299df2062f39281a894d39a45dc8ba3238efa3d419; entryd9934ba00b889e0f714aa6e117b62b123f2303476c2543b57d2486457da264f3/version1.2. No ZIP/export recreation.

Four local files, all byte-identical to existing source/pins:

- space_arena_native.py e6cefcb36ad08d6c2130c2a4c2eb3e9b05aec76d2f6837c21e02e88f803d83c1 — already used in six native1.2 cases, already contains Q08 branch and timer-boundary completion.
- space_arena_observer.py 7e5cf907ac894acb35a0b7fa044a8a53664efb2beb858ac4c69e1212cd3d890a.
- run_space_arena_native.mjs cae7c8fd4c4db8f0622b4116b82c466e162170d5680eaeca428d04d3b25754e7 — existing UTC/admission/budget/Q08/post-cleanup assertions unchanged.
- space_arena_q08.py 8eb1871295d8496330ac23ad37d478af3ce2af6715a2347549f5ae136e3d8c12 — existing unexecuted Q08 observer. No source/fixture edits.

The new packet file records14existing native environment and7installed audio file hashes, plus actual ZIP/receipt/inventory and Node24.22. All were rehashed offline; Python3.12 AST parsing and Node--check were source-only. Native CPython3.14.2/Tk/audio was not imported or started during preparation. The -I loader registers the base observer in sys.modules before the Q08 import, so no checkout import-path workaround is needed.

## Budget, owned processes and prospective command

One serial case only, target~18s ESTIMATE based on previously observed~15–16s authored splash plus1200ms pause and real resumed frame. Existing cooperative30s/external40s are unchanged. Propose exclusive window<=60s, within Root's four-minute maximum; do not reserve it while waiting. Require a literal fresh UTC grant with the full40s remaining immediately before spawn. If no full budget fits, refuse before native Start. No retry; first negative stops and preserves outputs for diagnosis.

Resources: one small Node supervisor plus one official isolated CPython3.14.2 process, real withdrawn Tk and installed WASAPI backend/threads, original pools/media. No other stacks or external audio subprocesses. Node uses384MiB heap ceiling; that is not a measured whole-process RSS cap. No new RAM/performance approval is claimed. Root should recheck available RAM and pins before admission; historical native admission used1536MiB free minimum, subject to Root's current shared-machine budget.

Fresh output must be C:/Users/tocha/projects/sistema-zero-python-games/.cache/studio-python-l0/space12-native-q08-pause-r1. Current output is absent. Before any authorized invocation, perform read-only pin checks (do not start the child in preparation):

    $dir = 'C:/Users/tocha/projects/sistema-zero-python-games/.cache/studio-python-l0/games-functional-r1/space12-native-q08-pause-package-r1'
    $packetPath = $dir + '/packet.json'
    if ((Get-FileHash -LiteralPath $packetPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne 'b6f60e6551dca748be2ee2cac3d3e09c3a5ad07592d8b429071c2c6164df9ac8') { throw 'Packet changed' }
    $packet = Get-Content -LiteralPath $packetPath -Raw | ConvertFrom-Json
    foreach ($file in @($packet.files) + @($packet.artifactPins) + @($packet.nativeEnvironmentPins) + @($packet.installedAudioMatches)) {
      if ((Get-FileHash -LiteralPath $file.path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $file.sha256) { throw ('Changed input: ' + $file.path) }
    }
    if ((Get-FileHash -LiteralPath $packet.node -Algorithm SHA256).Hash.ToLowerInvariant() -ne $packet.nodeSha256) { throw 'Node changed' }
    if (Test-Path -LiteralPath $packet.output) { throw 'Fresh output required' }
    # $NativeWindowEnd = '<Root-granted absolute UTC deadline>'
    & $packet.node --max-old-space-size=384 ($dir + '/run_space_arena_native.mjs') $packet.python $packet.artifact $packet.output 'Q08-pause' $NativeWindowEnd

For actual execution the owner should launch that exact Node argv through an owned Start-Process handle and save NodePID/start identity before waiting; save PythonPID from owner.json, child exit/closure and immediate absence checks. This avoids the disclosed missing-NodePID weakness in the earlier paired Pac-Man diagnostic without changing this supervisor. Logs/owner/result/native.json/supervisor.json remain exclusive and immutable.

## Normal cleanup and limits

Existing FunctionalComplete is caught only at the exact authored1.2 timer callback boundary after requested/unique completion; it calls real screen.bye. Original finally restores callbacks/timer/update/observer/audio hooks, shuts down the installed audio backend, verifies exported tree unchanged and removes the exact owned temp. Require Map0/Destroy1, audioReleased, ownedTempAbsent, exportTreeUnchanged, errors[], exit0, no deadline/signal and owned PIDs absent. Any externally killed process is NEG, never graceful completion. Stop only retained owned Node/Python handles; no process-name/tree-global cleanup or unrelated temp deletion.

The existing pause-proof elapsed>=1.2 oracle is unchanged. The unresolved native Tcl/QPC discrepancy seen in a different Pac-Man ending is a known measurement risk; if this strict predicate fails, preserve the negative and diagnose, never invent a tolerance or change1200ms. No oracle change or diagnostic repetition is preauthorized.

Q08-bgm remains a separate later case: real authored120000ms replay, existing150s cooperative/160s external, prospective180s window. It is not part of this proposed invocation and would need its own explicit review/grant/output. Browser/Mural/performance remain HOLD. Next action is Root review and a new absolute UTC authorization, not an automatic Start.
