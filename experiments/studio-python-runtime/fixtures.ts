import type {
  StudioPythonClassicDocument,
  StudioPythonProDocument,
} from '@sistemazero/core/studio/project-document'
import { turtleF1Source } from '../../packages/studio/e2e-python-editor/fixtures/performance'
import { preparePythonExecutionSnapshot } from '../../packages/studio/src/runtime/python/snapshot'
import { documentFixture } from '../../packages/studio/src/state/fixtures/projectDocuments'
import { audioFixtures, portableAudioAsset } from './audioFixtures'
import { TURTLE_EXTENSION, turtleFixtures } from './turtleFixtures'

/** Behavioral fixtures, never a production runtime catalog or author template. */
const cases: Record<string, string> = {
  ...audioFixtures,
  ...turtleFixtures,
  turtleF1: turtleF1Source('red'),
  osSystem: `import os
print('os-system result', os.system('aplay start_up.wav > /dev/null 2>&1 &'))
`,
  portable: `from helper import n
from pathlib import Path
import __main__, sys
assert __main__.__dict__ is globals()
assert __name__ == '__main__' and __package__ is None and __spec__ is None
assert sys.argv == ['src/main.py']
assert Path(__file__).read_bytes().startswith(b'from helper')
assert Path('hero.gif').read_bytes() == bytes([0, 1, 2, 255])
print('ação 🐢', n)
value = 7
def current(): return value
`,
  input: `import sys
print('primeiro:', repr(input('Nome: ')))
print('vazio:', repr(input()))
try: input()
except EOFError: print('EOF')
assert sys.stdin.read() == ''
`,
  partial: `import sys, os
sys.stdout.write('a'); sys.stdout.flush(); os.fsync(1)
sys.stdout.write('🐢b'); sys.stdout.flush(); os.fsync(1)
sys.stderr.write('erro'); sys.stderr.flush(); os.fsync(2)
`,
  noNewline: "print('fim 🐢', end='')\n",
  noNewlineError: "print('antes', end='')\nraise ValueError('erro')\n",
  customStream: `import sys
original = sys.stdout
class Stream:
    def write(self, text): return original.write(text)
    def flush(self): return original.flush()
sys.stdout = Stream()
print('custom', end='')
`,
  flushError: `import sys
class Stream:
    def write(self, text): return len(text)
    def flush(self): raise OSError('Falha ao descarregar')
sys.stdout = Stream()
`,
  flood: `import os
for _ in range(256): os.write(1, b'x' * 8192)
`,
  syntax: 'if True print(1)\n',
  error: `raise ValueError('erro da criança 🐢')`,
  exit: 'raise SystemExit(0)\n',
  exitFloat: 'raise SystemExit(0.0)\n',
  unicodeError: `raise ValueError('🐢' * 10000)`,
  waiting: 'value = input()\n',
  stdlibInspection: `import inspect, json, traceback, random, dataclasses, fractions, statistics, hashlib
source = inspect.getsource(json.dumps)
assert source.startswith('def dumps(')
assert inspect.getsourcefile(json.dumps).endswith('/json/__init__.py')
try: json.loads('{')
except json.JSONDecodeError:
    trace = traceback.format_exc()
    assert 'json/decoder.py' in trace and 'obj, end = self.scan_once(s, idx)' in trace
else: raise AssertionError('expected JSONDecodeError')
@dataclasses.dataclass
class Point:
    x: int
    y: int
assert dataclasses.asdict(Point(2, 3)) == {'x': 2, 'y': 3}
assert fractions.Fraction(1, 3) + fractions.Fraction(1, 6) == fractions.Fraction(1, 2)
assert statistics.mean([1, 2, 3]) == 2
rng = random.Random(42)
assert [rng.randint(1, 100) for _ in range(5)] == [82, 15, 4, 95, 36]
print('stdlib preserved', hashlib.sha256(source.encode()).hexdigest(), hashlib.sha256(trace.encode()).hexdigest())
`,
  loop: `from js import postMessage, JSON
count = 0
while True:
    count += 1
    if count == 1000:
        postMessage(JSON.parse('{"type":"console","batches":[{"stream":"stdout","text":"loop-started","omittedChars":0,"omittedLines":0}]}'))
`,
  ffiFlood: `from js import postMessage
for _ in range(10000): postMessage('untrusted')
`,
  childWorker: `from js import Worker, Blob, URL, trustedTypes, Object
try:
    Worker.new('data:text/javascript,while(true){}')
except Exception: print('child blocked')
else: raise AssertionError('child was allowed')
try:
    trustedTypes.createPolicy('sz-python-bootstrap', Object.new())
except Exception: print('policy blocked')
else: raise AssertionError('policy was allowed')
`,
}

