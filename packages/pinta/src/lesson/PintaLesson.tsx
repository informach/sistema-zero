/**
 * `<PintaLesson>` — o Pinta DENTRO de uma aula: um desenho só, já criado pelo professor, sem
 * galeria atrás. É o análogo do `StudioLesson`, e nasce com defaults restritos.
 *
 * O que ele NÃO faz, e por quê:
 * - **Não mostra a galeria.** Ela é do PERFIL inteiro; num bloco de aula a criança veria (e
 *   poderia apagar) todos os desenhos dela. O `initialAssetId` do `<PintaApp>` não serve: é só um
 *   empurrão no mount, com pisca de galeria e com o botão voltar sempre presente.
 * - **Não tem `onSave`.** O plano previa um, espelhando o Estúdio, mas ali existe uma ação
 *   explícita de salvar; aqui o salvamento é automático, e `onSave` seria um segundo nome para o
 *   `onChange`. Quem quer salvar na hora chama `handle.save()` e recebe o resultado.
 */
import type { JSX, Ref } from 'react'
import { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { type PintaAppContextValue, PintaAppProvider } from '../components/appContext'
import { EditorScreen } from '../components/editor/EditorScreen'
import { ToastProvider } from '../components/ui/Toast'
import { COPY } from '../core/copy'
import { type PintaAsset, sanitizePintaAsset } from '../core/project'
import type { PintaHostAdapter } from '../core/types'
import { createClipboardStore } from '../state/clipboardStore'
import type { PintaEditorStore } from '../state/editorStore'
import { createGalleryStore } from '../state/galleryStore'
import { createMemoryPersistence } from '../state/memoryPersistence'
import { createPaletteLibraryStore } from '../state/paletteLibraryStore'
import { createPintaPersistence, type PintaPersistence } from '../state/persistence'

/** O que o host pode ligar de volta. Tudo nasce DESLIGADO: numa aula, menos é mais. */
export interface PintaLessonFeatures {
  /** Deixa a criança mudar o tamanho do desenho. Default: `false` (o tamanho é do professor). */
  resize?: boolean
  /** Botão "Baixar" do topo (PNG/ZIP/SVG). Default: `false` — o bloco tem o download dele. */
  export?: boolean
}

export interface PintaHandle {
  /** O desenho VIVO (inclui edição ainda não gravada). */
  getAsset(): PintaAsset
  /** Força a gravação pendente. `false` = não confirmou (o host não deve enviar). */
  save(): Promise<boolean>
  /**
   * Troca o desenho aberto — é como o bloco "sincroniza com o enviado".
   *
   * ⚠️ Recusa (devolve `false`) um asset com id DIFERENTE: o editor é montado por id, e trocar a
   * identidade por baixo dele deixaria a galeria apontando para um desenho que não existe mais.
   * Para abrir outro desenho, remonte o `<PintaLesson>` com outro `initialAsset`.
   */
  replaceAsset(asset: PintaAsset): boolean
}

export interface PintaLessonProps {
  /** O desenho que o professor configurou (tipo e tamanho já decididos). */
  initialAsset: PintaAsset
  /**
   * `'none'` (default) = memória: nada toca o navegador e quem guarda é o host, pelo `onChange`.
   * Um adapter próprio = o armazenamento do bloco (por bloco + perfil).
   *
   * ⚠️ `'local'` grava na galeria do PERFIL. Serve para playground e uso solto; num bloco de aula
   * ele fura o isolamento entre o desenho da aula e os desenhos pessoais da criança.
   */
  persistence?: 'none' | 'local' | PintaPersistence
  /** Cada revisão confirmada. É por aqui que o host salva no backend. */
  onChange?: (asset: PintaAsset) => void
  /** Curadoria da caixa de ferramentas (ver `core/toolCuration.ts`). Vazia = tudo. */
  allowTools?: readonly string[]
  features?: PintaLessonFeatures
  theme?: 'light' | 'dark'
  handleRef?: Ref<PintaHandle | null>
}

function resolvePersistence(
  mode: PintaLessonProps['persistence'],
  initialAsset: PintaAsset,
): PintaPersistence {
  if (mode === 'local') return createPintaPersistence()
  if (mode && mode !== 'none') return mode
  return createMemoryPersistence([initialAsset])
}

export function PintaLesson({
  initialAsset,
  persistence,
  onChange,
  allowTools,
  features,
  theme = 'light',
  handleRef,
}: PintaLessonProps): JSX.Element {
  /**
   * Resolvido UMA vez, e é isso que fixa o desenho da montagem inteira.
   *
   * ⚠️ O `initialAsset` é SANEADO aqui, na borda: ele vem do backend, e o `createEditorStore` não
   * sanea nada. Um desenho malformado entraria, seria editado, e sumiria no próximo load — o modo
   * de falha mais caro deste pacote (dimensão declarada que não casa com o bitmap já custou isso
   * uma vez). `null` = recusa explicada, nunca tela branca.
   *
   * ⚠️ Trocar a prop `initialAsset` depois do mount NÃO troca o desenho, de propósito: o host que
   * monta `initialAsset={...}` inline passaria um objeto novo a cada render. Para abrir outro
   * desenho, remonte com `key`.
   */
  const [boot] = useState(() => {
    const seed = sanitizePintaAsset(initialAsset)
    if (!seed) return null
    const resolved = resolvePersistence(persistence, seed)
    return {
      seed,
      persistence: resolved,
      gallery: createGalleryStore(resolved),
      // Copiar/colar dentro do desenho da aula, SÓ em memória: o desenho da aula é isolado
      // da galeria pessoal, e o espelho em localStorage é compartilhado pela origem inteira.
      clipboard: createClipboardStore({ mirror: null }),
      // "Minhas paletas" fica FORA da aula (mesma régua do clipboard): a
      // paleta EMBUTIDA no asset continua funcionando — é o que viaja.
      paletteLibrary: createPaletteLibraryStore(resolved, { disabled: true }),
    }
  })
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(boot ? 'loading' : 'error')
  const editorRef = useRef<PintaEditorStore | null>(null)

  /**
   * Semeia o desenho da aula no armazenamento e só então monta o editor.
   *
   * ⚠️ A semeadura é CONDICIONAL: se o armazenamento já conhece o id, o que está lá é o que a
   * criança desenhou, e sobrescrever com o `seed` apagaria a aula inteira dela. É a mesma ordem de
   * seed do bloco do Estúdio (rascunho vence o inicial).
   */
  useEffect(() => {
    if (!boot) return
    let vivo = true
    void (async () => {
      try {
        await boot.gallery.getState().load()
        const conhecido = boot.gallery.getState().assets.some((a) => a.id === boot.seed.id)
        if (!conhecido) {
          await boot.persistence.persistAsset(boot.seed)
          boot.gallery.getState().absorbMany([boot.seed])
        }
        if (vivo) setStatus('ready')
      } catch {
        // ⚠️ Sem este catch a promessa rejeitava e a criança ficava com um retângulo BRANCO para
        // sempre: `setStatus` nunca chegava a rodar. O armazenamento do host pode falhar (rede,
        // cota), e falhar calado é o pior desfecho.
        if (vivo) setStatus('error')
      }
    })()
    return () => {
      vivo = false
    }
  }, [boot])

  useImperativeHandle(
    handleRef,
    () => ({
      getAsset: () => editorRef.current?.getState().asset ?? boot?.seed ?? initialAsset,
      async save() {
        const result = await editorRef.current?.getState().flush()
        return result?.ok ?? false
      },
      replaceAsset(asset) {
        if (!boot || asset.id !== boot.seed.id) return false
        const editor = editorRef.current
        if (!editor) return false
        editor.getState().replace(asset)
        return true
      },
    }),
    // `initialAsset` entra só como último recurso do `getAsset` antes do editor montar.
    [boot, initialAsset],
  )

  // Defaults restritos: numa aula, menos é mais. O host religa pelo `features`.
  const allowResize = features?.resize ?? false
  const allowExport = features?.export ?? false

  const adapter: PintaHostAdapter = useMemo(
    () => ({ theme, ...(onChange ? { onChange } : {}), ...(allowTools ? { allowTools } : {}) }),
    [theme, onChange, allowTools],
  )

  const context = useMemo<PintaAppContextValue | null>(
    () =>
      !boot
        ? null
        : {
            adapter,
            gallery: boot.gallery,
            persistence: boot.persistence,
            clipboard: boot.clipboard,
            paletteLibrary: boot.paletteLibrary,
            // Não há para onde navegar: o bloco é UM desenho. Os quatro pontos de navegação da galeria
            // existem no contrato do contexto e aqui não fazem nada, de propósito.
            openAsset: () => {},
            closeEditor: () => {},
            takeInitialIntent: () => null,
            initialIntentVersion: 0,
            requestInitialIntent: () => {},
            takeInitialAssetId: () => null,
            lesson: { allowResize, allowExport },
            onEditorReady: (editor) => {
              editorRef.current = editor
            },
          },
    [adapter, boot, allowResize, allowExport],
  )

  return (
    <div
      data-pinta-theme={theme}
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-pin-bg text-pin-text"
    >
      {status === 'error' || !boot || !context ? (
        // Desenho quebrado é problema de autoria e a criança não tem o que fazer com ele; falha do
        // armazenamento ela resolve recarregando. São recados diferentes de propósito.
        <p role="alert" className="m-auto max-w-80 p-6 text-center text-pin-text">
          {boot ? COPY.gallery.lessonLoadError : COPY.gallery.lessonBrokenAsset}
        </p>
      ) : (
        <PintaAppProvider value={context}>
          <ToastProvider>
            {status === 'ready' ? (
              <EditorScreen key={boot.seed.id} assetId={boot.seed.id} />
            ) : (
              <p role="status" className="m-auto p-6 text-pin-text-soft">
                {COPY.gallery.loading}
              </p>
            )}
          </ToastProvider>
        </PintaAppProvider>
      )}
    </div>
  )
}
