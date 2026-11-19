import { resolverInicioDaCena } from '@sistemazero/molda-cenarios-motor/runtime'
import { REVISION } from 'three'
import { carregarCena3DDoProjeto } from './scene3d'
import { criarInstaladorDeCenas3D } from './scene3dCanvas'
import { type ArquivoDeCenaPro, criarFonteDeCenasPro } from './scene3dProArquivos'
import { THREE_VERSION } from './threeRuntimeContract'

/** Native Pro adapter. Same loader/installer; no global SDK replacement or authored scene. */
export function criarSDKPro(entrada: readonly ArquivoDeCenaPro[], baseURL: string) {
  if (REVISION !== THREE_VERSION.split('.')[1])
    throw Error(
      `Este cenário requer Three ${THREE_VERSION}. As dependências do seu projeto foram preservadas.`,
    )
  const vida = new AbortController(),
    fonte = criarFonteDeCenasPro(entrada, baseURL, vida.signal)
  const carregar = async (
    id: string,
    sinal: AbortSignal,
    opcoes?: Parameters<typeof carregarCena3DDoProjeto>[3],
  ) =>
    carregarCena3DDoProjeto(
      id,
      await fonte.carregar(id, sinal),
      AbortSignal.any([sinal, vida.signal]),
      opcoes,
    )
  const ligacoes = criarInstaladorDeCenas3D(carregar)
  const encerrar = () => {
    window.removeEventListener('pagehide', aoSair, true)
    vida.abort()
    ligacoes.descartar()
    fonte.limpar()
  }
  function aoSair(evento: PageTransitionEvent) {
    if (!evento.persisted) encerrar()
  }
  window.addEventListener('pagehide', aoSair, { capture: true })
  return Object.freeze({
    carregar,
    instalar: ligacoes.instalar,
    instalado: ligacoes.instalado,
    inicio: resolverInicioDaCena,
    encerrar,
  })
}
