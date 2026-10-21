import { expect, test } from 'bun:test'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

test.skipIf(process.platform !== 'win32')(
  'real QA adapter supplies existing owned Windows known folders before app import',
  async () => {
    const root = resolve(import.meta.dir, '../../../..')
    const out = resolve(root, '.cache/lesson-native-appdata-controls', randomUUID())
    const qaHome = resolve(out, 'home')
    await mkdir(qaHome, { recursive: true })
    const entry = resolve(out, 'native-reader.mjs')
    const receipt = resolve(out, 'native.json')
    const source = `import {dlopen,ptr} from 'bun:ffi';
import {existsSync,writeFileSync} from 'node:fs';import {resolve} from 'node:path';
const [home,output]=process.argv.slice(2);const local=resolve(home,'AppData/Local'),roaming=resolve(home,'AppData/Roaming');
const lib=dlopen('C:/Windows/System32/shell32.dll',{SHGetFolderPathW:{args:['ptr','i32','ptr','u32','ptr'],returns:'i32'}});
const results=[];try{for(const id of [0x1c,0x1a]){const b=new Uint16Array(260);const hr=lib.symbols.SHGetFolderPathW(null,id,null,0,ptr(b));const end=b.indexOf(0);const path=String.fromCharCode(...b.subarray(0,end));results.push({hr,exists:existsSync(path),owned:path.toLowerCase().startsWith(home.toLowerCase())});}}finally{lib.close()}
writeFileSync(output,JSON.stringify({results,localExists:existsSync(local),roamingExists:existsSync(roaming),localEnv:process.env.LOCALAPPDATA===local,roamingEnv:process.env.APPDATA===roaming}),{flag:'wx'});
`
    await writeFile(entry, source, { flag: 'wx' })
    const sha = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex')
    const envFile = resolve(out, 'environment.json')
    const environment = JSON.stringify({ version: 1, role: 'nativeKnownFolderControl', env: {} })
    await writeFile(envFile, environment, { flag: 'wx' })
    const stateFile = resolve(out, 'state.json')
    const claimFile = resolve(out, 'claim.json')
    const nonce = randomUUID()
    const job = {
      role: 'nativeKnownFolderControl',
      owner: 'inert-native-control',
      run: nonce,
      nonce,
      home: qaHome,
      cwd: root,
      entry,
      entrySha256: sha(source),
      argv: [qaHome, receipt],
      envFile,
      envSha256: sha(environment),
      stateFile,
      claimFile,
      claimReceipt: resolve(out, 'claim-accepted.json'),
      stopRequest: resolve(out, 'stop.request'),
      signalReceipt: resolve(out, 'signal.json'),
      failureReceipt: resolve(out, 'failure.json'),
      cleanPath: 'C:/Windows/System32',
    }
    const jobFile = resolve(out, 'job.json')
    await writeFile(jobFile, JSON.stringify(job), { flag: 'wx' })
    const child = Bun.spawn(
      [
        process.execPath,
        '--no-env-file',
        resolve(root, 'packages/community-kids/tests/e2e/windows/python-lesson-windows-entry.mjs'),
        jobFile,
      ],
      {
        env: {
          SystemRoot: process.env.SystemRoot,
          WINDIR: process.env.WINDIR,
          TEMP: process.env.TEMP,
          TMP: process.env.TMP,
          LOCALAPPDATA: 'C:/inert-not-used',
          APPDATA: 'C:/inert-not-used',
        },
        stdin: 'ignore',
        stdout: 'ignore',
        stderr: 'ignore',
      },
    )
    const state = JSON.stringify({
      root: { processId: child.pid },
      nonce,
      owner: job.owner,
      run: job.run,
      role: job.role,
      status: 'witnessed-awaiting-app',
    })
    await writeFile(stateFile, state, { flag: 'wx' })
    await writeFile(
      claimFile,
      JSON.stringify({ version: 1, nonce, pid: child.pid, stateSha256: sha(state) }),
      { flag: 'wx' },
    )
    expect(await child.exited).toBe(0)
    const observed = JSON.parse(await readFile(receipt, 'utf8'))
    expect(observed.localExists).toBe(true)
    expect(observed.roamingExists).toBe(true)
    expect(observed.localEnv).toBe(true)
    expect(observed.roamingEnv).toBe(true)
    expect(observed.results).toEqual([
      { hr: 0, exists: true, owned: true },
      { hr: 0, exists: true, owned: true },
    ])
  },
  15_000,
)
