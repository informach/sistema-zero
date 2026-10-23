# Native paired-clock instrumentation v2 — original oracle unchanged

Prepared only, no native START. Root's clarified instruction is instrumentation first: reproduce/diagnose the SAME defeat scenario and canonical ZIP while keeping the original QPC elapsed>=3 assertion. A Tcl-domain oracle is a separate proposal and is not activated.

Parent packet f27267e9c69b833980cd250ded3467442a37e52a81b6d1b47bcde11d214941af, original runner3a5c977… and original defeat NEG4795 remain immutable. New packet099f802cad4783cd422182710820730025fef6feda79e1e8824e4e20bdf0c241 uses one allowed output/case only: defeat-near-end -> C:/Users/tocha/projects/sistema-zero-python-games/.cache/studio-python-l0/pacman11-native-defeat-paired-r1. Same actual canonical32-file ZIP8de6/receipt4aff/main3ccb and source9557/R8. Never overwrite/reclassify the original output.

Only runner delta: two additive instrumentation blocks. First records runtime Tcl/Tk patchlevel and QPC clock info. Second attaches nativeClockPair={qpcBeforeNs,tclMicroseconds,qpcAfterNs} to the already-parsed existing timer-scheduled/timer-fired events in ObservedOutput.write. No extra emit, timer/callback wrapper, platform replacement or observer source change. Original observer1908592e… and supervisor2888d0bf… are byte-identical. Removing the two additive blocks restores the entire original runner source exactly, including cleanup, cooperative30s and every original assertion.

The literal original assert fired[0]['value']['elapsedSeconds']>=3 is STILL ACTIVE. The new runner can remain negative on that assertion; that is useful diagnostic data and must not trigger an automatic retry or criterion change. No proposed Tcl helper is imported by the runner.

## Measurement anchors and limits

The snapshots occur at the existing stdout event interception, after the original observer computed/emitted its event and the runner forwarded stdout, before returning to that emit. Scheduled capture therefore precedes the observer's unchanged delegation to the real timer; fired capture follows its original elapsedSeconds computation and precedes invoking the original bye. Raw observer event.clock, scheduledClock and elapsedSeconds remain unchanged.

Each Tcl sample is bracketed by QPC reads. Given scheduled snapshot S and fired snapshot F, compare Tcl F.tclMicroseconds-S.tclMicroseconds with QPC elapsed interval [F.qpcBeforeNs-S.qpcAfterNs, F.qpcAfterNs-S.qpcBeforeNs]. Preserve raw acquisition timestamps and compare their QPC times to original event.clock to expose logging/parse/acquisition latency. Different epochs must never be subtracted.

These are matching OBSERVER EVENT anchors, not exact C-level timer-registration brackets. Output backpressure/parse time occurs before acquisition and may affect correspondence with the original observer's elapsedSeconds. The added readings do not reveal the old process's clocks. Do not claim an exact native-registration deadline or causal equivalence if latency/brackets leave it ambiguous. The new evidence can show the mismatch again, fail unchanged, or fail to reproduce; none rewrites the old negative.

Primary foundation: Tcl8.6.15 clock microseconds goes through TclpGetMicroseconds; it and Tcl_GetTime use the same NativeGetMicroseconds/time-hook basis. [clock command](https://github.com/tcltk/tcl/blob/core-8-6-15/generic/tclClock.c#L1788-L1800), [Windows basis](https://github.com/tcltk/tcl/blob/core-8-6-15/win/tclWinTime.c#L317-L373). Tcl after uses Tcl_GetTime deadlines. [timer](https://github.com/tcltk/tcl/blob/core-8-6-15/generic/tclTimer.c#L831-L839). These source facts alone do not establish the cause of the prior failed process.

## Separate prospective oracle, NOT ACTIVE

tcl_oracle_proposal.py and proposal-pure-review.json are an isolated pure proposal. They require exactly one namedbye3000 scheduled/fired with matching scheduledClock, Tcl event interval>=3000000us, QPC diagnostic finite/nonnegative and ordered acquisition brackets. reset_speed3000 is independent. No epsilon is proposed. Pure controls exercise a valid event-domain mismatch, reset_speed independence, early Tcl NEG, duplicates, mismatch, nonfinite/negative QPC and reversed brackets.

This proposal checks the declared observer-event interval in the Tcl domain, not a directly measured C registration point. Root must separately review both that contract and real paired evidence before any possible activation. Until then the native runner continues the unchanged original QPC criterion. Source files for the game and observer are untouched.

## Future invocation, still needs Root review and explicit new UTC window

    $dir = 'C:/Users/tocha/projects/sistema-zero-python-games/.cache/studio-python-l0/games-functional-r1/pacman11-native-paired-r1'
    $packet = Get-Content -LiteralPath ($dir + '/packet.json') -Raw | ConvertFrom-Json
    # $PacmanWindowEnd = '<literal Root-granted absolute UTC>'
    & $packet.node --max-old-space-size=384 ($dir + '/run_pacman_native.mjs') $packet.python $packet.artifact $packet.outputs.'defeat-near-end' 'defeat-near-end' $PacmanWindowEnd '099f802cad4783cd422182710820730025fef6feda79e1e8824e4e20bdf0c241'

Target~5s estimate, proposed90s window, unchanged30s cooperative/40s external cap and>=40s remaining before spawn. Fresh packet/hash/script14environment/7audio/artifact/frozen-source checks and exclusive output creation remain active. One case only, stop negative/no retry. Exact owned Node/Python IDs; hidden real Tk Map0/Destroy1, audio shutdown/temp absence/export unchanged checked by original cleanup. Signal/forced termination is failure. Original1.0/1.1 receipts and the stand-alone causal probe remain separate. No Start while Root R10 owns resources, no browser/Docker/TSC/performance/source/provider/staging/push/rebase.
