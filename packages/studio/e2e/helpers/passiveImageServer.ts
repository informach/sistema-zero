import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:https'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { promisify } from 'node:util'

/** Real HTTPS, avoiding interception races for the first request of an opaque OOPIF. */
export async function createPassiveImageServer(): Promise<{
  origin: string
  requests: readonly string[]
  dispose(): Promise<void>
}> {
  const directory = await mkdtemp(join(tmpdir(), 'studio-passive-image-'))
  const cleanup = async () => {
    const target = resolve(directory)
    if (!target.startsWith(resolve(tmpdir()) + sep) || !target.includes('studio-passive-image-'))
      throw new Error('Invalid HTTPS fixture directory')
    await rm(target, { recursive: true, force: true })
  }
  try {
    const configuration = join(directory, 'openssl.cnf')
    await writeFile(
      configuration,
      '[req]\ndistinguished_name=dn\nx509_extensions=ext\nprompt=no\n[dn]\nCN=localhost\n[ext]\nsubjectAltName=IP:127.0.0.1\n',
    )
    const gitOpenSSL = join(
      process.env.ProgramFiles ?? 'C:\\Program Files',
      'Git',
      'usr',
      'bin',
      'openssl.exe',
    )
    const openssl = process.platform === 'win32' && existsSync(gitOpenSSL) ? gitOpenSSL : 'openssl'
    // Generated test-only key stays in the verified temporary directory; never published.
    await promisify(execFile)(openssl, [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-days',
      '1',
      '-config',
      configuration,
      '-keyout',
      join(directory, 'key.pem'),
      '-out',
      join(directory, 'cert.pem'),
    ])
    const requests: string[] = []
    const server = createServer(
      {
        key: await readFile(join(directory, 'key.pem')),
        cert: await readFile(join(directory, 'cert.pem')),
      },
      (request, response) => {
        requests.push(request.url ?? '')
        response.writeHead(200, {
          'Content-Type': 'image/gif',
          'Cross-Origin-Resource-Policy': 'cross-origin',
          'Cache-Control': 'no-store',
        })
        response.end(Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64'))
      },
    )
    await new Promise<void>((done, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => {
        server.removeListener('error', reject)
        done()
      })
    })
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('HTTPS fixture did not listen')
    return {
      origin: `https://127.0.0.1:${address.port}`,
      requests,
      async dispose() {
        await new Promise<void>((done, reject) =>
          server.close((error) => (error ? reject(error) : done())),
        )
        await cleanup()
      },
    }
  } catch (error) {
    await cleanup()
    throw error
  }
}
