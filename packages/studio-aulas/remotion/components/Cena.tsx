import { AbsoluteFill, Audio, staticFile } from 'remotion'
import type { Plano, PlanoCena } from '../../src/steps/07-montagem/plano'
import { Avatar } from './Avatar'
import { Baloes } from './Baloes'
import { Cenario } from './Cenario'
import { TelaClip } from './TelaClip'
import { Teoria } from './teoria'

// Uma cena = fundo (cenário) + áudio + o miolo conforme o layout:
//   avatar-cheio: avatar grande (apresentação/fecho)
//   teoria:       avatar no cantinho + ilustração animada
//   pratica:      tela do Estúdio + balões + avatar no cantinho
export const Cena: React.FC<{ plano: Plano; cena: PlanoCena }> = ({ plano, cena }) => {
  const cenario = cena.layout === 'avatar-cheio' ? plano.cenarioAbertura : plano.cenarioMeio

  return (
    <AbsoluteFill>
      <Cenario src={cenario} variante={cena.layout === 'avatar-cheio' ? 'a' : 'b'} />

      {cena.layout === 'pratica' && plano.tela && (
        <TelaClip
          src={plano.tela}
          inicioS={cena.telaInicioS ?? 0}
          fps={plano.fps}
          largura={plano.largura}
          altura={plano.altura}
        />
      )}

      {cena.layout === 'teoria' && cena.ilustracao && (
        <Teoria nome={cena.ilustracao.nome} params={cena.ilustracao.params} />
      )}

      {cena.baloes && cena.baloes.length > 0 && <Baloes baloes={cena.baloes} fps={plano.fps} />}

      {cena.avatar && (
        <Avatar
          src={cena.avatar}
          layout={cena.layout}
          chroma={plano.chroma}
          largura={plano.largura}
          altura={plano.altura}
        />
      )}

      {cena.audio && <Audio src={staticFile(cena.audio)} />}
    </AbsoluteFill>
  )
}
