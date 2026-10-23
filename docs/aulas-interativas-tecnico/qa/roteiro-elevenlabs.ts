import direcoesDeVoz from './direcoes-voz.json'

/** Contrato de produção: um master integral e substituições kids da mesma frase. */
export interface IntervencaoKids {
  id: string
  clipe: string
  personagem: 'Debinha' | 'Dedé'
  falaPrincipal: string
  falaPersonagem: string
  ancoraAntes: string
  ancoraDepois: string
  ocorrencia: number
  tags: string[]
}

export interface ParteFalado {
  clipe: string
  texto: string
  intervencoes: IntervencaoKids[]
}

/** O recado é derivado do manifesto; as falas gravadas permanecem na fonte de produção. */
export function sincronizarRecadosNaPagina(
  roteiro: string,
  manifesto: { sections: { blockKeys: string[] }[]; blocks: { key: string; content?: unknown }[] },
): string {
  const secoes = roteiro.replaceAll('\r\n', '\n').split(/(?=^## )/m)
  if (secoes.length - 1 !== manifesto.sections.length)
    throw new Error('Partes do roteiro e manifesto divergentes')
  const sincronizado = secoes
    .map((corpo, n) => {
      if (n === 0) return corpo
      const secao = manifesto.sections[n - 1]
      if (!secao) throw new Error('Parte ausente')
      const recados = secao.blockKeys.flatMap((key) => {
        const conteudo = manifesto.blocks.find((b) => b.key === key)?.content
        return conteudo &&
          typeof conteudo === 'object' &&
          'kind' in conteudo &&
          conteudo.kind === 'dialogue' &&
          'text' in conteudo &&
          typeof conteudo.text === 'string'
          ? [conteudo.text]
          : []
      })
      const semRecado = corpo
        .replace(/^\*\*Recado na página \(não gravar\):\*\*.*\n?/gm, '')
        .trimEnd()
      return `${semRecado}\n\n${recados.map((t) => `**Recado na página (não gravar):** ${t}\n`).join('\n')}\n`
    })
    .join('')
    .trimEnd()
  return `${sincronizado}\n`
}

const TAGS = new Set(direcoesDeVoz)

/** Só para conferência/legenda: as tags nunca são conteúdo público. */
export function semTags(texto: string): string {
  return texto
    .replace(/\[[^\]\n]+\]/g, '')
    .replace(/[“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Âncoras legíveis para localizar o corte, sem começar ou terminar no meio de uma palavra. */
export function contextoDeEdicao(texto: string, lado: 'antes' | 'depois'): string {
  const limpo = semTags(texto)
  if (limpo.length <= 120) return limpo
  if (lado === 'antes') {
    const trecho = limpo.slice(-120)
    return trecho.slice(trecho.indexOf(' ') + 1).trim()
  }
  const trecho = limpo.slice(0, 120)
  return trecho.slice(0, trecho.lastIndexOf(' ')).trim()
}

export function validarTextoDeVoz(texto: string): void {
  if (!texto.trim()) throw new Error('Fala vazia')
  if (/(?:Uma dúvida possível é|Você pode pensar assim):/i.test(texto)) {
    throw new Error('Preparação mecânica de pergunta: reescreva como fala conversada')
  }
  if (/<\/?(?:break|speak|prosody)\b/i.test(texto)) throw new Error('SSML não é suportado pelo v4')
  if (/^(?:#{1,6}\s|\*\*|Professora:|Professor:|Na tela:|Debinha:|Dedé:)/m.test(texto)) {
    throw new Error('Nota de produção no texto de síntese')
  }
  for (const tag of texto.match(/\[[^\]\n]+\]/g) ?? []) {
    if (!TAGS.has(tag)) throw new Error(`tag de voz fora do contrato de produção: ${tag}`)
  }
  if (texto.replace(/\[[^\]\n]+\]/g, '').match(/[[\]]/)) throw new Error('tag incompleta')
}

function intencaoDaFala(texto: string): string {
  if (/^(?:Talvez você|Você pode estar pensando|Aí você pode me dizer)/i.test(texto))
    return '[thoughtful]'
  if (/^(?:Se (?:no seu|algo não|alguma|a frase|os blocos)|Depois de corrigir)/i.test(texto))
    return '[reassuring, encouraging voice]'
  if (/^(?:Oi\b|Olá\b)/i.test(texto)) return '[upbeat, welcoming voice]'
  if (/^(?:Agora é a sua vez|Agora (?:vamos testar|teste|jogue)|Se quiser)/i.test(texto))
    return '[upbeat, encouraging voice]'
  if (/^(?:Pronto\b|Olha só o que você|Seu jogo está no Mural|Parabéns)/i.test(texto))
    return '[pleased, lively voice]'
  if (/^(?:Olha só:|Olha aqui:|Tá vendo\?|Percebeu\?)/i.test(texto))
    return '[interested, animated voice]'
  if (
    /^(?:Repare|Confira|Deixe à vista|Abra |Arraste|Clique |No (?:campo|nome|menu)|Na (?:mesma|imagem)|Agora (?:abra|deixe|troque|clique)|Por último, (?:deixe|clique))/i.test(
      texto,
    )
  )
    return '[confident, clear, unhurried voice]'
  if (/\?$/.test(texto)) return '[curious]'
  return '[engaging, energetic, conversational voice]'
}

/** Energia de condução, com mudanças de intenção e precisão nos gestos. */
export function prepararFala(texto: string): string {
  return texto
    .trim()
    .split(/\n\s*\n/)
    .map((paragrafo) => {
      const p = paragrafo.replace(/\s+/g, ' ').trim()
      if (/^\[[^\]]+\]/.test(p)) return p
      const tag = intencaoDaFala(p)
      // Marcar a mudança dentro do parágrafo: um encaixe, uma descoberta e uma
      // correção não precisam herdar a mesma interpretação até o fim da fala.
      const dirigida = p.replace(
        /([.!?]\s+)(Olha só:|Olha aqui:|Repare(?::| que| no| na)|Confira |Se no seu |Se algo não |Depois de corrigir, |Funcionou\?|Agora teste(?:!|:)|Seu jogo está no Mural!)/g,
        (_, separador: string, inicio: string) => `${separador}${intencaoDaFala(inicio)} ${inicio}`,
      )
      return `${tag} ${dirigida}`
    })
    .join('\n\n')
}

export function validarIntervencoes(parte: ParteFalado): void {
  validarTextoDeVoz(parte.texto)
  const master = semTags(parte.texto)
  const ids = new Set<string>()
  let anterior = -1
  for (const i of parte.intervencoes) {
    if (ids.has(i.id)) throw new Error(`ID duplicado: ${i.id}`)
    ids.add(i.id)
    if (i.clipe !== parte.clipe) throw new Error(`${i.id}: clipe divergente`)
    if (i.personagem !== 'Debinha' && i.personagem !== 'Dedé')
      throw new Error('Personagem inválido')
    const frase = semTags(i.falaPrincipal)
    if (!frase || frase !== semTags(i.falaPersonagem))
      throw new Error(`${i.id}: deve ser a mesma frase`)
    if (!i.ancoraAntes.trim() || !i.ancoraDepois.trim()) throw new Error(`${i.id}: âncora vazia`)
    if (!Number.isInteger(i.ocorrencia) || i.ocorrencia < 1)
      throw new Error(`${i.id}: ocorrência inválida`)
    const posicoes: number[] = []
    let inicio = 0
    while (inicio <= master.length) {
      const pos = master.indexOf(frase, inicio)
      if (pos < 0) break
      posicoes.push(pos)
      inicio = pos + frase.length
    }
    const candidatas = posicoes.filter(
      (pos) =>
        master.slice(0, pos).trimEnd().endsWith(semTags(i.ancoraAntes)) &&
        master
          .slice(pos + frase.length)
          .trimStart()
          .startsWith(semTags(i.ancoraDepois)),
    )
    if (candidatas.length > 1) throw new Error(`${i.id}: âncora ambígua`)
    const pos = posicoes[i.ocorrencia - 1]
    if (pos === undefined || candidatas[0] !== pos)
      throw new Error(`${i.id}: frase ou âncora ausente`)
    if (pos <= anterior) throw new Error(`${i.id}: intervenções fora de ordem`)
    anterior = pos
    validarTextoDeVoz(`${i.tags.join(' ')} ${i.falaPersonagem}`)
  }
}

export function montarTextoElevenLabs(partes: ParteFalado[]): string {
  if (!partes.length) throw new Error('Roteiro sem clipes')
  const ids = new Set<string>()
  for (const parte of partes) {
    if (ids.has(parte.clipe)) throw new Error(`Clipe duplicado: ${parte.clipe}`)
    ids.add(parte.clipe)
    validarIntervencoes(parte)
  }
  return `${partes.map((p) => p.texto.trim()).join('\n\n[long pause]\n\n')}\n`
}

function celula(texto: string): string {
  return texto.replaceAll('|', '\\|').replaceAll('\n', ' ')
}

export function renderizarClipe(parte: ParteFalado, tela: string): string {
  validarIntervencoes(parte)
  const linhas = [
    `**Clipe:** \`${parte.clipe}\``,
    '',
    ...(tela.trim() ? [`**Na tela:** ${tela.trim()}`, ''] : []),
    '**Fala para ElevenLabs:**',
    '',
    '```text',
    parte.texto.trim(),
    '```',
    '',
  ]
  if (parte.intervencoes.length) {
    linhas.push(
      '**Substituições na edição kids:**',
      '',
      '| ID | Personagem | Ocorrência | Âncora anterior | Fala exata substituída | Âncora posterior | Tags |',
      '| --- | --- | --- | --- | --- | --- | --- |',
    )
    for (const i of parte.intervencoes) {
      linhas.push(
        `| ${[i.id, i.personagem, String(i.ocorrencia), i.ancoraAntes, i.falaPrincipal, i.ancoraDepois, i.tags.join(' ')].map(celula).join(' | ')} |`,
      )
    }
    linhas.push(
      '',
      'No adulto, manter toda a fala da professora. No kids, silenciar apenas o trecho marcado e substituir pelo áudio do personagem, sem sobrepor vozes.',
      '',
    )
  }
  return linhas.join('\n')
}

export function extrairPartesElevenLabs(roteiro: string): ParteFalado[] {
  const marcadores = [...roteiro.matchAll(/^\*\*Clipe:\*\* `([^`]+)`\s*$/gm)]
  const partes: ParteFalado[] = []
  for (const [n, m] of marcadores.entries()) {
    const clipe = m[1]
    if (!clipe) throw new Error('Chave de clipe vazia')
    const corpo = roteiro.slice((m.index ?? 0) + m[0].length, marcadores[n + 1]?.index)
    const fala = corpo.match(/\*\*Fala para ElevenLabs:\*\*\s*\n```text\r?\n([\s\S]*?)\r?\n```/)
    if (!fala?.[1]) throw new Error(`${clipe}: falta fala para ElevenLabs`)
    const intervencoes: IntervencaoKids[] = []
    for (const linha of corpo
      .split('\n')
      .filter((l) => /^\| [^|]+ \| (?:Debinha|Dedé) \|/.test(l))) {
      const campos = linha
        .split(/(?<!\\)\|/)
        .slice(1, -1)
        .map((c) => c.trim().replaceAll('\\|', '|'))
      const [id, personagem, ocorrencia, ancoraAntes, frase, ancoraDepois, tags] = campos
      if (
        campos.length !== 7 ||
        !id ||
        !frase ||
        !ancoraAntes ||
        !ancoraDepois ||
        !tags ||
        (personagem !== 'Debinha' && personagem !== 'Dedé')
      ) {
        throw new Error(`${clipe}: tabela de intervenção inválida`)
      }
      intervencoes.push({
        id,
        clipe,
        personagem,
        ocorrencia: Number(ocorrencia),
        ancoraAntes,
        ancoraDepois,
        falaPrincipal: frase,
        falaPersonagem: frase,
        tags: tags.match(/\[[^\]]+\]/g) ?? [],
      })
    }
    partes.push({ clipe, texto: fala[1].trim(), intervencoes })
  }
  montarTextoElevenLabs(partes)
  return partes
}
