import { expect, test } from 'bun:test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { OwnedProcess } from '../src/process/owned'

test.skipIf(process.platform !== 'win32')(
  'ConPTY owns input, resize and cancellation without losing the process tree',
  async () => {
    const directory = await mkdtemp(join(tmpdir(), 'zero-pty-'))
    const process = await OwnedProcess.start(directory, {
      executable: 'node',
      args: [
        '-e',
        `process.stdin.setRawMode(true);console.log('TTY='+process.stdout.isTTY+' SIZE='+process.stdout.columns+'x'+process.stdout.rows);process.stdout.on('resize',()=>console.log('SIZE='+process.stdout.columns+'x'+process.stdout.rows));process.stdin.on('data',d=>console.log('INPUT='+d.toString()));setInterval(()=>{},1000)`,
      ],
      cwd: directory,
      terminal: { columns: 80, rows: 24 },
    })
    let output = '',
      errors = ''
    process.stdout.on('data', (chunk) => {
      output += chunk.toString()
    })
    process.stderr.on('data', (chunk) => {
      errors += chunk.toString()
    })
    const until = async (expected: string) => {
      const deadline = Date.now() + 5000
      while (!output.includes(expected) && Date.now() < deadline) await Bun.sleep(20)
      expect({ output, errors }).toMatchObject({ errors: '' })
      expect(output).toContain(expected)
    }
    try {
      await until('TTY=true SIZE=80x24')
      process.resize(120, 40)
      await until('SIZE=120x40')
      process.send('hello')
      await until('INPUT=hello')
      const start = performance.now()
      await process.close()
      expect(performance.now() - start).toBeLessThan(2000)
    } finally {
      await process.close()
    }
  },
  20000,
)
