// Os três arquivos derivados dos cenários do Molda no Pro (R3 da revisão de 20/11/2026). O pedido
// traz o módulo, o runtime e os tipos como material; aqui, na pasta do projeto, o runtime e os
// tipos são trocados pelos desta imagem e o módulo é escrito de novo, pelo mesmo modelo do
// Estúdio, só com os dados das cenas. Nenhum texto executável do pedido chega ao build.
import { readFile, writeFile } from 'node:fs/promises'
import {
  readStudioProScene3DModule,
  renderStudioProScene3DModule,
  SCENE3D_PRO_RUNTIME,
  SCENE3D_PRO_RUNTIME_META,
  SCENE3D_PRO_TYPES,
  STUDIO_PRO_SCENE3D_MODULE,
  STUDIO_PRO_SCENE3D_RUNTIME,
  STUDIO_PRO_SCENE3D_TYPES,
} from './scene3d-pro.generated.mjs'

const read = (path) =>
  readFile(path, 'utf8').then(
    (text) => text,
    () => null,
  )

const module = await read(STUDIO_PRO_SCENE3D_MODULE)
if (module !== null) {
  const materials = readStudioProScene3DModule(module)
  if (materials === null) {
    console.error('O módulo dos cenários não segue o modelo do Estúdio.')
    process.exit(2)
  }
  await writeFile(
    STUDIO_PRO_SCENE3D_MODULE,
    renderStudioProScene3DModule(materials, SCENE3D_PRO_RUNTIME_META.sha256),
  )
}
if (module !== null || (await read(STUDIO_PRO_SCENE3D_RUNTIME)) !== null)
  await writeFile(STUDIO_PRO_SCENE3D_RUNTIME, SCENE3D_PRO_RUNTIME)
if (module !== null || (await read(STUDIO_PRO_SCENE3D_TYPES)) !== null)
  await writeFile(STUDIO_PRO_SCENE3D_TYPES, SCENE3D_PRO_TYPES)
