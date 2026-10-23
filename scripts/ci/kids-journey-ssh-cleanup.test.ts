import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'

function removeOwnedDirectory(directory: string) {
  const target = resolve(directory)
  const parent = resolve(tmpdir())
  if (
    (!target.startsWith(`${parent}\\`) && !target.startsWith(`${parent}/`)) ||
    !basename(directory).startsWith('sz-kids-ssh-proof-')
  )
    throw new Error('Refusing cleanup outside the owned temporary directory')
  rmSync(directory, { recursive: true, force: true })
}

test.each([
  'prepare-fails',
  'dispose-fails',
  'success',
  'success-with-newline',
])('SSH config/key cleanup: %s', (scenario) => {
  const directory = mkdtempSync(join(tmpdir(), 'sz-kids-ssh-proof-'))
  try {
    const script = `
      import {createRequire,syncBuiltinESMExports} from 'node:module';
      import {join} from 'node:path';
      import {homedir} from 'node:os';
      import assert from 'node:assert/strict';
      const fs=createRequire(import.meta.url)('node:fs');
      const config=join(homedir(),'.ssh','config');
      fs.mkdirSync(join(homedir(),'.ssh'),{recursive:true});
      fs.writeFileSync(config,'# original config\\n');
      const originalWrite=fs.writeFileSync,originalChmod=fs.chmodSync;
      let configWrites=0,failed=false;
      fs.writeFileSync=(path,...args)=>{if(path===config&&++configWrites===2&&process.env.SCENARIO==='dispose-fails')throw new Error('restore failure');return originalWrite(path,...args)};
      fs.chmodSync=(path,...args)=>{if(path===config&&!failed&&process.env.SCENARIO==='prepare-fails'){failed=true;throw new Error('chmod failure')}return originalChmod(path,...args)};
      syncBuiltinESMExports();
      const {prepareSsh}=await import(${JSON.stringify(new URL('./kids-journey-rollout.mjs', import.meta.url).href)});
      let caught=false,handle;
      try {
        handle=prepareSsh({RAILWAY_TOKEN:'synthetic-api',RAILWAY_SSH_PRIVATE_KEY:process.env.SCENARIO==='success-with-newline'?'synthetic-key\\n':'synthetic-key',RAILWAY_SSH_KNOWN_HOSTS:'ssh.railway.com ssh-ed25519 AAAA'});
        assert.equal(fs.readFileSync(handle.identity,'utf8'),'synthetic-key\\n');
        handle.dispose()
      }catch{caught=true}
      assert.equal(caught,process.env.SCENARIO==='prepare-fails'||process.env.SCENARIO==='dispose-fails');
      if(process.env.SCENARIO!=='dispose-fails')assert.equal(fs.readFileSync(config,'utf8'),'# original config\\n');
      assert.deepEqual(fs.readdirSync(process.env.TEMP).filter(name=>name.startsWith('sz-kids-rollout-')),[]);
    `
    const result = spawnSync('node', ['--input-type=module', '-e', script], {
      env: {
        ...process.env,
        HOME: directory,
        USERPROFILE: directory,
        TEMP: directory,
        TMP: directory,
        TMPDIR: directory,
        SCENARIO: scenario,
      },
      encoding: 'utf8',
      timeout: 10000,
    })
    expect(result.status, result.stderr).toBe(0)
  } finally {
    // Never remove a computed Windows target without confirming the owned temp boundary.
    removeOwnedDirectory(directory)
  }
})
