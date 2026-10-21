# Exact cache sampler reference — outside tracked Games batch

Read-only file inspected:
C:/Users/tocha/projects/sistema-zero-python/.cache/studio-python-l0/games-pacman-endings-r1/sampler.ps1

SHA256 dbb006f0c8e1a8317b57da15fbbdf6877a3c36cb6d4569282aab13770a3b5b63.

Lines13–20 define Snapshot. Line15 queries CIM ProcessId,ParentProcessId,CreationDate,WorkingSetSize,Name. Line16 guards row creation with:

    if ($null -ne $_.CreationDate) {

Only line17 emits the row; line18 closes that condition. There is no alternate output or partial-row record. A raw CIM result whose CreationDate is null therefore disappears before the consumer sees it.

Line64 assigns $rows=Snapshot. Line85 computes uncertain only from that already-filtered $rows array. A dropped row cannot enter uncertain even if it would otherwise belong to a known root/descendant. This is the concrete static omission referred to in coordination.

Scope/limits: this is a preserved historical browser CACHE operator, not a tracked source in the20commits/36paths review and not the native Pac-Man runner. No actual dropped-owned-row occurrence, resource leak or false PASS in the old receipts is established by this static observation. It is not asserted as the cause of Root R10's separate incomplete-exe/CLI negative. No sampler, source, receipt or pipeline was changed/copied here. Root requested a single reviewed Windows Job ownership base; Games waits for that base instead of cloning or silently patching this old sampler.
