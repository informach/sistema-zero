import type { JSX } from 'react'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { EditableStudioProject as Project } from '../src/core/editableProject'
import { LESSON_DEFAULT_FEATURES } from '../src/studio/lessonFeatures'
import type { StudioHandle, StudioLessonProps } from '../src/studio/types'
import { PLAYGROUND_LESSON, PLAYGROUND_PREVIEW_SHELL_URL } from './initialQuery'

/**
 * A aula dentro do playground (`/aula?aula=<curso>/<aula>&bloco=<chave>`): monta o Estúdio da aula
 * com o projeto inicial, o nível, os blocos liberados e os modos do bloco de Estúdio do manifesto,
 * do mesmo jeito que a página da aula monta (`member-shell/.../studio-block.tsx`). Existe para os
 * e2e dos cursos gravados refazerem os gestos ensinados sem subir o app inteiro. Não grava nada:
 * `persistence="none"`.
 *
 * Os manifestos entram por `import.meta.glob` preguiçoso: só o da aula pedida é baixado, e nada
 * disto entra no pacote da lista inicial.
 */
const MANIFESTOS = import.meta.glob<{ default: unknown }>([
  '../../../docs/aulas-interativas/faisca/cade-todo-mundo/*.manifesto.json',
  '../../../docs/aulas-interativas/faisca/desafio-primeiro-jogo/*.manifesto.json',
])

// O `StudioLesson` é o `StudioCore` com os recursos da aula desligados. Aqui a aula entra pela
// MESMA entrada do editor do playground (o `StudioEditor`, o outro invólucro fino do mesmo
// núcleo) com esses mesmos recursos: um ponto de entrada a mais mudava a divisão dos pacotes e
// passava do teto do modo Blocos (`initialBundleBudget.test.ts`).
const StudioDaAula = lazy(async () => {
  const module = await import('@sistemazero/studio/editor')
  return { default: module.StudioEditor }
})

interface BlocoDeEstudio {
  key: string
  content: {
    kind: 'studio'
    initialProject: Project
    level?: StudioLessonProps['level']
    allowBlocks?: readonly string[]
    allowCategories?: readonly string[]
    allowedModes?: StudioLessonProps['allowedModes']
    allowLevelReveal?: boolean
  }
}

type Estado =
  | { fase: 'carregando' }
  | { fase: 'erro'; recado: string }
  | { fase: 'pronta'; bloco: BlocoDeEstudio }

function caminhoDoManifesto(aula: string): string | null {
  const [curso, nome] = aula.split('/')
  if (!curso || !nome) return null
  const fim = `/${curso}/${nome}.manifesto.json`
  // Aceita o nome do arquivo inteiro (`desafio-dia-1`) ou só a aula (`dia-1`, `aula-1`).
  return (
    Object.keys(MANIFESTOS).find((caminho) => caminho.endsWith(fim)) ??
    Object.keys(MANIFESTOS).find(
      (caminho) => caminho.includes(`/${curso}/`) && caminho.endsWith(`-${nome}.manifesto.json`),
    ) ??
    null
  )
}

interface BlocoSalvo {
  type: string
  id?: string
  next?: { block: BlocoSalvo }
  inputs?: Record<string, { block?: BlocoSalvo; shadow?: BlocoSalvo }>
  [chave: string]: unknown
}

/**
 * O projeto com os eventos de "Quando acontecer" repetidos (blocos de verdade, encaixados, com
 * ids novos) até passar de `alvo` blocos. Só para medir escala: mantém a forma de um jogo de
 * criança, com muitos eventos curtos. O mesmo que `scripts/profile-js-classic.ts` faz sem tela.
 */
