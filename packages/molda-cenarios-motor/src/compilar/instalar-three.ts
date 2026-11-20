import type { Scene } from 'three'
import type { CenaNoThree, OpcoesDoRuntimeCompilado } from './runtime-three'

type Carregar = (
  id: string,
  sinal: AbortSignal,
  opcoes?: OpcoesDoRuntimeCompilado,
) => Promise<CenaNoThree>
const campos = [
  'background',
  'environment',
  'fog',
  'backgroundIntensity',
  'backgroundBlurriness',
  'environmentIntensity',
] as const
type Campo = (typeof campos)[number]

function ambiente(cena: Scene) {
  return {
    valores: {
      background: cena.background,
      environment: cena.environment,
      fog: cena.fog,
      backgroundIntensity: cena.backgroundIntensity,
      backgroundBlurriness: cena.backgroundBlurriness,
      environmentIntensity: cena.environmentIntensity,
    },
    fundo: cena.backgroundRotation.clone(),
    entorno: cena.environmentRotation.clone(),
  }
}
type Ambiente = ReturnType<typeof ambiente>
function copiarCampo<K extends Campo>(cena: Pick<Scene, Campo>, fonte: Ambiente, campo: K) {
  cena[campo] = fonte.valores[campo]
}
function aplicar(cena: Scene, fonte: Ambiente) {
  for (const campo of campos) copiarCampo(cena, fonte, campo)
  cena.backgroundRotation.copy(fonte.fundo)
  cena.environmentRotation.copy(fonte.entorno)
}
function restaurar(cena: Scene, esperado: Ambiente, original: Ambiente) {
  for (const campo of campos)
    if (cena[campo] === esperado.valores[campo]) copiarCampo(cena, original, campo)
  if (cena.backgroundRotation.equals(esperado.fundo)) cena.backgroundRotation.copy(original.fundo)
  if (cena.environmentRotation.equals(esperado.entorno))
    cena.environmentRotation.copy(original.entorno)
}
function conservarAlteracoes(original: Ambiente, atual: Ambiente, esperado: Ambiente) {
  for (const campo of campos)
    if (atual.valores[campo] !== esperado.valores[campo])
      copiarCampo(original.valores, atual, campo)
  if (!atual.fundo.equals(esperado.fundo)) original.fundo.copy(atual.fundo)
  if (!atual.entorno.equals(esperado.entorno)) original.entorno.copy(atual.entorno)
}

interface Entrada<Extra extends object> {
  handle: CenaNoThree & Extra
  ambienteCompleto: boolean
}
interface Pendente {
  controle: AbortController
}
interface Estado<Extra extends object> {
  alvo: Scene
  original: Ambiente
  ativo?: Entrada<Extra>
  pendente?: Pendente
}

/** Owns only imported bases. The caller retains its renderer, loop and authored objects. */
export function criarInstaladorDeCenasThree<Extra extends object>(
  carregar: Carregar,
  completar: (cena: CenaNoThree, ativa: () => boolean) => Extra,
) {
  const estados = new Map<Scene, Estado<Extra>>()
  let encerrado = false
  const liberarEstado = (estado: Estado<Extra>) => {
    if (!estado.ativo && !estado.pendente && estados.get(estado.alvo) === estado)
      estados.delete(estado.alvo)
  }

  async function instalar(
    id: string,
    alvo: Scene,
    sinal: AbortSignal,
    opcoes: OpcoesDoRuntimeCompilado = {},
  ): Promise<CenaNoThree & Extra> {
    sinal.throwIfAborted()
    if (encerrado) throw Error('A sessão de cenários foi encerrada.')
    if (!alvo?.isScene) throw Error('Escolha uma cena Three.js para receber o cenário.')
    const capturadas = { ...opcoes }
    let estado = estados.get(alvo)
    if (!estado) {
      estado = { alvo, original: ambiente(alvo) }
      estados.set(alvo, estado)
    }
    const vigente = estado,
      anteriorPendente = vigente.pendente,
      pendente: Pendente = { controle: new AbortController() }
    vigente.pendente = pendente
    anteriorPendente?.controle.abort()
    let resultado: CenaNoThree | undefined,
      entrada: Entrada<Extra> | undefined,
      entregue = false,
      solto = false
    const soltar = () => {
      if (solto) return
      solto = true
      sinal.removeEventListener('abort', cancelar)
      pendente.controle.abort()
      if (resultado && entrada && vigente.ativo === entrada) {
        vigente.ativo = undefined
        if (entrada.ambienteCompleto) restaurar(alvo, ambiente(resultado.cena), vigente.original)
      }
      resultado?.cena.removeFromParent()
      try {
        resultado?.descartar()
      } finally {
        liberarEstado(vigente)
      }
    }
    const cancelar = () => {
      pendente.controle.abort(sinal.reason)
      if (entregue) soltar()
    }
    sinal.addEventListener('abort', cancelar, { once: true })
    try {
      sinal.throwIfAborted()
      resultado = await carregar(id, pendente.controle.signal, capturadas)
      pendente.controle.signal.throwIfAborted()
      if (encerrado || vigente.pendente !== pendente)
        throw new DOMException('O carregamento do cenário foi cancelado.', 'AbortError')
      const preparado = ambiente(resultado.cena),
        antes = ambiente(alvo),
        anterior = vigente.ativo,
        handle: CenaNoThree & Extra = {
          ...resultado,
          ...completar(resultado, () => !solto),
          descartar: soltar,
        }
      entrada = { handle, ambienteCompleto: capturadas.ambiente !== 'luzes-locais' }
      try {
        alvo.add(resultado.cena)
        if (entrada.ambienteCompleto) aplicar(alvo, preparado)
        else if (anterior?.ambienteCompleto)
          restaurar(alvo, ambiente(anterior.handle.cena), vigente.original)
        pendente.controle.signal.throwIfAborted()
      } catch (erro) {
        resultado.cena.removeFromParent()
        aplicar(alvo, antes)
        throw erro
      }
      if (anterior?.ambienteCompleto)
        conservarAlteracoes(vigente.original, antes, ambiente(anterior.handle.cena))
      else vigente.original = antes
      vigente.ativo = entrada
      vigente.pendente = undefined
      entregue = true
      anterior?.handle.descartar()
      return handle
    } finally {
      if (vigente.pendente === pendente) vigente.pendente = undefined
      if (!entregue) soltar()
      liberarEstado(vigente)
    }
  }

  function descartar() {
    if (encerrado) return
    encerrado = true
    for (const estado of [...estados.values()]) {
      estado.pendente?.controle.abort()
      estado.ativo?.handle.descartar()
    }
    estados.clear()
  }
  const instalado = (alvo: Scene): (CenaNoThree & Extra) | undefined =>
    estados.get(alvo)?.ativo?.handle
  return { instalar, instalado, descartar }
}
