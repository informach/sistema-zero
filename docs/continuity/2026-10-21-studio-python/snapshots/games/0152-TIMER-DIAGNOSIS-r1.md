# Pac-Man1.1 native timer negative — facts, primary sources, causal proposal

Status: investigation only. HOLD native/Chrome/Docker/TSC/performance while Root owns R9. Games9557, R8, packetf272, runner/observer/supervisor, ZIP and both outputs are unchanged. No retry, timer adjustment, tolerance, oracle relaxation or equivalence acceptance was made.

## Actual evidence

Batch ran2026-10-21 03:54:19.978–03:54:27.569Z; stopped on the first negative after two cases. Batch receipt SHAe5e229af61943871852d532d094a8fa462051bff8a9fa926fb8895d9f5aa1df0, at batch-execution-r1/receipt.json. Other four cases never started. Window was explicitly released before its03:56:33 expiry. All four owned PIDs were absent at03:54:46.446Z; both cases Map0/Destroy1/WASAPI/audioReleased/tempAbsent/exportStable, no external/cooperative deadline, signal or force.

| Observation | Victory | Defeat |
| --- | --- | --- |
| Native receipt | 589a3752863d672851816f4a394ca1b751087e1b8b5ac5efe03815d711501f14 | 479502a434ca9a59055aab22d5d54d65e5645537bb0debce3faaf068b40fea97 |
| Outcome | Specific native fixture PASS | NEG: strict elapsed>=3 assertion at runner247 |
| Authored namedbye nominaldelay | 3000ms | 3000ms |
| Whole-history scheduled/fired/natural-close | 1/1/1 | 1/1/1 |
| scheduledClock | 379399.2890753 | 379403.0263203 |
| Fired elapsedSeconds | 3.0105070000281557 | 2.9973143999814056 |
| Fired event clock | 379402.2995872 | 379406.0236368 |
| Natural-close event clock | 379402.2997481 | 379406.0237274 |
| QA close | false | false |
| Final timer totals | 2500ms8 /16ms97 /3000ms1 | 2500ms8 /16ms96 /3000ms1 |

Defeat misses the strict QPC-measured lower bound by2.6856000185944ms. Natural-close logging is also before3s relative to the recorded scheduledClock; measuring that later log instead would not remove the discrepancy. The near-defeat tick1 snapshot shows lives0, playerhidden+stop, score0, all7enemiesstop, no loss of collectables. No authored callback or backend error was reported: the only error is the post-return QA duration assertion. This does not turn the negative into a pass.

## Observer order and local implementation

The unchanged observer records scheduled=time.monotonic(), emits the schedule event, then calls the original Screen.ontimer(callback,delay). Its wrapper records elapsed=time.monotonic()-scheduled immediately before emitting the fired event and invoking the original callback. Logging/registration overhead lies inside the measured interval; this order does not explain a shorter measured interval by starting the clock too late.

The installed official Turtle source at cpython-3.14.2/Lib/turtle.py704–710 delegates positive t unchanged to cv.after(t,fun). Installed tkinter/__init__.py862–888 registers the callback and calls Tcl after with the same ms. No replacement timer or delay shortening appears in the observer. PE metadata read without loading native code identifies both tcl86t.dll and tk86t.dll as8.6.15; their exact pinned file hashes remain in packet.nativeEnvironmentPins. Version metadata is a match to inspect the upstream8.6.15 source, not a binary-reproducible-build attestation.

## Primary-source findings

CPython3.14.2 monotonic delegates on Windows to QueryPerformanceCounter using the nominal performance-counter conversion. This supports the observer's clock basis; it does not attest the runtime clock resolution because get_clock_info was not captured in the failed process. [CPython v3.14.2 pytime.c993–1066](https://github.com/python/cpython/blob/v3.14.2/Python/pytime.c#L993-L1066), [time_monotonic1117–1124](https://github.com/python/cpython/blob/v3.14.2/Modules/timemodule.c#L1117-L1124).