function ampliar(projeto: Project, alvo: number): Project {
  const copia = structuredClone(projeto) as Project & {
    blocksState?: { blocks?: { blocks?: BlocoSalvo[] } }
  }
  const eventos = copia.blocksState?.blocks?.blocks?.find(
    (bloco) => bloco.type === 'sz_frame_events',
  )
  const primeiro = eventos?.inputs?.CHILDREN?.block
  if (!primeiro) throw new Error('Este projeto não tem eventos em "Quando acontecer" para repetir.')
  const molde = structuredClone(primeiro)
  let contador = 0
  const comIdsNovos = (bloco: BlocoSalvo): BlocoSalvo => {
    const novo: BlocoSalvo = { ...bloco, id: `escala${(contador++).toString(36)}` }
    if (bloco.inputs)
      novo.inputs = Object.fromEntries(
        Object.entries(bloco.inputs).map(([nome, entrada]) => [
          nome,
          {
            ...(entrada.block ? { block: comIdsNovos(entrada.block) } : {}),
            ...(entrada.shadow ? { shadow: comIdsNovos(entrada.shadow) } : {}),
          },
        ]),
      )
    if (bloco.next) novo.next = { block: comIdsNovos(bloco.next.block) }
    return novo
  }
  const contar = () => JSON.stringify(copia.blocksState).split('"type":"sz_').length - 1
  let fim = primeiro
  while (fim.next) fim = fim.next.block
  while (contar() < alvo) {
    const repetido = comIdsNovos(molde)
    fim.next = { block: repetido }
    fim = repetido
    while (fim.next) fim = fim.next.block
  }
  return copia
}

async function carregar(aula: string, chave: string | null, escala: number): Promise<Estado> {
  const caminho = caminhoDoManifesto(aula)
  const importar = caminho ? MANIFESTOS[caminho] : undefined
  if (!importar) return { fase: 'erro', recado: `Aula não encontrada: ${aula}` }
  const manifesto = (await importar()).default as { blocks?: unknown[] }
  const estudios = (manifesto.blocks ?? []).filter(
    (bloco): bloco is BlocoDeEstudio =>
      Boolean(bloco) &&
      typeof bloco === 'object' &&
      (bloco as { content?: { kind?: string } }).content?.kind === 'studio',
  )
  const bloco = chave ? estudios.find((item) => item.key === chave) : estudios[0]
  if (!bloco)
    return { fase: 'erro', recado: `Bloco de Estúdio não encontrado: ${chave ?? '(primeiro)'}` }
  if (escala <= 0) return { fase: 'pronta', bloco }
  return {
    fase: 'pronta',
    bloco: {
      ...bloco,
      content: { ...bloco.content, initialProject: ampliar(bloco.content.initialProject, escala) },
    },
  }
}

export function LessonHarness(): JSX.Element {
  const [estado, setEstado] = useState<Estado>({ fase: 'carregando' })
  const estudio = useRef<StudioHandle>(null)

  // O projeto de agora, para o e2e conferir os objetivos da parte (a página da aula lê pelo
  // mesmo `getProject` na hora de verificar e de enviar).
  useEffect(() => {
    const aula = { projeto: () => estudio.current?.getProject() ?? null }
    Object.assign(window, { __aula: aula })
    return () => {
      if ((window as { __aula?: unknown }).__aula === aula)
        delete (window as { __aula?: unknown }).__aula
    }
  }, [])

  useEffect(() => {
    let vivo = true
    const pedido = PLAYGROUND_LESSON
    if (!pedido) {
      setEstado({ fase: 'erro', recado: 'Faltou ?aula=<curso>/<aula>.' })
      return
    }
    carregar(pedido.aula, pedido.bloco, pedido.escala)
      .then((proximo) => {
        if (vivo) setEstado(proximo)
      })
      .catch((erro: unknown) => {
        if (vivo) setEstado({ fase: 'erro', recado: String(erro) })
      })
    return () => {
      vivo = false
    }
  }, [])

  if (estado.fase === 'erro') {
    return (
      <div
        role="alert"
        className="flex h-full items-center justify-center bg-sz-bg text-sm text-sz-fg"
      >
        {estado.recado}
      </div>
    )
  }
  const carregando = (
    <div
      role="status"
      className="flex h-full items-center justify-center bg-sz-bg text-sm text-sz-fg-soft"
    >
      Carregando a aula…
    </div>
  )
  if (estado.fase === 'carregando') return carregando
  const { content } = estado.bloco
  return (
    <Suspense fallback={carregando}>
      <div className="h-full" data-aula-bloco={estado.bloco.key}>
        <StudioDaAula
          ref={estudio}
          initialProject={content.initialProject}
          level={content.level}
          allowBlocks={content.allowBlocks}
          allowCategories={content.allowCategories}
          allowedModes={content.allowedModes}
          allowLevelReveal={content.allowLevelReveal}
          // Os mesmos cortes que a página da aula faz para o aluno.
          features={{ ...LESSON_DEFAULT_FEATURES, extensions: false }}
          persistence="none"
          blockUnloadWhenDirty={false}
          previewShellUrl={PLAYGROUND_PREVIEW_SHELL_URL}
        />
      </div>
    </Suspense>
  )
}
