---
provider: manual
pr:
round: 6
created_at: 2026-10-18T20:40:00Z
---

## Summary

- Total: 1
- Resolved: 1
- Unresolved: 0

CI reproduced a test-isolation defect missed by the Windows discovery order. A controlled import order reproduces the same four failures locally. Isolate the producer, preserve every original scenario and verify the complete Admin suite before closing.

Resolved by adopting the independently published remote isolation2a5485c78 after causal reproduction and exact-source preservation checks; fresh controlled-order proof passed on that wrapper. CI/deploy remain separately monitored.
