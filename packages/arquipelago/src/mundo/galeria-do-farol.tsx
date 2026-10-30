import { CATALOGO_DE_OBJETOS, chaveDaExposicao } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo } from 'react'
import {
  CanvasTexture,
  CylinderGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
} from 'three'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDoFarol } from '../estado/farol'
import { lojaDosMinijogos, useMinijogos } from '../estado/minijogos'
import { lojaDoMural, useMural } from '../estado/mural'
import { painelDaVaga } from '../interface/galeria-do-farol'
import {
  aparenciaDaExposicao,
  galeriaAberta,
  PEDESTAL,
  tituloDaExposicao,
  VAGAS_DA_GALERIA,
  vagasDaGaleria,
} from '../sistemas/galeria-do-farol'
import { ALTO_DO_FAROL } from './alto-do-farol'
import { Colisores } from './colisores'
import type { ColisorDaIlha } from './colisores-da-ilha'
import { useInterativo } from './interativos'
import { ComReserva } from './modelos'
import { ModeloDoObjeto } from './objetos-da-casa'

/** A criação maior cabe num cubo deste lado em cima do tampo. */
const LADO_DA_EXPOSICAO = 0.85
const TAMPO = { raio: PEDESTAL.raioDoTampo, altura: PEDESTAL.alturaDoTampo }
/** O interativo fica na frente do pedestal (do lado da lente), a esta distância do centro dele. */
const FRENTE_DA_VAGA = 0.75

/** As vagas com o número fixo de cada uma (a vaga é o lugar, não muda de ordem). */
const LUGARES = VAGAS_DA_GALERIA.map((v, i) => ({ ...v, i, nome: `vaga-da-galeria-${i + 1}` }))

/** Os pedestais colidem só para o corpo, como os vasos: a câmera passa por cima deles. */
const COLISORES_DOS_PEDESTAIS: ColisorDaIlha[] = VAGAS_DA_GALERIA.map((v, i) => ({
  forma: 'cilindro',
  nome: `col-cil-pedestal-galeria-${i + 1}`,
  posicao: [v.x, PEDESTAL.altura / 2, v.z],
  rotacao: [0, 0, 0, 1],
  raio: TAMPO.raio,
  meiaAltura: PEDESTAL.altura / 2,
}))

/**
 * A galeria do modo livre (fase4-12) dentro da sala do alto do Farol: seis pedestais em volta da
 * lente, cada um com a criação escolhida no painel da vaga. Montada pela `SalaDoFarol`, no
 * referencial do `alto-do-farol.glb`; só aparece com o final concluído.
 */
export function GaleriaDoFarol({ visivel }: { visivel: boolean }) {
  const aberta = useEstado((s) => galeriaAberta(s.salvamento) && s.visita === null)
  if (!aberta) return null
  return <Pedestais visivel={visivel} />
}

function Pedestais({ visivel }: { visivel: boolean }) {
  const { loja, plataforma } = useJogo()
  const minijogos = lojaDosMinijogos(loja, plataforma)
  const mural = lojaDoMural(loja, plataforma)
  const salvamento = useEstado((s) => s.salvamento)
  const listaDeMinijogos = useMinijogos(minijogos, (s) => s.lista)
  const listaDoMural = useMural(mural, (s) => s.lista)
  useEffect(() => {
    void minijogos.carregar()
    void mural.carregar()
  }, [minijogos, mural])
  const recursos = useMemo(
    () => ({
      corpo: new CylinderGeometry(PEDESTAL.raio * 0.85, PEDESTAL.raio, PEDESTAL.altura, 24),
      tampo: new CylinderGeometry(TAMPO.raio, TAMPO.raio, TAMPO.altura, 24),
      pedra: new MeshStandardMaterial({ color: '#efe6d4', roughness: 0.8 }),
      ouro: new MeshStandardMaterial({ color: '#d9b46a', roughness: 0.45, metalness: 0.3 }),
      vazio: new MeshBasicMaterial({ color: '#7fc4ff', transparent: true, opacity: 0.45 }),
      disco: new CylinderGeometry(TAMPO.raio * 0.7, TAMPO.raio * 0.7, 0.01, 24),
    }),
    [],
  )
  useEffect(
    () => () => {
      for (const r of Object.values(recursos)) r.dispose()
    },
    [recursos],
  )
  const vagas = vagasDaGaleria(salvamento)
  return (
    <group name="galeria-do-farol" visible={visivel}>
      <Colisores lista={COLISORES_DOS_PEDESTAIS} />
      {LUGARES.map(({ i, nome, ...v }) => {
        const exposta = vagas[i] ?? null
        const achada = exposta ? aparenciaDaExposicao(salvamento, exposta) : null
        return (
          <group key={nome} name={nome} position={[v.x, 0, v.z]} rotation={[0, v.giro, 0]}>
            <mesh
              geometry={recursos.corpo}
              material={recursos.pedra}
              position={[0, PEDESTAL.altura / 2, 0]}
            />
            <mesh
              geometry={recursos.tampo}
              material={recursos.ouro}
              position={[0, PEDESTAL.altura + TAMPO.altura / 2, 0]}
            />
            <InterativoDaVaga vaga={i} lugar={v} />
            {exposta === null || (exposta[0] === 'a' && !achada) ? (
              <mesh
                geometry={recursos.disco}
                material={recursos.vazio}
                position={[0, PEDESTAL.altura + TAMPO.altura + 0.006, 0]}
              />
            ) : exposta[0] === 'a' && achada ? (
              <ObjetoExposto
                key={chaveDaExposicao(exposta)}
                objeto={achada.objeto}
                aparencia={achada.aparencia}
              />
            ) : (
              <QuadroDoJogo
                key={chaveDaExposicao(exposta)}
                capa={
                  exposta[0] === 'd'
                    ? (listaDeMinijogos.find((m) => m.desafioId === exposta[1])?.capa ?? null)
                    : null
                }
                titulo={tituloDaExposicao(salvamento, exposta, listaDeMinijogos, listaDoMural)}
                tipo={exposta[0] === 'd' ? 'Minijogo' : 'Jogo do Mural'}
              />
            )}
          </group>
        )
      })}
    </group>
  )
}

