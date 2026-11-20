import { flushSync, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Scene } from 'three'
import { useJogo } from '../estado/contexto'
import { CORPO } from '../sistemas/corpo'
import type { TerritorioId } from '../sistemas/geografia-do-arquipelago'
import type { MemoriaDePublicacoes } from '../sistemas/ler-cenario-publicado'
import {
  chaveDaRetomada,
  codificarRetomadaDoCenario,
  lerRetomadaDoCenario,
} from '../sistemas/retomada-do-cenario'
import { criarCarregadorPublicado } from './carregar-cenario-publicado'
import { aquecerNoArranjoFinal, prepararGpuDaFaisca } from './faisca/preparar-gpu'
import type { CenarioPublicadoPronto } from './preparar-cenario-publicado'
import { usarRecorteLocal } from './recorte-local'

/** Consome somente publicações fixas da plataforma; o salvamento é exclusivo do ensaio local. */
export function useCenarioPublicado(
  /** `null`: esta vaga ainda não tem ilha (nada é carregado). */
  ilha: TerritorioId | null,
  tentativa: number,
  aoMudar: (p: CenarioPublicadoPronto | null) => void,
  aoErro: (erro: string) => void,
  opcoes: {
    /** Subcena desta vaga (duas ilhas publicadas convivem, cada uma na sua). */
    alvo?: Scene
    memoria?: MemoriaDePublicacoes
    /**
     * Cada mudança relê o perfil publicado (ela voltou à ilha): a mesma versão continua
     * instalada, sem baixar nem preparar nada; uma versão nova entra.
     */
    conferencia?: number
  } = {},
) {
  const { plataforma, rastro, pedidos, movimento } = useJogo(),
    { gl, scene, camera } = useThree(),
    porta = plataforma.cenarios
  const [carregador, setCarregador] = useState<ReturnType<typeof criarCarregadorPublicado> | null>(
      null,
    ),
    [pronto, setPronto] = useState<CenarioPublicadoPronto | null>(null)
  const chegadas = useMemo(
    () => new WeakMap<CenarioPublicadoPronto, { x: number; y: number; z: number }>(),
    [],
  )
  // A posição guardada vale UMA vez por publicação nesta montagem: voltar à ilha depois de
  // cruzar a divisa não leva a criança de volta ao ponto de minutos atrás (nem ao início).
  const retomadasUsadas = useMemo(() => new Set<string>(), []),
    ultimoPontoSeguro = useRef<{ x: number; y: number; z: number } | null>(null),
    esperaDestaVaga = useRef(false),
    instalada = useRef<CenarioPublicadoPronto | null>(null)
  const conferencia = opcoes.conferencia ?? 0
  const pedido = useMemo(() => ({ ilha, tentativa, conferencia }), [ilha, tentativa, conferencia])
  useEffect(() => {
    if (!porta) return
    const liberarRecorte = usarRecorteLocal(gl),
      novo = criarCarregadorPublicado({
        porta,
        alvo: opcoes.alvo ?? scene,
        ...(opcoes.memoria ? { memoria: opcoes.memoria } : {}),
        foco: () => rastro,
        maxTextura: gl.capabilities.maxTextureSize,
        async prepararGpu(p, sinal) {
          // Texturas e programas da cena nova, em paralelo, com as luzes das duas cenas.
          await prepararGpuDaFaisca(gl, p.cena, camera, { alvo: scene })
          sinal.throwIfAborted()
          // Os materiais do jogo que já estão na tela, com as luminárias novas contadas.
          await gl.compileAsync(scene, camera, p.cena)
          sinal.throwIfAborted()
          // As variantes com planos de recorte só nascem desenhando: fora da tela, antes da troca.
          aquecerNoArranjoFinal(gl, scene, p.cena, camera)
        },
        antesDeInstalar(novo) {
          let guardada = null
          // A vizinha carregada antes da hora (ela ainda está na outra ilha) não puxa a criança
          // para a posição guardada dela: a retomada só vale com ela dentro desta publicação.
          if (
            novo.regiao.contem(rastro.x, rastro.z) &&
            !retomadasUsadas.has(chaveDaRetomada(novo.publicacao))
          )
            try {
              guardada = lerRetomadaDoCenario(
                localStorage.getItem(chaveDaRetomada(novo.publicacao)),
                novo.publicacao,
              )
            } catch (erro) {
              aoErro(erro instanceof Error ? erro.message : String(erro))
            }
          const candidato = guardada ?? rastro,
            noTerreno =
              novo.regiao.contem(candidato.x, candidato.z) &&
              (novo.alturas?.(candidato.x, candidato.z) ?? 1) > 0
          if (guardada || noTerreno) {
            const chegada = novo.chegada({ ...candidato, y: candidato.y - CORPO.doCentroAoPe })
            novo.atualizarDetalhe(chegada)
            chegadas.set(novo, chegada)
          }
        },
      })
    setCarregador(novo)
    return () => {
      novo.descartar()
      liberarRecorte()
      if (esperaDestaVaga.current) pedidos.chaoChegando.delete('cenario-publicado')
      esperaDestaVaga.current = false
      instalada.current = null
      // A cena descartada não pode continuar montada nos sistemas do jogo.
      setPronto(null)
      aoMudar(null)
    }
  }, [
    porta,
    gl,
    scene,
    camera,
    rastro,
    pedidos,
    chegadas,
    aoErro,
    retomadasUsadas,
    aoMudar,
    opcoes.alvo,
    opcoes.memoria,
  ])
  useEffect(() => {
    if (!carregador || !pedido.ilha) return
    let vigente = true
    carregador
      .carregar(pedido.ilha)
      .then((novo) => {
        if (!vigente) return
        // A mesma cena (ela voltou e nada foi publicado): nada muda, nem o ponto seguro.
        if (novo !== null && novo === instalada.current) return
        instalada.current = novo
        ultimoPontoSeguro.current = null
        if (novo) {
          retomadasUsadas.add(chaveDaRetomada(novo.publicacao))
          // A chegada vale uma vez, na instalação.
          const chegada = chegadas.get(novo)
          chegadas.delete(novo)
          if (chegada) {
            pedidos.teleporte = chegada
            pedidos.chaoChegando.add('cenario-publicado')
            esperaDestaVaga.current = true
          }
        } else if (esperaDestaVaga.current) {
          // Só solta a espera que esta vaga pôs: a outra vaga pode estar esperando o chão dela.
          pedidos.chaoChegando.delete('cenario-publicado')
          esperaDestaVaga.current = false
        }
        flushSync(() => {
          setPronto(novo)
          aoMudar(novo)
        })
      })
      .catch((erro: unknown) => {
        if (vigente) aoErro(erro instanceof Error ? erro.message : String(erro))
      })
    return () => {
      vigente = false
    }
  }, [carregador, pedido, pedidos, aoMudar, aoErro, chegadas, retomadasUsadas])
  // Só um ponto seguro vira retomada: dentro da ilha publicada, de pé no relevo (não na água,
  // num buraco ou numa ponte acima dele), no modo chão. A régua do "último ponto de terreno
  // livre" do ensaio; a chegada confere de novo a colisão ao restaurar.
  useFrame(() => {
    const p = pronto
    if (!p || pedidos.teleporte || movimento.modo !== 'chao' || !movimento.noChao) return
    const { x, z } = rastro,
      pe = rastro.y - CORPO.doCentroAoPe
    if (!p.regiao.contem(x, z) || p.alturas?.temChao?.({ x, z }) === false) return
    const relevo = p.alturas ? p.alturas(x, z) : pe
    if (relevo <= 0 || pe < relevo - 0.5 || pe > relevo + 0.6) return
    if ((p.agua.nivel(x, z)?.nivel ?? Number.NEGATIVE_INFINITY) > pe) return
    // Um objeto só, reaproveitado: nada é criado a cada quadro.
    const ultimo = ultimoPontoSeguro.current
    if (!ultimo) ultimoPontoSeguro.current = { x, y: rastro.y, z }
    else {
      ultimo.x = x
      ultimo.y = rastro.y
      ultimo.z = z
    }
  })
  useEffect(() => {
    if (!pronto) return
    const guardar = () => {
        const ponto = ultimoPontoSeguro.current
        if (!ponto) return
        try {
          localStorage.setItem(
            chaveDaRetomada(pronto.publicacao),
            codificarRetomadaDoCenario(pronto.publicacao, ponto),
          )
        } catch (erro) {
          aoErro(erro instanceof Error ? erro.message : String(erro))
        }
      },
      esconder = () => {
        if (document.visibilityState === 'hidden') guardar()
      },
      timer = setInterval(guardar, 5000)
    window.addEventListener('pagehide', guardar)
    document.addEventListener('visibilitychange', esconder)
    return () => {
      clearInterval(timer)
      window.removeEventListener('pagehide', guardar)
      document.removeEventListener('visibilitychange', esconder)
    }
  }, [pronto, aoErro])
  return pronto
}
