import { useFrame, useThree } from '@react-three/fiber'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { lojaDoConforto, useConforto } from '../estado/conforto'
import { useEstado, useJogo } from '../estado/contexto'
import { jogoPausado } from '../sistemas/pausa'
import {
  criarAmostra,
  type NivelDeQualidade,
  nivelForcado,
  observarQuadro,
  PERFIS_DE_QUALIDADE,
  perfilDoAparelho,
} from '../sistemas/qualidade'
import { qualidadeDaVegetacao } from './vegetacao-ao-vento'

const Contexto = createContext<{
  nivel: NivelDeQualidade
  meta: 30 | 60
  observar(ms: number): void
}>({
  nivel: 'completo',
  meta: 60,
  observar: () => {},
})
export const useQualidade = () => useContext(Contexto)

/** Uma adaptação por montagem. Só atualiza React quando o nível realmente muda. */
export function QualidadeDaCena({ children }: { children: ReactNode }) {
  const { loja } = useJogo()
  const preferencia = useConforto(lojaDoConforto(loja), (s) => s.conforto.qualidade)
  const perfil = useMemo(
    () =>
      perfilDoAparelho({
        toque: window.matchMedia('(pointer: coarse)').matches,
        userAgent: navigator.userAgent,
        nucleos: navigator.hardwareConcurrency,
      }),
    [],
  )
  const parametro = useMemo(() => new URLSearchParams(location.search).get('qualidade'), [])
  const forcado = nivelForcado(preferencia, parametro)
  const [automatico, mudar] = useState(perfil.inicial)
  const nivel = forcado ?? automatico
  const amostra = useRef(criarAmostra(perfil.meta, nivel))
  const pausado = useEstado(jogoPausado)
  useLayoutEffect(() => {
    const limpar = () => {
      amostra.current = criarAmostra(perfil.meta, nivel)
    }
    limpar()
    document.addEventListener('visibilitychange', limpar)
    return () => document.removeEventListener('visibilitychange', limpar)
  }, [perfil.meta, nivel])
  useLayoutEffect(() => {
    if (forcado || pausado) amostra.current = criarAmostra(perfil.meta, nivel)
  }, [forcado, pausado, perfil.meta, nivel])
  const observar = useCallback(
    (ms: number) => {
      if (forcado || pausado || document.hidden) {
        amostra.current = criarAmostra(perfil.meta, nivel)
        return
      }
      amostra.current = observarQuadro(amostra.current, ms)
      if (amostra.current.nivel !== nivel) mudar(amostra.current.nivel)
    },
    [forcado, pausado, perfil.meta, nivel],
  )
  const valor = useMemo(
    () => ({ nivel, meta: perfil.meta, observar }),
    [nivel, perfil.meta, observar],
  )
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

/** Dentro do Canvas. DPR é controlado na prop do Canvas, inclusive quando o menu o renderiza. */
export function MonitorDeQualidade() {
  const { nivel, observar } = useQualidade()
  const scene = useThree((s) => s.scene)
  useLayoutEffect(() => {
    qualidadeDaVegetacao.set(scene, PERFIS_DE_QUALIDADE[nivel].vento)
    return () => {
      qualidadeDaVegetacao.delete(scene)
    }
  }, [nivel, scene])
  useFrame((_, dt) => observar(dt * 1000))
  return null
}
