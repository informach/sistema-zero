import { encodePng } from '../export/png'
import { readObjBundle } from '../import/objBundle'
import { convertObjDocument } from '../import/objNativeDocument'
import type { ObjImportResult } from '../workers/objImportProtocol'
import type { ObjImportRequest } from '../workers/objImportRequest'

export const objText = (value: string) => new TextEncoder().encode(value)
export function objImportFixture(): ObjImportRequest {
  return {
    documentId: 'obj-target',
    revision: 7,
    requestId: 2,
    identity: { id: 'obj-target', name: 'Minha criação', createdAt: 1, updatedAt: 2 },
    entryPath: 'project/model.obj',
    bytes: objText(
      'mtllib m/a.mtl\nmtllib m/empty.mtl\n' +
        'v 0 0 0 2\nv 1 0 0\nv 0 1 0\nv 5 5 5\n' +
        'vt 0 0 .5\nvt 1 0\nvt 0 1\nvn 0 0 1\n' +
        'o Corpo\ng front team\ns 1\nusemtl A\nf 1/1/1 2/2/1 3/3/1 1/1/1\n' +
        'f 1 2 3\np 1\nl 1/1 1/1 2/2\nusemtl Missing\nf 1 2 3\no Empty\n',
    ),
    files: [
      {
        path: 'project/m/a.mtl',
        bytes: objText(
          'newmtl A\nKd .2 .4 .7\nKd 1 1 1\nd .5\nTr .1\nNs 100\nillum 4\nKa .1\n' +
            'map_Kd -o 0 0 1 -s 1 1 2 -blendu on -blendu off -boost 2 -texres 1 -colorspace srgb color.png\n' +
            'norm color.png\nmap_Tr -imfchan m alpha.png\nmap_Pr -imfchan l color.png\nmap_Pm -imfchan g color.png\nmap_Ka color.png\n' +
            'newmtl A\nKd 1 0 0\n',
        ),
      },
      { path: 'project/m/empty.mtl', bytes: objText('# empty\n') },
      { path: 'project/m/color.png', bytes: encodePng(Uint8Array.of(64, 124, 231, 128), 1, 1) },
      {
        path: 'project/m/alpha.png',
        bytes: encodePng(Uint8Array.of(255, 255, 255, 128, 0, 0, 0, 255), 2, 1),
      },
      { path: 'project/unused.bin', bytes: Uint8Array.of(99) },
    ],
    options: {
      materials: { libraryMode: 'all', duplicateMaterials: 'first', missingMaterials: 'default' },
      appearance: {
        base: {
          rgbSpace: 'linear',
          repeatedProperties: 'first',
          opacityConflict: 'd',
          phongRoughness: 'blender',
          illumination: 'pbr',
        },
        textures: {
          colorSpace: 'srgb',
          scalarSpace: 'linear',
          repeatedOptions: 'last',
          unsupportedMaps: 'omit',
          transparencyMap: 'transparency',
        },
      },
      images: {
        colorAlpha: 'multiply',
        normalY: 'positive',
        doubleSided: false,
        opacitySampling: 'nearest',
      },
    },
  }
}
export function directObjImport(
  input: ObjImportRequest,
): Extract<ObjImportResult, { status: 'ready' }> {
  const source = readObjBundle(input.bytes, input.files, input.entryPath)
  if (source.status !== 'ready') throw new Error(`Missing fixture: ${source.paths.join(', ')}`)
  return { status: 'ready', ...convertObjDocument(source, input.identity, input.options) }
}
