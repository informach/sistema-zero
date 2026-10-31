import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Suspense } from 'react'
import { lojaDaAbertura, useAbertura } from '../estado/abertura'
import { useEstado, useJogo } from '../estado/contexto'
import { Camera } from '../personagem/camera'
import { Personagem } from '../personagem/personagem'
import { Zappy } from '../personagem/zappy'
import { PAINEL_DA_ABERTURA } from '../sistemas/abertura'
import { jogoPausado } from '../sistemas/pausa'
import { PERFIS_DE_QUALIDADE } from '../sistemas/qualidade'
import { segredoObrigatorio } from '../sistemas/segredos'
import { Agua } from './agua'
import { Anel } from './anel'
import { Bancada } from './bancada'
import { Barcos } from './barcos'
import { BichoAdotado } from './bicho-adotado'
import { Casa } from './casa'
import { CenaDaChegada } from './cena-da-chegada'
import { Ceu } from './ceu'
import { ChavesDaCasa } from './chaves-da-casa'
import { ClimaDaIlha } from './clima-da-ilha'
import { ColecoesDaPraia } from './colecoes-da-praia'
import { ConvidadosDaCasa } from './convidados'
import { DescobertasDaIlhaCentral } from './descoberta-da-ilha'
import { EnquantoFechado } from './enquanto-fechado'
import { FantasmaFamiliar } from './fantasma-familiar'
import { Farol } from './farol'
import { FilhoteQueAcompanha } from './filhote-que-acompanha'
import { CameraDaFoto } from './foto'
import { GuiaDoZappyNoMundo } from './guia-do-zappy'
import { HabitantesDaPraia } from './habitantes-da-praia'
import { Horta } from './horta'
import { IlhaCentral } from './ilha-central'
import {
  GRAVIDADE,
  LONGE_DA_CAMERA,
  PASSO_DA_FISICA,
  PERTO_DA_CAMERA,
  PRIORIDADE_DA_FISICA,
} from './medidas'
import { Medidor } from './medidor'
import { carregarModelos } from './modelos'
import { Nico } from './nico'
import { PetQueAcompanha } from './pet-que-acompanha'
import { MonitorDeQualidade, QualidadeDaCena, useQualidade } from './qualidade-da-cena'
import { RetratoDoAvatar } from './retrato-do-avatar'
import { RotinaDosLumis } from './rotina-dos-lumis'
import { RoupasConquistadas } from './roupas-conquistadas'
import { SegredoNoAlto } from './segredos-das-ilhas'

/** O segredo da sua ilha (N12): o baú no alto do vento. */
const SEGREDO_DA_SUA_ILHA = segredoObrigatorio('sua-ilha')

// Os modelos do mundo começam a baixar junto com o jogo (cada peça mostra a forma simples até chegar).
carregarModelos()

/** A cena 3D inteira. A física (Rapier) roda dentro dela. */
export function Cena({ aoFalhar }: { aoFalhar: (e: unknown) => void }) {
  return (
    <QualidadeDaCena>
      <CenaComQualidade aoFalhar={aoFalhar} />
    </QualidadeDaCena>
  )
}

function CenaComQualidade({ aoFalhar }: { aoFalhar: (e: unknown) => void }) {
  const { nivel } = useQualidade()
  const ferramentaAberta = useEstado((estado) => estado.ferramentaAberta)
  // A abertura cobre a tela inteira: o mundo não precisa ser desenhado por baixo dela. Na saída
  // ele volta a desenhar, para estar lá quando a tela clareia.
  const { loja } = useJogo()
  const aberturaSaindo = useAbertura(lojaDaAbertura(loja), (a) => a.saindo)
  const naAbertura = useEstado((estado) => estado.painelAberto === PAINEL_DA_ABERTURA)
  const aberturaCobre = naAbertura && !aberturaSaindo
  const pausado = useEstado(jogoPausado)
  return (
    <Canvas
      frameloop={ferramentaAberta || aberturaCobre ? 'never' : 'always'}
      className="arq-canvas"
      dpr={[0, PERFIS_DE_QUALIDADE[nivel].dpr]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 55, near: PERTO_DA_CAMERA, far: LONGE_DA_CAMERA, position: [0, 8, 10] }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          aoFalhar(new Error('O navegador perdeu a placa de vídeo'))
        })
      }}
    >
      <MonitorDeQualidade />
      <CameraDaFoto />
      <Ceu />
      <Suspense fallback={null}>
        {/* Passo fixo com o desenho suavizado entre passos; os passos rodam antes dos outros
            quadros (prioridade negativa), então personagem, bicho e câmera leem a posição já
            suavizada deste quadro. */}
        <Physics
          paused={pausado}
          gravity={[0, -GRAVIDADE, 0]}
          timeStep={PASSO_DA_FISICA}
          interpolate
          updatePriority={PRIORIDADE_DA_FISICA}
        >
          <Agua />
          <IlhaCentral />
          <DescobertasDaIlhaCentral />
          <HabitantesDaPraia />
          <Nico />
          <ColecoesDaPraia />
          <ChavesDaCasa />
          <SegredoNoAlto segredo={SEGREDO_DA_SUA_ILHA} />
          <Casa />
          <ConvidadosDaCasa />
          <Horta />
          <ClimaDaIlha />
          <Bancada />
          <Farol />
          <Anel />
          <CenaDaChegada />
          <Barcos />
          <Personagem />
          <FantasmaFamiliar />
          <RetratoDoAvatar />
          <BichoAdotado />
          <PetQueAcompanha />
          <FilhoteQueAcompanha />
          <Camera />
          <Medidor />
        </Physics>
        <Zappy />
        <GuiaDoZappyNoMundo />
        <RotinaDosLumis />
        <EnquantoFechado />
        <RoupasConquistadas />
      </Suspense>
    </Canvas>
  )
}