function InterativoDaVaga({
  vaga,
  lugar: v,
}: {
  vaga: number
  lugar: (typeof VAGAS_DA_GALERIA)[number]
}) {
  const { loja, rastro } = useJogo()
  const farol = lojaDoFarol(loja)
  const r = Math.hypot(v.x, v.z)
  const frente = (r - FRENTE_DA_VAGA) / r
  useInterativo(`galeria-do-farol-${vaga + 1}`, {
    x: ALTO_DO_FAROL.x + v.x * frente,
    z: ALTO_DO_FAROL.z + v.z * frente,
    raio: 1.1,
    rotulo: () => {
      const s = loja.getState()
      if (farol.getState().etapa !== 'sala' || rastro.y <= ALTO_DO_FAROL.y) return null
      if (!galeriaAberta(s.salvamento) || s.visita) return null
      return vagasDaGaleria(s.salvamento)[vaga]
        ? `Ver a criação da vaga ${vaga + 1}`
        : `Escolher o que expor na vaga ${vaga + 1}`
    },
    agir: () => loja.getState().abrirPainel(painelDaVaga(vaga)),
  })
  return null
}

function ObjetoExposto({
  objeto,
  aparencia,
}: {
  objeto: Parameters<typeof ModeloDoObjeto>[0]['id']
  aparencia: Parameters<typeof ModeloDoObjeto>[0]['aparencia']
}) {
  const { largura, altura, fundo } = CATALOGO_DE_OBJETOS[objeto].molde.caixa
  const escala = Math.min(1, LADO_DA_EXPOSICAO / Math.max(largura, altura, fundo))
  return (
    <group position={[0, PEDESTAL.altura + TAMPO.altura, 0]} scale={escala}>
      <ComReserva reserva={null}>
        <ModeloDoObjeto id={objeto} completo aparencia={aparencia} />
      </ComReserva>
    </group>
  )
}

/** Um jogo exposto: um quadro em pé no tampo, com a capa do minijogo ou o nome escrito. */
function QuadroDoJogo({
  capa,
  titulo,
  tipo,
}: {
  capa: string | null
  titulo: string
  tipo: string
}) {
  const recursos = useMemo(() => {
    const tela = new MeshBasicMaterial({ toneMapped: false })
    const textura: Texture = capa
      ? new TextureLoader().load(capa, () => {
          tela.needsUpdate = true
        })
      : texturaDoNome(titulo, tipo)
    textura.colorSpace = SRGBColorSpace
    tela.map = textura
    return {
      tela,
      textura,
      plano: new PlaneGeometry(0.72, 0.54),
      moldura: new PlaneGeometry(0.82, 0.64),
      madeira: new MeshStandardMaterial({ color: '#8a5a3b', roughness: 0.7 }),
    }
  }, [capa, titulo, tipo])
  useEffect(
    () => () => {
      for (const r of Object.values(recursos)) r.dispose()
    },
    [recursos],
  )
  const y = PEDESTAL.altura + TAMPO.altura + 0.34
  return (
    <group position={[0, y, 0]} rotation={[-0.12, 0, 0]}>
      <mesh geometry={recursos.moldura} material={recursos.madeira} position={[0, 0, -0.005]} />
      <mesh geometry={recursos.moldura} material={recursos.madeira} rotation={[0, Math.PI, 0]} />
      <mesh geometry={recursos.plano} material={recursos.tela} />
    </group>
  )
}

function texturaDoNome(titulo: string, tipo: string): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 384
  canvas.height = 288
  const c = canvas.getContext('2d')
  if (c) {
    c.fillStyle = '#20345c'
    c.fillRect(0, 0, canvas.width, canvas.height)
    c.fillStyle = '#ffd56b'
    c.font = 'bold 26px sans-serif'
    c.textAlign = 'center'
    c.fillText(tipo, canvas.width / 2, 56)
    c.fillStyle = '#ffffff'
    c.font = 'bold 34px sans-serif'
    linhas(c, titulo, canvas.width - 48).forEach((linha, i) => {
      c.fillText(linha, canvas.width / 2, 132 + i * 44)
    })
  }
  return new CanvasTexture(canvas)
}

/** Quebra o nome em até três linhas que cabem na largura. */
function linhas(c: CanvasRenderingContext2D, texto: string, largura: number): string[] {
  const saida: string[] = []
  let atual = ''
  for (const palavra of texto.split(/\s+/)) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra
    if (c.measureText(tentativa).width <= largura || !atual) atual = tentativa
    else {
      saida.push(atual)
      atual = palavra
    }
  }
  if (atual) saida.push(atual)
  if (saida.length > 3) saida.splice(2, saida.length - 2, `${saida[2]}…`)
  return saida
}
