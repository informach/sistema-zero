import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  type ExecutionJson,
  type ExecutionObservation,
  judgeExecutionObservation,
  type SectionExecutionRule,
} from '../../core/src/learning/project-execution'

// This gate runs the actual Node/Chromium observer, separately from mocked Worker tests.
const nativeTest = process.env.SZ_CHECK_CHROMIUM ? test : test.skip
nativeTest(
  'the native observer never grades a truncated response or incomplete script context',
  async () => {
    const runtime = fileURLToPath(new URL('../runtime/', import.meta.url))
    const studio = fileURLToPath(new URL('../../studio/', import.meta.url))
    const testEntry = Bun.resolveSync('@playwright/test', studio)
    const playwright = Bun.resolveSync('playwright', path.dirname(testEntry))
    const driver = Bun.resolveSync('playwright-core', path.dirname(playwright))
    const source = await readFile(path.join(runtime, 'check-objectives.mjs'), 'utf8')
    const childSource = source.replace(
      "from 'playwright-core'",
      `from ${JSON.stringify(pathToFileURL(driver).href)}`,
    )
    expect(childSource).not.toBe(source)
    const temporary = await mkdtemp(path.join(os.tmpdir(), 'sz-objective-observation-'))
    const temporaryParent = path.resolve(os.tmpdir()) + path.sep
    if (
      !path.resolve(temporary).startsWith(temporaryParent) ||
      !path.basename(temporary).startsWith('sz-objective-observation-')
    )
      throw new Error('Invalid cleanup target')
    const array = Array.from({ length: 201 }, (_, index) => index)
    const object = Object.fromEntries(array.map((index) => [`k${index}`, index]))
    const fn = (name: string, expected: ExecutionJson): SectionExecutionRule => ({
      type: 'functionReturns',
      name,
      cases: [{ args: [], expected }],
    })
    const script = (code: string, key?: string): SectionExecutionRule => ({
      type: 'script',
      code,
      steps: key ? [{ action: 'press', key }] : [],
    })
    const objectives: {
      id: string
      rule: SectionExecutionRule
      expected: boolean | 'incomplete'
    }[] = [
      { id: 'array-complete', rule: fn('list', array), expected: true },
      { id: 'array-short-expected', rule: fn('list', array.slice(0, 200)), expected: false },
      { id: 'object-complete', rule: fn('object', object), expected: true },
      { id: 'literal-marker', rule: fn('literalFn', { $sz: 'error' }), expected: true },
      { id: 'oversize-function', rule: fn('large', ''), expected: 'incomplete' },
      { id: 'getter-function', rule: fn('getter', {}), expected: 'incomplete' },
      {
        id: 'getter-value',
        rule: {
          type: 'behavior',
          steps: [],
          expect: { target: { kind: 'value', path: 'broken' }, compare: 'notEquals', value: 0 },
        },
        expected: 'incomplete',
      },
      {
        id: 'script-complete',
        rule: script(
          "return jogo.array.length === 201 && jogo.literal.$sz === 'error' && jogo.n300 === 300",
        ),
        expected: true,
      },
      {
        id: 'script-text-overflow',
        rule: script('return texto === null', 't'),
        expected: 'incomplete',
      },
      {
        id: 'script-console-overflow',
        rule: script('return !console.some(x => x.includes("secret"))', 'l'),
        expected: 'incomplete',
      },
      {
        id: 'script-console-during-snapshot',
        rule: script('return !console.some(x => x.includes("secret"))', 's'),
        expected: 'incomplete',
      },
      {
        id: 'console-lines-overflow',
        rule: {
          type: 'behavior',
          steps: [{ action: 'press', key: 'n' }],
          expect: { target: { kind: 'console' }, compare: 'notContains', value: 'secret' },
        },
        expected: 'incomplete',
      },
      { id: 'student-exception', rule: fn('studentError', 1), expected: false },
      { id: 'positive-infinity-function', rule: fn('positiveInfinity', 42), expected: false },
      { id: 'negative-infinity-function', rule: fn('negativeInfinity', 42), expected: false },
      {
        id: 'positive-infinity-value',
        rule: {
          type: 'behavior',
          steps: [],
          expect: { target: { kind: 'value', path: 'infinity' }, compare: 'equals', value: 42 },
        },
        expected: false,
      },
      {
        id: 'negative-infinity-value',
        rule: {
          type: 'behavior',
          steps: [],
          expect: {
            target: { kind: 'value', path: 'minusInfinity' },
            compare: 'equals',
            value: 42,
          },
        },
        expected: false,
      },
    ]
    try {
      await writeFile(path.join(temporary, 'check-objectives.mjs'), childSource)
      for (const file of [
        'check-click-target.mjs',
        'check-javascript-modules.mjs',
        'check-approach.mjs',
      ])
        await writeFile(path.join(temporary, file), await readFile(path.join(runtime, file)))
      await writeFile(
        path.join(temporary, 'execution-observation.generated.mjs'),
        await readFile(path.join(runtime, 'execution-observation.generated.mjs')),
      )
      await writeFile(
        path.join(temporary, 'check-options.json'),
        JSON.stringify({
          mode: 'classic',
          scope: '__testReader',
          deadlineMs: 45_000,
          objectives: objectives.map(({ id, rule }) => ({ id, rule })),
        }),
      )
      await writeFile(
        path.join(temporary, 'game.html'),
        `<!doctype html><body><p>Ready</p><script>
      const array = Array.from({length:201}, (_, i) => i);
      const broken = { get value() { throw new Error('unreadable getter') } };
      const values = {
        array, broken, list: () => array,
        object: () => Object.fromEntries(array.map(i => ['k' + i, i])),
        literal: { $sz: 'error' }, large: () => 'x'.repeat(20001),
        getter: () => broken, studentError: () => { throw new Error('student error') },
        infinity: Infinity, minusInfinity: -Infinity,
        positiveInfinity: () => Infinity, negativeInfinity: () => -Infinity
      };
      const names = ['array', 'literal', ...Array.from({length:301}, (_, i) => 'n' + i)];
      let duringSnapshot = false;
      window.__testReader = {
        names: () => names,
        get: name => {
          if (duringSnapshot) { duringSnapshot = false; console.log('x'.repeat(301) + 'secret'); }
          return name === 'literalFn' ? {v: () => values.literal} :
            name in values ? {v: values[name]} : /^n\\d+$/.test(name) ? {v:Number(name.slice(1))} : null;
        }
      };
      window.addEventListener('keydown', event => {
        if (event.key === 't') document.body.textContent = 'x'.repeat(50001);
        if (event.key === 'l') console.log('x'.repeat(301) + 'secret');
        if (event.key === 's') duringSnapshot = true;
        if (event.key === 'n') for (let i = 0; i < 201; i++) console.log(i === 200 ? 'secret' : 'line' + i);
      });
    </script>`,
      )
      const child = Bun.spawn(
        [
          process.env.STUDIO_PYTHON_BUILD_NODE ?? 'node',
          path.join(temporary, 'check-objectives.mjs'),
        ],
        {
          cwd: temporary,
          env: process.env,
          stdout: 'pipe',
          stderr: 'pipe',
        },
      )
      const [stdout, stderr, code] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
      ])
      expect(code, stdout + stderr).toBe(0)
      const result = JSON.parse(
        await readFile(path.join(temporary, 'check-result.json'), 'utf8'),
      ) as { observations: ExecutionObservation[] }
      expect(result.observations).toHaveLength(objectives.length)
      for (const objective of objectives) {
        const observed = result.observations.find((item) => item.id === objective.id)
        expect(observed, objective.id).toBeDefined()
        if (objective.expected === 'incomplete') expect(observed?.error, objective.id).toBeString()
        else {
          expect(observed?.error, objective.id).toBeUndefined()
          expect(judgeExecutionObservation(objective.rule, observed).passed, objective.id).toBe(
            objective.expected,
          )
        }
      }
      console.log(
        JSON.stringify({
          browser: process.env.SZ_CHECK_CHROMIUM,
          observerSha256: createHash('sha256').update(source).digest('hex'),
          objectives: objectives.length,
          nativeNode: process.env.STUDIO_PYTHON_BUILD_NODE,
          result,
        }),
      )
    } finally {
      await rm(temporary, { recursive: true, force: true })
    }
  },
  60_000,
)