Tcl8.6.15 after schedules an absolute wakeup by taking Tcl_GetTime and adding the requested milliseconds. Dispatch compares current Tcl_GetTime to that wakeup before running the handler. Therefore ordinary Windows notifier millisecond truncation alone is not a sufficient explanation for firing before the Tcl deadline: the final deadline check still uses Tcl time. [after scheduling831–839](https://github.com/tcltk/tcl/blob/core-8-6-15/generic/tclTimer.c#L831-L839), [dispatch536–545](https://github.com/tcltk/tcl/blob/core-8-6-15/generic/tclTimer.c#L536-L545).

Tcl8.6.15 Windows time can interpolate a calibrated system-time clock from QPC using its own estimated curCounterFreq. Calibration samples GetSystemTimeAsFileTime and QPC, adjusts drift, and caps estimated frequency at997/1000..1003/1000 of nominal; fallback uses system time. This is a different time basis from raw nominal-QPC elapsed. It is not just a display rounding issue. [Windows conversion542–592](https://github.com/tcltk/tcl/blob/core-8-6-15/win/tclWinTime.c#L542-L592), [calibration1013–1145](https://github.com/tcltk/tcl/blob/core-8-6-15/win/tclWinTime.c#L1013-L1145). The notifier converts its wait to milliseconds, but this does not bypass the Tcl deadline check. [notifier281–290](https://github.com/tcltk/tcl/blob/core-8-6-15/win/tclWinNotify.c#L281-L290).

## Causal inference, not yet established

Leading hypothesis: Tcl's calibrated/system-time timer clock advanced differently from Python's nominal-QPC interval during this process, so nominal after3000 reached its Tcl deadline in2.9973144s of QPC time. The observed difference is consistent in magnitude with the separate calibration path; it does not prove that path or its calibration value was active in this failed process. No paired Tcl-clock samples were collected, so current data cannot distinguish calibration, a clock adjustment/fallback or an unobserved native timer issue. Do not declare the oracle wrong, the platform conformant or the game faulty solely from this source explanation.

The source-level helper's single scheduling is observed in both cases; the strict elapsed-time criterion failed in defeat and remains failed. Old1.0 passes and victory1.1 do not qualify defeat1.1 or a whole game. Adding milliseconds to3000 or accepting a newly chosen epsilon would hide this unresolved clock question and is not proposed.

## Minimal proposed causal control, not executed or authorized yet

After Root R9 and a separate explicit window, run one isolated official CPython3.14.2/Tk process, hidden root, no game/audio/media/build. Reuse the exact same installation. Collect three serial real3000ms samples: direct Tk after, official Turtle ontimer, and the unchanged observer timer wrapper extracted by AST around the official ontimer. No sleeps, shortened delays, busy loop, timing replacement or product edits.

For each registration/callback collect raw time.monotonic_ns plus Tcl clock microseconds immediately before and after registration, and at callback entry. Keep the registration bracket and read overhead explicit rather than assuming simultaneous clocks. Record runtime get_clock_info, Tcl info patchlevel, Tcl/Tk DLL pins, nominaldelay, callback identity/order/count and cleanup/owned PIDs. Compare Tcl-time and QPC-time differences as intervals bounded by the registration brackets. Do not convert ambiguous brackets or average results into a pass.

Target~12s, cooperative30s/external40s, same absolute-UTC admission/stop-on-error/owned cleanup. If native Tcl-time clearly spans its3000ms deadline while QPC is early in a matching sample, that supports a clock-basis/criterion mismatch. If Tcl time itself is clearly early or only the observer path changes timing, investigate that path before deciding acceptance. If no discrepancy reproduces, the hypothesis remains unproven; preserve the original negative and decide further paired-clock instrumentation with Root. The control does not rerun or qualify any game case. Root reviews the control code and interpretation before a new START.

Pending: Root review of this diagnosis/proposal; no execution authorization assumed. Other four packet cases remain unstarted. No source or oracle change requested until the causal result is available.
