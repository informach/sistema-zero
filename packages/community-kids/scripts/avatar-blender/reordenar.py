"""Reordena as juntas de um GLB com pele para a ordem canônica do Armature.glb do avatar.

O avatar prende cada peça ao esqueleto COMPARTILHADO pelo índice da junta (skinIndex), então
a ordem das juntas da peça tem de ser a mesma do Armature.glb. O exportador do Blender grava em
outra ordem; aqui remapeamos JOINTS_0, a lista de juntas e as matrizes inversas de bind.
"""
import json, struct, sys

def read_glb(path):
    b = open(path, 'rb').read()
    ln = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + ln])
    off = 20 + ln
    bln = struct.unpack('<I', b[off:off + 4])[0]
    return j, bytearray(b[off + 8:off + 8 + bln])

def write_glb(path, j, binb):
    js = json.dumps(j, separators=(',', ':')).encode()
    js += b' ' * ((4 - len(js) % 4) % 4)
    binb = bytes(binb) + b'\0' * ((4 - len(binb) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(binb)
    out = struct.pack('<III', 0x46546C67, 2, total) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(binb), 0x004E4942) + binb
    open(path, 'wb').write(out)

def accessor_view(j, acc_idx):
    a = j['accessors'][acc_idx]
    v = j['bufferViews'][a['bufferView']]
    return a, v, v.get('byteOffset', 0) + a.get('byteOffset', 0)

canon_j, _ = read_glb(sys.argv[1])
canon = [canon_j['nodes'][i]['name'] for i in canon_j['skins'][0]['joints']]
j, binb = read_glb(sys.argv[2])
skin = j['skins'][0]
names = [j['nodes'][i]['name'] for i in skin['joints']]
assert sorted(names) == sorted(canon), 'as juntas da peça não são as do esqueleto do avatar'
by_name = {j['nodes'][i]['name']: i for i in skin['joints']}
old_to_new = [canon.index(n) for n in names]

# 1) JOINTS_0 de cada primitiva: troca o índice velho pelo canônico.
fmt = {5121: ('B', 1), 5123: ('H', 2)}
for mesh in j['meshes']:
    for prim in mesh['primitives']:
        if 'JOINTS_0' not in prim['attributes']:
            continue
        a, v, start = accessor_view(j, prim['attributes']['JOINTS_0'])
        code, size = fmt[a['componentType']]
        stride = v.get('byteStride', size * 4)
        for k in range(a['count']):
            p = start + k * stride
            vals = struct.unpack_from('<4' + code, binb, p)
            struct.pack_into('<4' + code, binb, p, *[old_to_new[x] for x in vals])

# 2) Matrizes inversas de bind na ordem nova.
a, v, start = accessor_view(j, skin['inverseBindMatrices'])
mats = [bytes(binb[start + k * 64:start + (k + 1) * 64]) for k in range(a['count'])]
new_mats = [None] * len(mats)
for old, new in enumerate(old_to_new):
    new_mats[new] = mats[old]
binb[start:start + 64 * len(mats)] = b''.join(new_mats)

# 3) A lista de juntas na ordem canônica.
skin['joints'] = [by_name[n] for n in canon]
write_glb(sys.argv[3], j, binb)
print('ok: cabeça agora é a junta', canon.index('mixamorig:Head'))
