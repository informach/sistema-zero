import type { Project } from '#core'
import { buildClassicFileMap, buildProFileMap, type ExportFileMap } from './fileMap'
import { identityMinifiers } from './minify'
import { sanitizeBaseFilename } from './sanitize'
import { zipFiles } from './zip'

export interface SourceFilesResult {
  files: ExportFileMap
  /** Avisos não-fatais (ex.: um extra .ts que não compilou). */
  warnings: string[]
}

export interface SourceExportResult {
  blob: Blob
  filename: string
  warnings: string[]
}

/**
 * LEIA-ME amigável incluído no ZIP de fonte. Explica que é o código do projeto e
 * como rodá-lo localmente. Texto puro (sem markdown), linguagem para crianças.
 * `abrir o index.html direto` (file://) frequentemente NÃO funciona — módulos e a
 * busca de assets exigem um servidor — por isso recomendamos a extensão Live
 * Server do VSCode (ou `npx serve`).
 */
const LEIA_ME = `Seu projeto do Sistema Zero
============================

Aqui está o código do seu projeto para você continuar criando no seu computador
(por exemplo, no VSCode).

Como abrir e testar:
1. Instale o VSCode (https://code.visualstudio.com) se ainda não tiver.
2. Abra ESTA pasta no VSCode (Arquivo > Abrir Pasta).
3. Para ver o projeto rodando, use um servidor local. O jeito mais fácil:
   - Instale a extensão "Live Server" no VSCode.
   - Clique com o botão direito no arquivo "index.html" e escolha "Open with Live Server".
   (Ou, se você usa terminal: rode "npx serve" dentro desta pasta.)

Importante: abrir o "index.html" com dois cliques (direto no navegador) pode não
funcionar — alguns recursos só carregam por um servidor. Por isso use o Live Server.

O que tem aqui:
- index.html  -> a página do seu projeto
- script.js   -> a programação do seu jogo/app
- style.css   -> as cores e o visual (se você usou)
- sz-ext/     -> peças prontas das extensões (ex.: o motor do Jogo 2D)
- sz-assets.js-> suas imagens e sons, já embutidos no projeto (se você adicionou algum)
- sz-audio.js -> o toca-sons dos blocos de 🔊 Som

Divirta-se programando! 🚀
`

/**
 * Monta os arquivos de FONTE (legíveis, não minificados) de um projeto, prontos
 * para o aluno continuar no VSCode — o irmão "para editar" do `exportProject`
 * (que faz o pacote de deploy). Reusa os MESMOS builders, sem minificar:
 *
 *  - clássico: `buildClassicFileMap` com `identityMinifiers` já entrega um site
 *    completo e executável sob `public/` (index.html + style.css + script.js +
 *    `sz-ext/<id>.js` dos runtimes de extensão + `sz-assets.js` das imagens). As
 *    referências no HTML são RELATIVAS, então só removemos o prefixo `public/` e
 *    os arquivos ficam na RAIZ do ZIP — uma pasta limpa para abrir no editor.
 *  - pro: `buildProFileMap` já é a árvore Vite (fonte real); usamos como está.
 *
 * Acrescenta um `LEIA-ME.txt` explicando como rodar. NÃO inclui Dockerfile/
 * railway.json (isso é coisa do pacote de deploy, não do "continuar editando").
 */
export async function buildSourceFiles(project: Project): Promise<SourceFilesResult> {
  const isPro = project.kind === 'pro' && !!project.tree
  const warnings: string[] = []
  const files: ExportFileMap = {}

  if (isPro) {
    const built = buildProFileMap(project)
    warnings.push(...built.warnings)
    Object.assign(files, built.files)
  } else {
    const built = await buildClassicFileMap(project, identityMinifiers)
    warnings.push(...built.warnings)
    // Todas as saídas do builder clássico vêm sob `public/`; tiramos o prefixo
    // para que o ZIP abra direto numa pasta de projeto (sem um nível `public/`).
    for (const [path, content] of Object.entries(built.files)) {
      const flat = path.startsWith('public/') ? path.slice('public/'.length) : path
      files[flat] = content
    }
  }

  files['LEIA-ME.txt'] = LEIA_ME
  return { files, warnings }
}

/**
 * Gera o ZIP de FONTE do projeto e devolve o Blob + nome de arquivo. Diferente do
 * `exportProject`, o nome NÃO leva `-deploy` (é o projeto para continuar, não para
 * publicar).
 */
export async function exportProjectSource(project: Project): Promise<SourceExportResult> {
  const { files, warnings } = await buildSourceFiles(project)
  const bytes = await zipFiles(files)
  // Cópia para um Uint8Array com ArrayBuffer "comum" (o retorno do fflate pode ser
  // SharedArrayBuffer, que o Blob recusa) — mesmo cuidado do exportProject.
  const blobBytes = new Uint8Array(bytes.byteLength)
  blobBytes.set(bytes)
  const blob = new Blob([blobBytes], { type: 'application/zip' })
  return { blob, filename: `${sanitizeBaseFilename(project.name)}.zip`, warnings }
}
