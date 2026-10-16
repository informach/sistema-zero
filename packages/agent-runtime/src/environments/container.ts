import { join } from 'node:path'
import type { EnvironmentLease } from '@sistemazero/agent-core'
import { z } from 'zod'
import type { Processes } from '../process/manager'
import { readBounded } from '../tools/paths'

const inspectSchema = z.object({
  Id: z.string(),
  Name: z.string(),
  Config: z.object({ Labels: z.record(z.string(), z.string()).nullable() }),
  State: z.object({ Running: z.boolean(), Status: z.string() }),
  NetworkSettings: z.object({
    Ports: z
      .record(
        z.string(),
        z.array(z.object({ HostIp: z.string(), HostPort: z.string() })).nullable(),
      )
      .default({}),
  }),
})
export class Containers {
  constructor(
    private processes: Processes,
    private directory: string,
    readonly installation: string,
  ) {}
  private async command(args: string[], signal: AbortSignal) {
    const result = await this.processes.run(
      {
        executable: 'docker',
        args,
        cwd: this.directory,
        timeoutMs: 30000,
        maxBytes: 2_000_000,
        logMode: 'stdout',
      },
      signal,
    )
    if (result.reason !== 'exited' || result.code !== 0)
      throw new Error('Docker operation failed: ' + result.output.slice(-4000))
    return (await readBounded(join(this.directory, 'logs', result.log), 2_000_000))
      .toString('utf8')
      .trim()
  }
  async owned(signal: AbortSignal) {
    const ids = (
      await this.command(
        ['ps', '-aq', '--filter', 'label=io.sistemazero.install=' + this.installation],
        signal,
      )
    )
      .split(/\s+/)
      .filter(Boolean)
    if (ids.length > 100) throw new Error('Owned container inventory exceeds limit')
    if (!ids.length) return []
    return z.array(inspectSchema).parse(JSON.parse(await this.command(['inspect', ...ids], signal)))
  }
  async inspect(lease: EnvironmentLease, signal: AbortSignal) {
    const item = (await this.owned(signal)).find((item) => item.Name === '/' + lease.resourceName)
    if (
      item &&
      (item.Config.Labels?.['io.sistemazero.lease'] !== lease.id ||
        item.Config.Labels?.['io.sistemazero.template'] !== lease.templateDigest ||
        (lease.resourceId !== undefined && item.Id !== lease.resourceId))
    )
      throw new Error('Container ownership mismatch')
    return item
  }
  async create(lease: EnvironmentLease, signal: AbortSignal) {
    if (!lease.template.image) throw new Error('Container template requires a pinned image')
    if (lease.root.includes(',')) throw new Error('Docker bind paths cannot contain a comma')
    if (lease.template.ports.length && lease.template.network !== 'bridge')
      throw new Error('Published preview ports require the explicitly selected bridge network')
    const args = [
      'create',
      '--pull=never',
      '--name',
      lease.resourceName,
      '--label',
      'io.sistemazero.install=' + this.installation,
      '--label',
      'io.sistemazero.lease=' + lease.id,
      '--label',
      'io.sistemazero.template=' + lease.templateDigest,
      '--label',
      'io.sistemazero.expires=' + lease.expiresAt,
      '--read-only',
      '--cap-drop=ALL',
      '--security-opt=no-new-privileges:true',
      '--network',
      lease.template.network,
      '--cpus',
      String(lease.template.cpus),
      '--memory',
      lease.template.memoryMb + 'm',
      '--memory-swap',
      lease.template.memoryMb + 'm',
      '--pids-limit',
      String(lease.template.pids),
      '--user',
      lease.template.user,
      '--tmpfs',
      '/tmp:rw,nosuid,nodev,size=67108864,mode=1777',
      '--log-driver',
      'local',
      '--log-opt',
      'max-size=4m',
      '--log-opt',
      'max-file=2',
      '--mount',
      'type=bind,source=' + lease.root + ',target=/workspace',
      '--workdir',
      '/workspace',
      '--env',
      'HOME=/tmp',
      ...lease.template.ports.flatMap((port) => ['--publish', '127.0.0.1::' + port]),
      '--init',
      '--entrypoint',
      'sleep',
      lease.template.image,
      'infinity',
    ]
    await this.command(args, signal)
    await this.command(['start', lease.resourceName], signal)
    const state = await this.inspect(lease, signal)
    if (!state?.State.Running) throw new Error('Container did not become ready')
    return state.Id
  }
  async stop(lease: EnvironmentLease, signal: AbortSignal) {
    const state = await this.inspect(lease, signal)
    if (!state) return { absent: true }
    if (state.State.Running) await this.command(['stop', '--time', '1', state.Id], signal)
    return { absent: false }
  }
  async destroy(lease: EnvironmentLease, signal: AbortSignal) {
    const state = await this.inspect(lease, signal)
    if (state) await this.command(['rm', '--force', state.Id], signal)
    return { absent: !state }
  }
  async port(lease: EnvironmentLease, port: number, signal: AbortSignal) {
    const state = await this.inspect(lease, signal)
    if (!state?.State.Running) throw new Error('Owned container is not running')
    const binding = state.NetworkSettings.Ports[port + '/tcp']?.find(
      (item) => item.HostIp === '127.0.0.1',
    )
    if (!binding) throw new Error('Port is not published by the owned container')
    return z.coerce.number().int().min(1).max(65535).parse(binding.HostPort)
  }
}
