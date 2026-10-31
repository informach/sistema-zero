import { useEffect, useMemo } from 'react'
import { MeshBasicMaterial, type Object3D, SRGBColorSpace, TextureLoader } from 'three'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDosMinijogos, useMinijogos } from '../estado/minijogos'
import {
  ANCORA_DO_BRINQUEDO,
  BRINQUEDOS_DE_MINIJOGO,
  capaDoBrinquedo,
  type IlhaComBrinquedo,
  painelDoBrinquedo,
  TELA_DO_BRINQUEDO,
} from '../sistemas/brinquedos-de-minijogo'
import { jogoPausado } from '../sistemas/pausa'
import { paraOMundo } from './bosque'
import { trocarMaterialDaFace } from './carregar-aparencia'
import { useInterativo } from './interativos'

/** Onde se para para jogar: a âncora `jogar`, a esta distância. */
const RAIO_DO_BRINQUEDO = 1.6

/**
 * A barraca do jogo na feira (Vila Doce) e o quiosque do festival (Pico), B10: o brinquedo já está
 * no GLB da ilha completa, com colisor. Aqui a tela ganha a capa do minijogo mais recente da ilha
 * (como a do fliperama de casa) e a âncora `jogar` abre a lista dos minijogos da ilha. Na visita,
 * os minijogos seriam os de quem visita: o brinquedo fica só de enfeite.
 */
export function BrinquedoDeMinijogo({
  ilha,
  modelo,
  meio,
  giro,
}: {
  ilha: IlhaComBrinquedo
  modelo: Object3D
  meio: { x: number; y: number; z: number }
  giro: number
}) {
  // O brinquedo, a tela e a âncora são nós soltos do modelo (um de cada por ilha).
  const brinquedo = modelo.getObjectByName(BRINQUEDOS_DE_MINIJOGO[ilha].no)
  const tela = modelo.getObjectByName(TELA_DO_BRINQUEDO)
  const lugar = modelo.getObjectByName(ANCORA_DO_BRINQUEDO)?.position
  return brinquedo && tela && lugar ? (
    <BrinquedoNoLugar ilha={ilha} tela={tela} lugar={lugar} meio={meio} giro={giro} />
  ) : null
}

function BrinquedoNoLugar({
  ilha,
  tela,
  lugar,
  meio,
  giro,
}: {
  ilha: IlhaComBrinquedo
  tela: Object3D
  lugar: { x: number; y: number; z: number }
  meio: { x: number; y: number; z: number }
  giro: number
}) {
  const { loja, plataforma } = useJogo()
  const fonte = lojaDosMinijogos(loja, plataforma)
  const capa = useMinijogos(fonte, (s) => capaDoBrinquedo(s.lista, ilha))
  const visita = useEstado((s) => s.visita !== null)
  const ponto = useMemo(
    () => paraOMundo(lugar, meio, giro, { x: 0, y: 0, z: 0 }),
    [lugar, meio, giro],
  )
  const painel = painelDoBrinquedo(ilha)
  useEffect(() => {
    if (!visita) void fonte.carregar()
  }, [fonte, visita])
  useInterativo(painel, {
    x: ponto.x,
    z: ponto.z,
    raio: RAIO_DO_BRINQUEDO,
    rotulo: () => BRINQUEDOS_DE_MINIJOGO[ilha].rotulo,
    agir: () => {
      const s = loja.getState()
      if (s.visita || jogoPausado(s)) return
      s.abrirPainel(painel)
    },
  })
  useEffect(
    () => () => {
      if (loja.getState().painelAberto === painel) loja.getState().abrirPainel(null)
    },
    [loja, painel],
  )
  useEffect(() => {
    if (!capa || visita) return
    let vivo = true
    let restaurar = () => {}
    const material = new MeshBasicMaterial({ toneMapped: false })
    const textura = new TextureLoader().load(capa, (t) => {
      if (!vivo) return
      t.colorSpace = SRGBColorSpace
      material.map = t
      material.needsUpdate = true
      restaurar = trocarMaterialDaFace(tela, TELA_DO_BRINQUEDO, material)
    })
    return () => {
      vivo = false
      restaurar()
      textura.dispose()
      material.dispose()
    }
  }, [tela, capa, visita])
  return null
}
