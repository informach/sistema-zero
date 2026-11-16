import {
  DocumentoDeCenarioSchema,
  type ModeloDeCatalogo,
  type RevisaoDeCenario,
} from '@sistemazero/molda-cenarios-core'
import type {
  CenarioRuntimeMontagem,
  EstadoDeViewport,
} from '@sistemazero/molda-cenarios-core/runtime'

const host = document.getElementById('jogo')!
try {
  const r = await fetch('/api/cenario-aplicado', { cache: 'no-store' })
  if (r.status === 404) {
    // Nenhuma revisão foi aplicada: conserva o ensaio original, sem escolher um rascunho.
    await import('./arquipelago-macro')
  } else {
    if (!r.ok) throw Error(await r.text())
    const { revisao, modelos } = (await r.json()) as {
      revisao: RevisaoDeCenario
      modelos: ModeloDeCatalogo[]
    }
    const documento = DocumentoDeCenarioSchema.parse(revisao.documento)
    const estado: EstadoDeViewport = {
      selecionados: [],
      ferramenta: 'selecionar',
      vista: 'perspectiva',
      encaixe: false,
      inspecao: false,
      pincel: { tipo: 'elevar', raio: 8, valor: 1, intensidade: 0.3 },
    }
    const runtimeUrl = 'http://127.0.0.1:4533/runtime/entrada.js'
    const runtime = (await import(/* @vite-ignore */ runtimeUrl)) as CenarioRuntimeMontagem
    const port = await runtime.montar(host, {
      documento,
      revisao: revisao.revisao,
      catalogo: modelos,
      urlDaArte: (m) => `/api/cenario-arte/${m.digest}.glb`,
      estado,
      aoSelecionar: () => {},
      aoGesto: () => {},
      aoMedir: () => {},
      aoEditar: async () => {
        throw Error('Edite esta revisão no Molda — Cenários')
      },
    })
    await port.atualizar(documento, estado, revisao.revisao)
    await port.testar(true)
    const aviso = document.createElement('div')
    aviso.style.cssText =
      'position:absolute;left:12px;top:12px;z-index:10;padding:9px 14px;background:#fff8e8ed;color:#303651;border-radius:12px;font:14px system-ui'
    aviso.textContent = `${documento.nome} · revisão ${revisao.revisao} · ensaio sem progresso de conta`
    host.append(aviso)
    window.addEventListener('pagehide', () => port.desmontar(), { once: true })
  }
} catch (e) {
  host.textContent = e instanceof Error ? e.message : String(e)
  host.style.cssText = 'padding:24px;color:#fff;font:16px system-ui'
}
