import { useFrame, useThree } from '@react-three/fiber'
import { type Ilha, type IlhaId, ilhaAberta } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Material, Object3D } from 'three'
import { useEstado, useJogo } from '../estado/contexto'
import { esmaecer, ilhaPreferida, versoesPerto } from '../sistemas/ilhas-completas'
import { buscarIlha, soltarIlha } from './carregar-ilha'
import { tirarNosDeColisao } from './colisores-da-ilha'
import { aplicarOpacidade, type Troca } from './ilha-completa'
import { ARQUIVOS_DAS_ILHAS_MEDIAS } from './ilhas-medias.gerado'
import {
  DISTANCIA_DA_COMPLETA,
  DURACAO_DA_TROCA,
  giroDaIlha,
  ilhasEmVolta,
  naPonteDa,
  nivelDeDetalhe,
} from './medidas'
import { materiaisDe } from './modelos'
import { pintarMateriais, pinturaDaIlha } from './pintura-da-ilha'

/** Quase inteira: liga o pontilhado (para compilar o shader dele) sem nada sumir na tela. */
const QUASE_INTEIRA = 0.999

/**
 * A versão média de uma ilha (lacunas, 01/11/2026, as ilhas em três versões): baixada quando a
 * pessoa pisa na ponte, toma o lugar da leve esmaecendo, sem colisores (a leve segue colidindo) e
 * sai quando a completa entra ou quando a pessoa se afasta, soltando a memória. Só existe para as
 * ilhas que têm o arquivo (`ilhas-medias.gerado.ts`); sem ele, nada disto monta.
 */
export function temVersaoMedia(id: IlhaId): boolean {
  return ARQUIVOS_DAS_ILHAS_MEDIAS[id] !== undefined
}

export interface Media {
  modelo: Object3D
  materiais: Material[]
}

/** Prepara a cena da média: girada como a ilha, sem nós de colisão e com a tinta da ilha. */
export function prepararMedia(cena: Object3D, ilha: Ilha): Media {
  cena.rotation.y = giroDaIlha(ilha)
  tirarNosDeColisao(cena)
  const materiais = materiaisDe(cena)
  pintarMateriais(materiais, pinturaDaIlha(ilha))
  return { modelo: cena, materiais }
}

export function useIlhaMedia(
  ilha: Ilha,
  centro: { x: number; z: number },
  aberta: boolean,
  troca: Troca,
): Media | null {
  const { rastro } = useJogo()
  const { gl, camera, scene } = useThree()
  const jornada = useEstado((s) => s.jornada)
  const url = ARQUIVOS_DAS_ILHAS_MEDIAS[ilha.id]
  const candidatas = useMemo(
    () =>
      ilhasEmVolta()
        .filter((i) => temVersaoMedia(i.ilha.id) && ilhaAberta(i.ilha.id, jornada))
        .map((i) => ({ id: i.ilha.id, ...i.centro })),
    [jornada],
  )
  const [media, setMedia] = useState<Media | null>(null)
  const vivo = useRef({ media: null as Media | null, buscando: false, carga: 0 })
  useFrame((_, dt) => {
    if (!url) return
    const v = vivo.current
    const distancia = Math.hypot(rastro.x - centro.x, rastro.z - centro.z)
    const perto =
      aberta &&
      ilhaPreferida(rastro, candidatas, null) === ilha.id &&
      versoesPerto({
        temMedia: true,
        nivel: nivelDeDetalhe(distancia, naPonteDa(ilha, rastro.x, rastro.z)),
        distancia,
        distanciaDaCompleta: DISTANCIA_DA_COMPLETA,
      }).media
    troca.media = esmaecer(troca.media ?? 0, perto && v.media ? 1 : 0, dt, DURACAO_DA_TROCA)
    if (perto && !v.media && !v.buscando) {
      v.buscando = true
      const carga = ++v.carga
      buscarIlha(url, undefined, 'media')
        .then(async (cena) => {
          if (carga !== v.carga) return
          const preparada = prepararMedia(cena, ilha)
          // Compila o pontilhado da troca antes de aparecer (compilar na hora soluçaria).
          try {
            aplicarOpacidade(preparada.materiais, QUASE_INTEIRA)
            await gl.compileAsync(preparada.modelo, camera, scene)
          } catch {
            // Só para não soluçar; se falhar, compila na primeira vez que desenhar.
          } finally {
            aplicarOpacidade(preparada.materiais, 1)
          }
          if (carga !== v.carga) return
          v.media = preparada
          setMedia(preparada)
        })
        .catch(() => {
          // Sem a média, a leve continua: nada muda para quem joga.
        })
        .finally(() => {
          if (carga === v.carga) v.buscando = false
        })
    }
    // Longe e já esmaecida: solta a memória da média.
    if (!perto && v.media && (troca.media ?? 0) <= 0) {
      v.carga++
      v.media = null
      v.buscando = false
      setMedia(null)
      soltarIlha(url)
    }
  })
  useEffect(
    () => () => {
      vivo.current.carga++
      vivo.current.media = null
      troca.media = 0
      if (url) soltarIlha(url)
    },
    [url, troca],
  )
  return media
}

/** A média na cena: aparece com `troca.media` e some quando a completa entra (`troca.opacidade`). */
export function IlhaMedia({ media, troca }: { media: Media; troca: Troca }) {
  const aplicada = useRef(-1)
  useFrame(() => {
    const opacidade = (troca.media ?? 0) * (1 - troca.opacidade)
    if (opacidade === aplicada.current) return
    aplicada.current = opacidade
    aplicarOpacidade(media.materiais, opacidade)
    media.modelo.visible = opacidade > 0
  })
  return <primitive object={media.modelo} />
}
