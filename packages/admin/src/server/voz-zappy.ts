import 'server-only'
import { createHash } from 'node:crypto'
import {
  chaveDeVoz,
  type SceneVozes,
  textoFalado,
  VOZ_LIMITS,
} from '@sistemazero/core/learning/scene'
import { getEnv } from '@/lib/env'
import { mapPool } from '@/lib/pool'
import { MediaNotConfiguredError, r2ObjectExists, r2PublicUrl, r2PutObject } from '@/server/r2'

/**
 * A voz do Zappy (ElevenLabs) gerada na AUTORIA.
 *
 * ⭐⭐ Decisão da dona (17/09/2026): as falas do Zappy e as instruções das cenas saem na voz dele, e
 * não na voz do sistema operacional da criança. O áudio é gerado AQUI, no admin, na hora em que ela
 * monta a aula — e não no navegador de quem assiste.
 *
 * ⚠️⚠️ É o ponto que decide o custo: o texto da aula é FIXO e quem muda é a criança que ouve. Uma
 * frase gerada uma vez vale para todas as crianças, para sempre, porque a key do R2 é o HASH do
 * texto falado. Gerar no navegador seria pagar o ElevenLabs a cada clique de cada criança, expor a
 * chave no cliente e trocar 50 ms de CDN por segundos de síntese — com a aula caindo junto quando
 * o serviço caísse.
 *
 * ⚠️ A chave do ElevenLabs vive SÓ no admin (`ELEVENLABS_API_KEY`). O community e o kids não a
 * conhecem: eles recebem URL de MP3 público, como qualquer outra mídia de aula.
 */

/** A voz que a dona criou no ElevenLabs. A env só existe para trocar sem deploy. */
const VOZ_PADRAO = '0zTjt1MBEwfzcDnBGtaL'

/**
 * `eleven_multilingual_v2`: o modelo com português de verdade.
 *
 * ⚠️ Aqui a escolha é por QUALIDADE, não por preço: a geração acontece uma vez, na autoria, e o
 * volume inteiro das aulas cabe num mês do menor plano. Os modelos `flash`/`turbo` custam metade
 * dos créditos e existem para síntese em tempo real — que é justamente o que este desenho evita.
 */
const MODELO = 'eleven_multilingual_v2'

/**
 * MP3 44.1 kHz 64 kbps: voz limpa em arquivo pequeno (uma instrução fica na casa de 30 KB).
 * ⚠️ Faixas maiores (128 kbps, PCM) exigem plano superior no ElevenLabs e não melhoram nada
 * numa fala falada em caixa de som de tablet.
 */
const FORMATO = 'mp3_44100_64'

// O teto por pedido mora em `lib/voz-zappy-limites` porque o BOTÃO também precisa dele (este
// arquivo é `server-only`). Reexportado para quem já o importava daqui.
export { MAX_TEXTOS_POR_PEDIDO } from '@/lib/voz-zappy-limites'

/** Quantas frases são geradas ao mesmo tempo. Ver o aviso do teto acima. */
const CONCORRENCIA = 8
/**
 * Teto de FORMA (o que o dicionário aceita como chave). É o da autoria, não o do bom senso.
 * @see MAX_CARACTERES_PARA_GRAVAR
 */
export const MAX_CARACTERES_POR_TEXTO = VOZ_LIMITS.chave
/**
 * Teto do que vale a pena GRAVAR.
 *
 * ⚠⚠ A autoria aceita uma pergunta de 5000 caracteres; virar áudio daria ~5 minutos de fala e
 * ~5000 créditos numa frase só. A fala longa fica de FORA (o player a lê na voz do navegador, como
 * sempre) e o botão diz quantas ficaram — recusar o pedido inteiro por causa de uma castigaria
 * todas as outras falas da aula.
 */
export const MAX_CARACTERES_PARA_GRAVAR = 1200

export class VozNaoConfiguradaError extends MediaNotConfiguredError {}

function requireVozConfig() {
  const env = getEnv()
  if (!env.ELEVENLABS_API_KEY) {
    throw new VozNaoConfiguradaError(
      'Voz do Zappy indisponível: configure ELEVENLABS_API_KEY no admin.',
    )
  }
  return { apiKey: env.ELEVENLABS_API_KEY, voiceId: env.ELEVENLABS_VOICE_ID || VOZ_PADRAO }
}

/**
 * A key do MP3 no R2: o hash do que será FALADO, mais a voz e o modelo.
 *
 * ⚠️⚠️ A voz e o modelo entram no hash de propósito. Trocando a voz do Zappy, as frases antigas
 * continuam existindo (nada quebra no ar) e as novas nascem em arquivo próprio — em vez de uma
 * frase servir áudio da voz anterior porque "o texto não mudou".
 */
