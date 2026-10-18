// Trusted instrumentation around the real Pyright process, not a fake server.
const fs = require('node:fs')
const { spawnSync } = require('node:child_process')
const net = require('node:net')
process.on('uncaughtExceptionMonitor', (error) => {
  process.stderr.write(
    `${JSON.stringify({ l0: 'uncaught', message: error.message, code: error.code, stack: error.stack })}\n`,
  )
})
function denied(operation, codes = ['ERR_ACCESS_DENIED']) {
  try {
    operation()
    return false
  } catch (error) {
    return codes.includes(error.code)
  }
}
process.stderr.write(
  `${JSON.stringify({ l0: 'boundary', outsideReadDenied: denied(() => fs.readFileSync(process.env.L0_CANARY), process.env.L0_LINUX === '1' ? ['ENOENT'] : ['ERR_ACCESS_DENIED']), childProcessDenied: process.env.L0_LINUX === '1' ? 'not-a-node-permission-boundary' : denied(() => spawnSync(process.execPath, ['-e', 'process.exit(0)'])) })}\n`,
)
const timer = setInterval(
  () => process.stderr.write(`${JSON.stringify({ l0: 'memory', ...process.memoryUsage() })}\n`),
  25,
)
timer.unref()
if (process.env.L0_LINUX === '1') {
  const status = fs.readFileSync('/proc/self/status', 'utf8')
  const state = {
    l0: 'linux-boundary',
    uid: process.getuid(),
    rootWriteDenied: denied(
      () => fs.writeFileSync('/opt/unauthorized-write', 'blocked'),
      ['EROFS'],
    ),
    workspaceWriteDenied: denied(
      () => fs.writeFileSync('/workspace/unauthorized-write', 'blocked'),
      ['EROFS'],
    ),
    noNewPrivileges: /^NoNewPrivs:\s+1$/m.test(status),
    capabilities: /^CapEff:\s+(\w+)$/m.exec(status)?.[1],
    seccomp: /^Seccomp:\s+(\d+)$/m.exec(status)?.[1],
    memoryMax: fs.readFileSync('/sys/fs/cgroup/memory.max', 'utf8').trim(),
    networkDenied: false,
  }
  // TEST-NET-1 has no external service. An immediate ENETUNREACH demonstrates
  // absence of a route; timeout is NOT accepted as proof of network isolation.
  const socket = net.connect({ host: '192.0.2.1', port: 443 })
  socket.setTimeout(1000, () => {
    socket.destroy()
    process.stderr.write(`${JSON.stringify({ ...state, networkError: 'timeout' })}\n`)
  })
  socket.once('error', (error) => {
    state.networkDenied = error.code === 'ENETUNREACH'
    process.stderr.write(`${JSON.stringify({ ...state, networkError: error.code })}\n`)
  })
  socket.once('connect', () => {
    socket.destroy()
    process.stderr.write(`${JSON.stringify({ ...state, networkError: 'unexpected-connect' })}\n`)
  })
}
