# Studio test global descriptor leaks into subsequent storage tests

Status: resolved
Severity: high (CI blocker)

Remote CI `39164324612`, job `117784046723`, fails while collecting `gameStorage.test.ts`: assigning `indexedDB` throws because preceding Python storage tests leave an own, read-only property whose value is undefined. The consumer is valid and stays unchanged.

The three temporary IndexedDB setups in `pythonProjectCreation.test.ts` and `pythonProjectStore.test.ts` saved only the old value. When the property was initially absent, `defineProperty` created it with `writable: false`; restoring undefined did not restore absence.

Fix: capture the complete own descriptor before installing the factory, explicitly make the temporary property writable, then restore that descriptor or delete the property if initially absent. No production change, timeout increase, assertion removal or test skip.

Causal evidence: local preload starts with the property absent and verifies the descriptor after every original test. Before the fix: 13 failures. After the fix: 13 passes, zero failures, 130 assertions. Logs: `studio-indexeddb-descriptor-{red,green}-1.log` in the local qualification cache.

Another session independently published the same descriptor restoration in `f664cfa5184e5a4d633edb9292d9f1b09b8115be`. Adopted that version instead of publishing a duplicate. Its temporary property need not be writable: the tested operations read `indexedDB.open` and do not reassign the global. Fresh proof on the exact remote files passes 13/130 (`studio-indexeddb-descriptor-remote-green-1.log`). Independent review agrees; full Studio verification is running separately.

Fresh full Studio suite: 9253 passed, four existing browser-availability skips, zero failures, 138550 assertions/687 files/266.66 s. The four omitted scenarios then passed explicitly on native Chrome with `SZ_CHECK_CHROMIUM` configured: 4/0/21 assertions/17.93 s. Logs `parallel-c-studio-full-1.log` and `parallel-c-studio-native-check-1.log`. No skip was added or counted as a pass; the original GameStorage consumer remains untouched. Biome checked all five affected runtime/probe/test files cleanly. Language-service dependency introduced by the same remote commit installed frozen and passed all three official typecheck configurations with actual `@types/node` 24.19.0.
