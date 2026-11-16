import type {
  ResultadoDeViewport,
  SessaoDeCenario,
  TarefaDeViewport,
} from '@sistemazero/molda-cenarios-core'
import type { CenariosController } from './controller'
import { pedidoCenarios } from './host-http'
import type { CenarioRuntimePort } from './portas'

/** A ponte do agente chama o mesmo controller usado pelo mouse e pelo teclado. */
export function ligarSessaoHttp(
  base: string,
  editor: CenariosController,
  runtime: () => CenarioRuntimePort | null,
  aoLigar?: (id: string) => void,
) {
  const abort = new AbortController()
  let sessao: SessaoDeCenario | null = null,
    pulsando = false,
    executando = false
  const criar = async () => {
    const p = editor.getState().projeto
    if (!p) return
    sessao = await pedidoCenarios(`${base}/sessoes`, { projetoId: p.projetoId }, abort.signal)
    if (sessao) aoLigar?.(sessao.id)
  }
  const pulso = async () => {
    if (pulsando || abort.signal.aborted) return
    pulsando = true
    try {
      const s = editor.getState(),
        r = runtime()
      if (!s.projeto || !r) return
      if (!sessao) await criar()
      if (!sessao) return
      const e = r.estado()
      await pedidoCenarios(
        `${base}/sessoes/${sessao.id}/pulso`,
        {
          revisao: s.projeto.revisao,
          revisaoPronta: e.revisaoPronta,
          gesto: s.gesto,
          ocupado: s.ocupado,
          modo: e.modo,
          selecionados: s.viewport.selecionados,
        },
        abort.signal,
      )
    } catch (e) {
      if (!abort.signal.aborted) {
        sessao = null
        editor.erro(`Conexão do agente indisponível: ${e instanceof Error ? e.message : String(e)}`)
      }
    } finally {
      pulsando = false
    }
  }
  const tratar = async (t: TarefaDeViewport): Promise<ResultadoDeViewport> => {
    const p = t.pedido,
      s = editor.getState(),
      r = runtime()
    if (!s.projeto || !r) throw Error('Viewport indisponível')
    if (s.gesto || s.ocupado) throw Error('Gesto manual ou operação em andamento')
    if (s.projeto.revisao !== p.revisaoEsperada)
      throw Error(`Revisão diferente: ${s.projeto.revisao}`)
    const a = p.acao
    if (s.testando && !['estado', 'capturar', 'testar'].includes(a.tipo))
      throw Error('Retorne à edição')
    switch (a.tipo) {
      case 'camera':
        if (!r.posicionarCamera) throw Error('Runtime sem câmera de autoria')
        r.posicionarCamera(a.posicao, a.alvo)
        break
      case 'editar':
        await editor.executar(a.comandos, p.revisaoEsperada, t.id)
        break
      case 'selecionar':
        editor.viewport({ selecionados: a.ids })
        break
      case 'enquadrar':
        r.enquadrar(a.ids)
        break
      case 'ferramenta':
        editor.viewport({ ferramenta: a.ferramenta })
        break
      case 'vista':
        editor.viewport({ vista: a.vista })
        break
      case 'desfazer':
        await editor.historico('desfazer')
        break
      case 'refazer':
        await editor.historico('refazer')
        break
      case 'testar':
        await editor.teste(a.ativo, (ativo) => r.testar(ativo))
        break
      case 'capturar': {
        const blob = await r.capturar(p.revisaoEsperada)
        if (blob.size > 2 * 1024 * 1024) throw Error('Captura acima de 2 MiB')
        const imagem = await new Promise<string>((resolve, reject) => {
          const leitor = new FileReader()
          leitor.onload = () => resolve(String(leitor.result))
          leitor.onerror = () => reject(leitor.error)
          leitor.readAsDataURL(blob)
        })
        return { ok: true, revisao: p.revisaoEsperada, dados: { imagem } }
      }
      case 'estado':
        return {
          ok: true,
          revisao: s.projeto.revisao,
          dados: {
            viewport: { ...s.viewport },
            runtime: r.estado(),
            projetoId: s.projeto.projetoId,
            objetos: s.projeto.documento.instancias.length,
          },
        }
    }
    return { ok: true, revisao: editor.getState().projeto!.revisao }
  }
  const proxima = async () => {
    const s = editor.getState()
    if (!sessao || executando || s.ocupado || s.gesto || abort.signal.aborted) return
    executando = true
    try {
      const { tarefa: t } = await pedidoCenarios<{ tarefa: TarefaDeViewport | null }>(
        `${base}/sessoes/${sessao.id}/proxima`,
        undefined,
        abort.signal,
      )
      if (!t) return
      let resultado: ResultadoDeViewport
      try {
        resultado = await tratar(t)
      } catch (e) {
        resultado = {
          ok: false,
          revisao: editor.getState().projeto?.revisao ?? t.pedido.revisaoEsperada,
          erro: e instanceof Error ? e.message : String(e),
        }
      }
      await pedidoCenarios(
        `${base}/sessoes/${sessao.id}/pedidos/${t.id}/resultado`,
        resultado,
        abort.signal,
      )
    } catch (e) {
      if (!abort.signal.aborted)
        editor.erro(
          `Não foi possível confirmar o comando do agente: ${e instanceof Error ? e.message : String(e)}`,
        )
    } finally {
      executando = false
    }
  }
  const a = setInterval(() => void pulso(), 2000),
    b = setInterval(() => void proxima(), 1000)
  void pulso()
  return () => {
    if (sessao)
      void fetch(`${base}/sessoes/${sessao.id}/fechar`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: '{}',
        keepalive: true,
      }).catch(() => {})
    abort.abort()
    clearInterval(a)
    clearInterval(b)
  }
}
