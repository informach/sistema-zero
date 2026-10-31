import type { EnvioAoClube, SituacaoDoClube } from '@sistemazero/arquipelago-contracts'
import { jogoPausado, type SinaisDePausa } from './pausa'

/**
 * O modo foto (fase2-09, regras puras): um valor de `painelAberto`, então o personagem fica parado
 * (a mesma pausa dos painéis) e a câmera continua girando e aproximando como sempre. O HUD, a fala
 * do Zappy e as dicas somem; Esc ou "Voltar" fecham o painel e o HUD volta. A foto fica no
 * aparelho. Com "Fotos no Clube" ligado pelos responsáveis (N08b, começa desligado, ECA Digital
 * art. 21) e o canal das fotos no Clube, aparece "Mandar para o Clube": a foto vai para a
 * moderação do Clube, nunca direto.
 */

/** O valor de `painelAberto` do modo foto. */
export const PAINEL_DA_FOTO = 'foto'

/** No modo foto o HUD inteiro some (necessidades, relógio, dicas, a fala do Zappy, o toque). */
export function hudEscondido(s: { painelAberto: string | null }): boolean {
  return s.painelAberto === PAINEL_DA_FOTO
}

/** A tecla F entra no modo foto (sem Ctrl, Alt ou Meta, e fora de campo de texto). */
export function eTeclaDaFoto(e: {
  code: string
  ctrlKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  repeat?: boolean
  dentroDeCampo?: boolean
}): boolean {
  return e.code === 'KeyF' && !e.ctrlKey && !e.altKey && !e.metaKey && !e.repeat && !e.dentroDeCampo
}

/** Só entra com o jogo correndo: nada de menu, painel, ferramenta, resultado ou pausa aberta. */
export function podeEntrarNaFoto(s: SinaisDePausa): boolean {
  return !jogoPausado(s)
}

/** O nome do arquivo: `arquipelago-2026-10-29-15h04.png` (a hora do aparelho). */
export function nomeDaFoto(agora: Date): string {
  const dois = (n: number) => String(n).padStart(2, '0')
  const dia = `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}`
  return `arquipelago-${dia}-${dois(agora.getHours())}h${dois(agora.getMinutes())}.png`
}

/** O que a captura precisa do renderizador (o `WebGLRenderer` do three). */
export interface RenderizadorDaFoto<Cena, Camera> {
  render(cena: Cena, camera: Camera): void
  domElement: { toBlob(pronto: (b: Blob | null) => void, tipo?: string): void }
}

/**
 * Tira a foto: desenha o quadro e lê o canvas na mesma hora, antes de o navegador mostrar e limpar
 * o quadro. Assim o jogo não precisa de `preserveDrawingBuffer` (que custa em todo quadro no
 * celular). `toBlob` copia a imagem no momento da chamada; o PNG chega depois.
 */
export function capturarQuadro<Cena, Camera>(
  gl: RenderizadorDaFoto<Cena, Camera>,
  cena: Cena,
  camera: Camera,
): Promise<Blob | null> {
  return new Promise((resolver) => {
    gl.render(cena, camera)
    gl.domElement.toBlob(resolver, 'image/png')
  })
}

/** "Mandar para o Clube" só aparece com a foto pronta, o Clube ligado e a foto ainda não mandada. */
export function podeMandarAoClube(
  clube: SituacaoDoClube | null,
  foto: 'pronta' | 'outra',
  envio: EnvioAoClube | 'mandando' | null,
): boolean {
  return (
    clube === 'ligado' &&
    foto === 'pronta' &&
    envio !== 'mandando' &&
    envio !== 'em-moderacao' &&
    envio !== 'publicada'
  )
}

/** Depois do envio, a situação do Clube que vale (o servidor pode ter mudado de ideia). */
export function clubeDepoisDoEnvio(
  clube: SituacaoDoClube | null,
  envio: EnvioAoClube,
): SituacaoDoClube | null {
  if (envio === 'desligado') return 'desligado'
  if (envio === 'sem-clube') return 'sem-clube'
  return clube
}

export const TEXTOS_DA_FOTO = {
  titulo: 'Modo foto',
  dica: 'Gire e aproxime a câmera para enquadrar.',
  tirar: 'Tirar foto',
  tirando: 'Tirando a foto',
  pronta: 'Foto pronta. Ela ficou só neste aparelho.',
  baixarDeNovo: 'Baixar de novo',
  falhou: 'A foto não saiu agora. Tente de novo.',
  mandarAoClube: 'Mandar para o Clube',
  mandando: 'Mandando para o Clube',
  envio: {
    'em-moderacao': 'A foto foi para o Clube. Ela aparece lá depois que um adulto da equipe olhar.',
    publicada: 'A foto já está no Clube.',
    desligado: 'As fotos no Clube estão desligadas. Quem decide são os responsáveis.',
    'sem-clube': 'O Clube ainda não recebe fotos do jogo. A foto ficou neste aparelho.',
    falhou: 'A foto não chegou ao Clube agora. Tente de novo.',
  } satisfies Record<EnvioAoClube, string>,
  voltar: 'Voltar',
} as const
