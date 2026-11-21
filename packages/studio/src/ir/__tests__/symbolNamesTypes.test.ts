import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

// Members imports the same source with ESNext; Studio itself uses ES2022.
for (const lib of ['lib.es2022.d.ts', 'lib.esnext.d.ts']) {
  test(`lexical snapshots keep their own readonly callback contract with ${lib}`, () => {
    const program = ts.createProgram({
      rootNames: [fileURLToPath(new URL('./fixtures/symbol-names-contract.ts', import.meta.url))],
      options: {
        target: ts.ScriptTarget.ES2022,
        lib: [lib],
        types: [],
        strict: true,
        skipLibCheck: true,
        noEmit: true,
      },
    })
    const errors = ts
      .getPreEmitDiagnostics(program)
      .filter((d) => d.category === ts.DiagnosticCategory.Error)
    expect(errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))).toEqual([])
  })
}
