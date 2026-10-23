# Space Arena Q08 — ready for review, no native execution yet

Owner thread: 01a15a4f-d555-7c81-80a2-a0fe887e9bbf. Worktree
`C:/Users/tocha/projects/sistema-zero-python-games`, branch
`feat/studio-python-games-acceptance`. No product/Core/Runtime/recipe changes.

Only source/read-only preparation performed. Real game/Tk/audio execution is
pending a NEW explicit future absolute UTC grant. No resource held. Coordinator
queue refused the last delivery with limit 100/code -32600; this packet and
`.cache/parallel-session-status.md` are the shared fallback. Do not clear queue.

## Evidence and immutable inputs

`pins.json` records full six-source hashes, CPython 3.14.2 interpreter and venv
config, canonical receipt/ZIP, all 42 ZIP files, seven installed audio files,
three exact runtime dependencies, full build declaration and real WAV header.
Read-only preflight passed at 18:56:38.551 UTC, with no Turtle/audio imports.
Build-only setuptools is declared 84.2.0, not installed in the runtime venv;
initial preflight's erroneous installed-build-tool check is preserved in
`preflight-negative-r1.json`. No dependencies were changed.

Interpreter:
`C:/Users/tocha/projects/sistema-zero-python-games/.cache/studio-python-l0/games-native-env-r1/Scripts/python.exe`
SHA e725f520cfbb2e4844fe0a9fc8949236f20b0d67e470d1232618b99504a0691a.

Artifact (read only):
`C:/Users/tocha/projects/sistema-zero-python/.cache/studio-python-l0/space-arena-canonical-r2`.
Receipt df6d6812ac511686e5dd32187b900cc68c9b565d5d49498e5d3265e9b137fcc0;
ZIP 55a893f0a982d37f2ca87b5af6f0f7614d93516722d3f9c880f3409d253609df;
portable main 9db951e68bd4ce10f3739368d806d2a8a15db3535d9d543f21ddd5f2bd2f38a5.
Original bgm WAV lasts 122.251958333 s; replay timer remains 120 s.

## Budget and ordered admission

1. Q08-pause: request <=60s total, cooperative 30s/child 40s.
2. Stop and inspect any negative before repetition or next case.
3. Q08-bgm: request ANOTHER <=180s total, target130s, cooperative150s/child160s.
   Do not silently extend a short grant to run this case. It observes actual
   authored replay/overlap; it is not a performance gate.

No browser/Docker/build/fullTSC/performance/new frameworks. Before each child:
read actual UTC, ensure full child budget still fits its explicitly granted
window, rehash all source/interpreter/config/artifact pins, and confirm output
does not exist. Native child independently verifies inventory/audio/runtime
dependencies before importing Turtle. Write START at TOP status and queue if
available (queue is currently blocked). Never interpret elapsed time as approval.

Commands, from the owner worktree, only after explicit grant; replace
`PRAZO_UTC_CONCEDIDO` with actual future ISO UTC Z timestamp:

```powershell
node experiments/studio-python-runtime/qualification/run_space_arena_native.mjs `
  .cache/studio-python-l0/games-native-env-r1/Scripts/python.exe `
  C:/Users/tocha/projects/sistema-zero-python/.cache/studio-python-l0/space-arena-canonical-r2 `
  .cache/studio-python-l0/games-functional-r1/space-native-Q08-pause-r1 Q08-pause PRAZO_UTC_CONCEDIDO
```

Then only with its separate qualifying grant:

```powershell
node experiments/studio-python-runtime/qualification/run_space_arena_native.mjs `
  .cache/studio-python-l0/games-native-env-r1/Scripts/python.exe `
  C:/Users/tocha/projects/sistema-zero-python/.cache/studio-python-l0/space-arena-canonical-r2 `
  .cache/studio-python-l0/games-functional-r1/space-native-Q08-bgm-r1 Q08-bgm PRAZO_UTC_CONCEDIDO
```

Inspect supervisor/native/logs immediately: exit0, no callback/errors or external
deadline/signal, frozen state/methods during pause, resumed real method calls,
all pools, pen.clear, Map0/Destroy1, WASAPI, released audio, temp absent, tree
unchanged. Long case additionally requires two real BGM plays >=120s apart,
different handles and activeVoices2..16. Preserve first negative exactly. Verify
only the exact owned PID absent, then write END at TOP status plus queue if
available, with timestamps/receipts and total elapsed. Never stop another stack.

Claims remain limited to QA invocation of original bindings and native methods;
no physical input, acoustic/browser/final-runtime/full-game acceptance.

Fresh light verification: Python8/8, Node10/10 combined process tests,
Biome2 files unchanged, node syntax and diff checks passed. No Q08 game executed.