export function keyDaVoz(texto: string, voiceId: string): string {
  const hash = createHash('sha256')
    .update(`${voiceId}\n${MODELO}\n${textoFalado(texto)}`)
    .digest('hex')
  return `aulas/voz/${hash.slice(0, 32)}.mp3`
}

export interface GeracaoDeVoz {
  /** O dicionário para gravar no bloco: `texto falado → URL`. */
  vozes: SceneVozes
  /** Quantas frases foram geradas agora (custam crédito) e quantas já existiam. */
  geradas: number
  reaproveitadas: number
  /** Os caracteres efetivamente enviados ao ElevenLabs. É o que o plano cobra. */
  caracteres: number
  /** Falas longas demais para gravar (ver `MAX_CARACTERES_PARA_GRAVAR`); ficam na voz do navegador. */
  longasDemais: number
}

async function sintetizar(
  texto: string,
  cfg: { apiKey: string; voiceId: string },
): Promise<Buffer> {
  const resposta = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(cfg.voiceId)}?output_format=${FORMATO}`,
    {
      method: 'POST',
      headers: { 'xi-api-key': cfg.apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ text: texto, model_id: MODELO }),
      // ⚠⚠ O teto por frase entra na CONTA da rota inteira: 24 falas em ondas de 8 são 3 ondas, e a
      // 20 s cada o pior caso fica em ~60 s — abaixo do corte de ~100 s do Cloudflare, que devolveria
      // um 524 sem mensagem. Uma frase de verdade leva ~3 s.
      signal: AbortSignal.timeout(20_000),
    },
  )
  if (!resposta.ok) {
    // ⚠️ O corpo do erro do ElevenLabs diz o que importa (cota estourada, voz inexistente, texto
    // recusado). Ele vai para o log e para a `cause`; a mensagem ao operador sai da rota.
    const detalhe = await resposta.text().catch(() => '')
    throw new Error(`ElevenLabs respondeu ${resposta.status}: ${detalhe.slice(0, 500)}`)
  }
  return Buffer.from(await resposta.arrayBuffer())
}

/**
 * Gera (ou reaproveita) o áudio de cada texto e devolve o dicionário do bloco.
 *
 * ⚠️ Textos repetidos no mesmo pedido são gerados UMA vez: a chave é o texto falado, então a
 * deduplicação é o próprio `Map`. Vale mais do que parece — a mesma pergunta de palpite aparece em
 * várias cenas da mesma aula.
 *
 * ⚠️⚠️ Uma frase que falhar NÃO derruba as outras: ela fica de fora do dicionário, e o player já
 * sabe o que fazer com dicionário incompleto (lê a fala inteira na voz do navegador, nunca metade
 * em cada voz). O erro sobe só quando NADA foi gerado, que é quando o operador precisa saber.
 */
export async function gerarVozes(textos: readonly string[]): Promise<GeracaoDeVoz> {
  const cfg = requireVozConfig()
  const unicos = [...new Set(textos.map(chaveDeVoz).filter(Boolean))]
  const cabem = unicos.filter((t) => t.length <= MAX_CARACTERES_PARA_GRAVAR)
  const vozes: Record<string, string> = {}
  let geradas = 0
  let reaproveitadas = 0
  let caracteres = 0
  let falhas = 0
  // ⚠ `mapPool` rejeita inteiro se um worker lançar: cada um trata o próprio erro e a frase que
  // falhou fica de fora do dicionário (o player já sabe o que fazer com dicionário incompleto).
  await mapPool(
    cabem,
    async (texto) => {
      const key = keyDaVoz(texto, cfg.voiceId)
      try {
        if (await r2ObjectExists(key)) {
          vozes[texto] = r2PublicUrl(key)
          reaproveitadas += 1
          return
        }
        const mp3 = await sintetizar(texto, cfg)
        const { url } = await r2PutObject({ key, body: mp3, contentType: 'audio/mpeg' })
        vozes[texto] = url
        geradas += 1
        caracteres += texto.length
      } catch (error) {
        falhas += 1
        console.error('[voz-zappy] frase não gerada', { texto: texto.slice(0, 80), error })
      }
    },
    CONCORRENCIA,
  )
  if (falhas && !Object.keys(vozes).length) {
    // ⚠ A mensagem NÃO culpa o ElevenLabs: o R2 fora do ar derruba tudo do mesmo jeito, e mandar o
    // operador conferir a cota de um serviço saudável é o tipo de pista errada que custa uma tarde.
    throw new Error('Nenhuma frase pôde ser gerada. O detalhe do erro está no log do admin.')
  }
  return { vozes, geradas, reaproveitadas, caracteres, longasDemais: unicos.length - cabem.length }
}