export async function runtimeFixtureProject(
  name: string,
): Promise<StudioPythonClassicDocument | StudioPythonProDocument> {
  if (
    [
      'classic-input',
      'classic-portable',
      'classic-turtleDrawing',
      'classic-turtleF1',
      'classic-turtleEvents',
      'classic-turtleImage',
      'classic-portableAudio',
      'classic-portableAudioNamespace',
    ].includes(name)
  ) {
    const pro = await runtimeFixtureProject(name.slice('classic-'.length))
    if (pro.kind !== 'pro') throw new Error('Expected source fixture')
    const { tree, proMeta: _meta, ...common } = pro
    return {
      ...common,
      kind: 'classic',
      mode: 'bridge',
      python: { ...pro.python, entrypoint: 'main.py' },
      files: Object.fromEntries(
        Object.entries(tree).flatMap(([path, node]) =>
          node.kind === 'file'
            ? [
                [
                  path === 'src/main.py'
                    ? 'main.py'
                    : ['classic-portable', 'classic-portableAudioNamespace'].includes(name) &&
                        path.startsWith('src/')
                      ? path.slice(4)
                      : path,
                  name === 'classic-portable'
                    ? node.content.replace(
                        "assert sys.argv == ['src/main.py']",
                        "assert sys.argv == ['main.py']",
                      )
                    : node.content,
                ],
              ]
            : [],
        ),
      ),
      ir: { untrustedDerivedCache: 'raise RuntimeError("must never execute")' },
      blocksState: null,
    }
  }
  const { isGameFixture, gameFixtureProject } = await import('./gameFixtures')
  if (isGameFixture(name)) return gameFixtureProject(name)
  const source = cases[name]
  if (source === undefined) throw new Error('Unknown runtime fixture')
  const project = documentFixture('python', 'pro')
  if (project.programmingLanguage !== 'python' || project.kind !== 'pro') throw new Error('fixture')
  project.tree['src/main.py'] = { kind: 'file', content: source }
  project.assets = [
    {
      id: 'hero',
      name: 'hero',
      kind: 'image',
      source: 'upload',
      dataUrl: 'data:image/gif;base64,AAEC/w==',
      proPath: 'hero.gif',
    },
  ]
  if (name in audioFixtures) {
    project.assets = name === 'portableAudioNamespace' ? [] : [portableAudioAsset()]
    if (name === 'portableAudioNamespace')
      project.tree['src/sz_audio.py'] = {
        kind: 'file',
        content: "AUTHOR = 'author audio preserved'\n",
      }
  }
  if (name in turtleFixtures || name === 'turtleF1') {
    project.installedExtensions = [{ ...TURTLE_EXTENSION, installedAt: project.createdAt }]
    project.assets = [
      {
        id: 'pixel',
        name: 'pixel',
        kind: 'image',
        source: 'upload',
        proPath: 'pixel.gif',
        dataUrl:
          'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
      },
    ]
    if (name === 'turtleF1') project.assets = []
    if (name === 'turtleInvalidImage' || name === 'turtleImageInput') {
      // Valid dimensions/signature with missing image data: reaches the native
      // decoder, whose error must return to Python instead of killing its worker.
      const bytes = new Uint8Array(33)
      bytes.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82])
      const view = new DataView(bytes.buffer)
      view.setUint32(16, 1)
      view.setUint32(20, 1)
      project.assets.push({
        id: 'corrupt',
        name: 'corrupt',
        kind: 'image',
        source: 'upload',
        proPath: 'corrupt.png',
        dataUrl: `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`,
      })
    }
    if (name === 'turtleNamespace') {
      project.tree['src/turtle.py'] = {
        kind: 'file',
        content: "AUTHOR = 'author turtle preserved'\n",
      }
      project.tree['src/_sz_turtle_colors.py'] = {
        kind: 'file',
        content: "raise RuntimeError('author code executed during prepare')\n",
      }
    }
  }
  return project
}

export async function runtimeFixture(name: string) {
  const snapshot = await preparePythonExecutionSnapshot(await runtimeFixtureProject(name))
  return {
    ...snapshot,
    files: snapshot.files.map(({ bytes, ...file }) => ({ ...file, bytes: [...bytes] })),
  }
}
