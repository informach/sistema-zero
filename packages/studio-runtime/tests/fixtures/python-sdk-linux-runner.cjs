const { spawn } = require('node:child_process')

async function command(executable, args, cwd) {
  const child = spawn(executable, args, { cwd, stdio: 'inherit', env: process.env })
  const terminate = () => child.kill('SIGTERM')
  process.once('SIGTERM', terminate)
  try {
    const code = await new Promise((resolve, reject) => {
      child.once('error', reject)
      child.once('exit', (code) => resolve(code ?? 1))
    })
    if (code !== 0) throw new Error(`Linux proof command failed (${code}): ${executable}`)
  } finally {
    process.removeListener('SIGTERM', terminate)
  }
}

async function main() {
  // This dedicated tool container never receives learner code for native execution.
  // SDK + critical leaf versions match the monorepo; generated npm lock is preserved as evidence.
  await command('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], '/proof')
  await command(
    'node',
    [
      '/proof/packages/studio-runtime/tests/fixtures/python-sdk-workerd.cjs',
      '/proof/packages/studio-runtime/tests/fixtures/python-sdk-worker.ts',
      '/proof/seed.json',
      '/proof/wrangler.json',
    ],
    '/proof/packages/studio-runtime',
  )
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
