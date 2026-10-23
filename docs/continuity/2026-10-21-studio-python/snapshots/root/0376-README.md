# Staging Python audio pilot: canonical offline candidate

Prepared with the existing `PythonPromotionInputSchema` and `runPythonPromotionCommand(['prepare', ...])` production path. Bun 1.3.11 ran with `--no-env-file --smol` and returned0 in under one second. No builder, Python execution, SDK, approval manifest, HMAC, Worker bundle, upload or activation was performed.

Canonical **plan identity**: `1bd48fb4b8dca1f50da4dd2090f548bbb838f13adbcdbfc0c1d6ddad02aab180`.

Files:

- `input.json`: raw file SHA `29df5865fa15ad801c559fdf0dc15054ee5028c82aa3487f9d06398d6bfe18ff`.
- `canonical-plan.json`: raw file SHA `0b15194d63ae166e3d37bf8d9ee3eedbdf641964171c820e3c5fd5db22e3c4a0`. This differs from the canonical plan identity because the latter hashes the defined plan body excluding its own identity.
- Candidate release: `python-browser / 2026-10-20-audio-1`, manifest SHA `7026b09b04a1222cfbc594d5ab3ec9de8649eece71c613c823a2c33d8c43ce5f`.
- Exact capabilities, in input order: `edit`, `export-source`, `execute`, `python-repl`. No publish/assist/pause capability was added. This is an unactivated pilot candidate, not qualification of every future Python feature.
- Exact built distribution: `a8a6c625e8c35552c66265f03a7de1bcda96f44306306206d2ac5f88366b6b4a`, 41 files / 22407495 artifact bytes. The canonical factory checked every size/SHA and gzip representation. The additional before/after audit checked the same 41 files plus distribution manifest; all remain byte-identical.

## Proven baseline and preservation

Root's read-only Worker receipt selected the active, bracket-stable version `82d58cc2-cfb0-4a71-b6aa-195fe589b863` and configuration `40ce822aab07184da90bec7a0902296d4889c011740063be6c859bc5b60c57b2`. Its complete configuration is the non-null Worker baseline. Recomputed canonical SHA matches the active R2 pointer. The old `python-browser / 2026-10-19-1` deployment, its39 files, status and full release/distribution metadata are deep-equal in the candidate. Its three parent origins and order are unchanged; candidate configuration has two deployments. The current runtime origin is retained.

The exact named Members policy and hosts variables were proved absent in root's separate staging read. Only that absent Members policy becomes `members:null`. Hosts become `[]`, matching `packages/members/src/composition-root.ts:264`'s absent-variable default; this does not replace an existing hosts object. The existing Worker configuration is never replaced by null. The existing Worker preview origin, not a fabricated null app value, supplies `baseline.previewOrigin`.

One Railway5.62.1 service-wide read per app was captured privately in RAM. Only three named public fields were projected, with strict HTTPS origin/URL validation. Admin, Community and Kids all contain the exact existing runtime origin in their frame list; Community/Kids runtime URLs also match. Admin's runtime URL and all three preview variables are nominally absent. No secret name/value or raw service response is persisted. App frame lists are unchanged by the candidate because the required runtime origin is already present.

Read receipts live in sibling `python-operational-staging-feasibility-r1/`:

- Admin `railway-admin-public-baseline-r1.json`: `b4720a9816c16433cf5fd0efd341754028a283404b7d84235434e1f19f232402`.
- Community `railway-community-public-baseline-r1.json`: `871fbb13db88a09d9ff67ec0d9e07196c91a4aeb2d1d49c5e0e171aa0375d1ef`.
- Kids `railway-community-kids-public-baseline-r1.json`: `197c17f9541d759b52ed7393185f05d2d1120dc82b1703b5c794ef0375c5b9ad`.

`receipt.json` pins all five public baseline receipts, the source/schema inputs, 42 artifact records, canonical outputs and provenance. These observations are point-in-time evidence, not a CAS reservation; any future mutation must refresh the exact current baseline and refuse drift before signing/apply.

## Qualification boundaries

SDK883 receipt is pinned, with exit0/cleanup confirmed and the same a8a6 distribution. The SDK fixture release has its own QA identity and is not promoted or relabeled as this permanent release. Local operational memory R6 remains NEG: sampled envelope89053171 bytes, gap maximum1014.501045 ms, no local128MiB qualification. Its pinned receipts are evidence, not an operational approval. Profile883 is the general validation/image profile; it is not a new Python distribution.

The candidate JSON contains future `active` statuses as produced by the canonical preparation algorithm. **No active pointer, Members/app variable, provider object or reader was changed.** This candidate does not claim deployed authentication, real hosted128MiB feasibility, full runtime acceptance or full app rollout. No time-bound authorization/HMAC was generated. Root review and later exact freshness/approval/native-hosted checks remain separate.
