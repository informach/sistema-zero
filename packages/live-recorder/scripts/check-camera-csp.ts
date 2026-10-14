import assert from 'node:assert/strict'

async function checkProductionCameraPolicy() {
  // Run config evaluation separately: production must never accidentally inherit dev unsafe-eval.
  const configuration = Bun.spawn(
    [
      'bun',
      '-e',
      `
    import { createRequire } from 'node:module';
    import { resolve } from 'node:path';
    const require = createRequire(resolve('../admin/package.json'));
    const { pathToRegexp } = require('next/dist/compiled/path-to-regexp');
    const values = [];
    for (const [app, page] of [['community-kids', '/oficinas/aulas/test'], ['admin', '/admin/professor/ao-vivo/test']]) {
      const config = (await import('../' + app + '/next.config.ts')).default;
      const rules = await config.headers();
      const headers = path => Object.fromEntries(rules.filter(rule => pathToRegexp(rule.source).test(path)).flatMap(rule => rule.headers.map(header => [header.key, header.value])));
      values.push({ app, document: headers(page), worker: headers('/_next/static/chunks/worker.js'), asset: headers('/api/live/camera-assets/model.tflite') });
    }
    console.log(JSON.stringify(values));
  `,
    ],
    { env: { ...process.env, NODE_ENV: 'production' }, stdout: 'pipe', stderr: 'pipe' },
  )
  const policies = await new Response(configuration.stdout).text()
  assert.equal(await configuration.exited, 0, await new Response(configuration.stderr).text())
  await Bun.write('./.cache/camera-csp-test/policies.json', policies)
  const build = await Bun.build({
    entrypoints: ['./tests/camera-csp-check.ts'],
    target: 'node',
    external: ['playwright'],
    outdir: './.cache/camera-csp-test',
  })
  assert.equal(build.success, true, JSON.stringify(build.logs))
  const runner = Bun.spawn(['node', './.cache/camera-csp-test/camera-csp-check.js'], {
    stdout: 'inherit',
    stderr: 'pipe',
  })
  const diagnostic = await new Response(runner.stderr).text()
  assert.equal(await runner.exited, 0, diagnostic)
}

await checkProductionCameraPolicy()
