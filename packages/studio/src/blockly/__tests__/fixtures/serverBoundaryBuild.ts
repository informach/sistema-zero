// Run outside bun:test: its shared resolver cache includes editor module mocks.
const entry = process.argv[2]
if (!entry) throw new Error('Missing server entry')

const result = await Bun.build({
  entrypoints: [entry],
  target: 'bun',
  throw: false,
  plugins: [
    {
      name: 'server-boundary',
      setup(build) {
        build.onResolve({ filter: /^(blockly|react|react-dom|monaco-editor)(\/|$)/ }, (args) => {
          throw new Error(`Browser dependency reached the server catalog: ${args.path}`)
        })
      },
    },
  ],
})
console.log(
  JSON.stringify({
    success: result.success,
    errors: result.logs.filter((log) => log.level === 'error').map((log) => log.message),
  }),
)
process.exitCode = result.success ? 0 : 1
