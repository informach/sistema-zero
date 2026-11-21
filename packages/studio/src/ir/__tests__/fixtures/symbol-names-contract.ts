import { type ReadonlyNames, SymbolNames } from '../../symbolNames'

const names: ReadonlyNames<string> = new SymbolNames(['vila', 'floresta'])
names.forEach((value, key, snapshot) => {
  const captured: ReadonlyNames<string> = snapshot
  const found: boolean = captured.has(value) && key === value
  void found
  // @ts-expect-error A captured scope never exposes mutations.
  snapshot.add('changed')
  // @ts-expect-error The callback receives a snapshot, not a full ESNext Set.
  snapshot.union(new Set<string>())
})
