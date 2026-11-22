import { expect, it } from 'bun:test'
import { purePython, runPurePython } from '../testing/runPurePython'
import { pythonJsonWire } from './pythonJsonWire'

const samples = [
  '0000000000000000',
  '8000000000000000',
  '0000000000000001',
  '8000000000000001',
  '7fefffffffffffff',
  'ffefffffffffffff',
  '4340000000000000',
  'c340000000000000',
  '4430000000000000',
  '7fffffffffffffff',
  '7ff0000000000000',
  '44b52d02c7e14af5',
  '44b52d02c7e14af6',
  '44b52d02c7e14af7',
  '444b1ae4d6e2ef4e',
  '444b1ae4d6e2ef4f',
  '444b1ae4d6e2ef50',
  '3eb0c6f7a0b5ed8c',
  '3eb0c6f7a0b5ed8d',
  '41b3de4355555553',
  '41b3de4355555554',
  '41b3de4355555555',
  '41b3de4355555556',
  '41b3de4355555557',
  'becbf647612f3696',
  '43143ff3c1cb0959',
]
let seed = 0x123456789abcdefn
for (let n = 0; n < 4096; n++) {
  seed ^= seed << 13n
  seed ^= seed >> 7n
  seed ^= seed << 17n
  seed = BigInt.asUintN(64, seed)
  samples.push(seed.toString(16).padStart(16, '0'))
}
it.skipIf(!purePython)(
  'binary64 spellings match JSON.stringify across published boundary samples and deterministic bit patterns',
  async () => {
    expect(
      await runPurePython(
        pythonJsonWire,
        "print(json.dumps([_pinta_json_number(struct.unpack('>d',bytes.fromhex(h))[0]) for h in json.load(sys.stdin)]))",
        samples,
      ),
    ).toEqual(samples.map((h) => JSON.stringify(Buffer.from(h, 'hex').readDoubleBE())))
  },
)

it.skipIf(!purePython)(
  'UTF-8 JSON size preserves escapes, UTF-16 pairs/lone surrogates and exact budget boundaries',
  async () => {
    const values: unknown[] = [
      null,
      true,
      false,
      0,
      -0,
      1e20,
      1e-6,
      '',
      'a"\\\n\u0000',
      'á 🌳',
      '\ud800',
      '\ud83d\ude42',
      '\ud800X\udc00',
      '\u2028\u2029',
      {},
      [],
      { unicode: '🌳', array: [1e-7, true, null, '\ud800'] },
    ]
    for (let code = 0; code < 160; code++) values.push(String.fromCharCode(code))
    const input = values.map((value) => ({
      text: JSON.stringify(value),
      bytes: Buffer.byteLength(JSON.stringify(value)),
    }))
    expect(
      await runPurePython(
        pythonJsonWire,
        `result=[]
for item in json.load(sys.stdin):
    value=json.loads(item['text'],parse_int=float,parse_float=float)
    projected,size=_pinta_json_project(value,item['bytes'])
    try:
        _pinta_json_project(value,item['bytes']-1)
        raise AssertionError('Budget was widened')
    except ValueError:
        pass
    result.append(size)
assert _pinta_json_string_bytes('\\ud83d\\ude42',6)==6
assert _pinta_json_string_bytes('\\ud800',8)==8
print(json.dumps(result))`,
        input,
      ),
    ).toEqual(input.map((item) => item.bytes))
  },
)

it.skipIf(!purePython)(
  'projection follows ordinary JSON.stringify for negative zero and non-finite parsed numbers',
  async () => {
    expect(
      await runPurePython(
        pythonJsonWire,
        `value={'a':float('inf'),'b':float('-inf'),'c':float('nan'),'d':-0.0,'array':[float('inf'),-0.0]}
projected,size=_pinta_json_project(value,100)
assert math.copysign(1,projected['d'])==1
print(json.dumps({'value':projected,'bytes':size}))`,
        null,
      ),
    ).toEqual({
      value: JSON.parse(
        JSON.stringify({ a: Infinity, b: -Infinity, c: NaN, d: -0, array: [Infinity, -0] }),
      ),
      bytes: Buffer.byteLength(
        JSON.stringify({ a: Infinity, b: -Infinity, c: NaN, d: -0, array: [Infinity, -0] }),
      ),
    })
  },
)
