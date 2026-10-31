import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { ManifestoDeDesafiosSchema } from '../../packages/arquipelago-contracts/src/desafios'

/** Fontes locais conferidas contra a proposta. Não representam publicação ou conclusão. */
export const FONTES_LOCAIS = [
  { pasta: 'faisca/desafio-primeiro-jogo', posto: 1, papel: 'base2d' },
  { pasta: 'faisca/a-ilha-do-farol', posto: 1, papel: 'base3d' },
  { pasta: 'faisca/o-jardim-secreto', posto: 1, papel: 'mission' },
  { pasta: 'construtor/nave-contra-asteroides', posto: 2, papel: 'base2d' },
  { pasta: 'inventor/corre-dino', posto: 3, papel: 'base2d' },
  { pasta: 'faisca/cade-todo-mundo', posto: 1, papel: 'extra' },
  { pasta: 'construtor/o-jogo-do-meu-jeito', posto: 2, papel: 'extra' },
  { pasta: 'faisca/meu-primeiro-desenho-no-pinta', posto: 1, papel: 'extra' },
  { pasta: 'faisca/poder-o-segredo-da-cabana', posto: 1, papel: 'power' },
  { pasta: 'faisca/poder-o-bau-dos-simbolos', posto: 1, papel: 'power' },
  { pasta: 'faisca/poder-moedas-no-caminho', posto: 1, papel: 'power' },
  { pasta: 'faisca/poder-a-ponte-apressada', posto: 1, papel: 'power' },
] as const
const ILHAS = [
  ['sua-ilha', 1],
  ['bosque', 2],
  ['vila-doce', 3],
  ['recife', 4],
  ['pico', 5],
  ['vale', 6],
  ['nuvens', 7],
  ['farol', 8],
] as const
const ler = (caminho: string): unknown =>
  JSON.parse(readFileSync(new URL(caminho, import.meta.url), 'utf8'))
function listaDeBlocos(pasta: string): string[] {
  const lista = ler(`../aulas-interativas/${pasta}/blocos.json`) as Record<string, string[]>
  return [...(lista.blocks ?? lista['2d'] ?? []), ...(lista['3d'] ?? [])]
}
function tipos(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.flatMap(tipos)
  if (!valor || typeof valor !== 'object') return []
  const objeto = valor as Record<string, unknown>
  return [
    ...(typeof objeto.type === 'string' && objeto.type.startsWith('sz_') ? [objeto.type] : []),
    ...Object.values(objeto).flatMap(tipos),
  ]
}
function tiposDoProjeto(projeto: unknown): string[] {
  return [...new Set(tipos((projeto as { blocksState: unknown }).blocksState))].sort()
}
function classificacao(ilha: string, quadro: number | null) {
  // A sua ilha aplica o próprio repertório do Faísca, depois dos cursos dele (C03a).
  if (ilha === 'sua-ilha') return 'aplicacao-em-blocos'
  // O Farol (C03b) pede um projeto da pessoa, com critérios e sem resposta pronta.
  if (ilha === 'farol') return 'projeto-autoral'
  if (ilha === 'bosque' && [4, 6, null].includes(quadro)) return 'aplicacao-em-blocos'
  if (ilha === 'nuvens' && quadro === 5)
    return 'apoio-preparado-em-blocos'
  return 'retomada-em-blocos'
}
export function inventarioDeRepertorio() {
  const fontes = FONTES_LOCAIS.map((f) => ({ ...f, blocos: listaDeBlocos(f.pasta) }))
  return ILHAS.flatMap(([ilha, posto]) =>
    (['kids', 'adulto'] as const).flatMap((publico) => {
      const manifesto = ManifestoDeDesafiosSchema.parse(
        ler(`./${ilha}/${ilha}${publico === 'adulto' ? '-adulto' : ''}.manifesto.json`),
      )
      return manifesto.desafios.map((d) => {
        const inicial = tiposDoProjeto(d.conteudo.projetoInicial)
        const gabarito = tiposDoProjeto(d.conteudo.gabarito)
        const disponiveis = fontes.filter((f) => f.posto <= posto)
        const cobertura = gabarito.map((bloco) => ({
          bloco,
          trilha: disponiveis
            .filter((f) => f.papel !== 'extra' && f.papel !== 'power' && f.blocos.includes(bloco))
            .map((f) => f.pasta),
          opcionais: disponiveis
            .filter((f) => (f.papel === 'extra' || f.papel === 'power') && f.blocos.includes(bloco))
            .map((f) => f.pasta),
        }))
        return {
          slug: d.slug,
          publico,
          ilha: d.ilha,
          posto,
          quadro: d.quadro,
          tipo: d.tipo,
          titulo: d.conteudo.titulo,
          classificacao: classificacao(ilha, d.quadro),
          linguagem: (d.conteudo.gabarito as { programmingLanguage: string }).programmingLanguage,
          modo: (d.conteudo.gabarito as { mode: string }).mode,
          publicarAutomaticamente: d.publicar ?? false,
          objetivosObrigatorios: d.conteudo.objetivos
            .filter((o) => !o.optional)
            .map((o) => ({ id: o.id, descricao: o.label })),
          tiposJaPresentes: gabarito.filter((b) => inicial.includes(b)),
          tiposAcrescentados: gabarito.filter((b) => !inicial.includes(b)),
          semFonteNaTrilha: cobertura.filter((c) => c.trilha.length === 0).map((c) => c.bloco),
          cobertura,
        }
      })
    }),
  )
}
export function relatorioDeRepertorio() {
  const linhas = inventarioDeRepertorio().filter((d) => d.publico === 'kids')
  const limpar = (s: string) => s.replaceAll('|', '/').replaceAll('\n', ' ')
  return `# Inventário de repertório dos desafios\n\nGerado por \`bun docs/desafios-do-jogo/repertorio-local.ts\`. Mesmas regras e projetos nos dois públicos, com textos próprios. São ${linhas.length} atividades, cada uma em Kids e adulto. Fonte de publicação e posse de blocos: Members. Este inventário só confere arquivos locais.\n\nTipos já presentes não provam compreensão, e tipos novos não são a única evidência de mudança: alterar um valor ou uma condição pode manter o mesmo tipo. A prova pedagógica continua sendo o executor com inicial, gabarito e negativos.\n\nO apoio preparado de lista não comprova construir uma lista ou um laço. As atividades em blocos do Recife e do Pico não comprovam Python; as do Vale e das Nuvens não comprovam JavaScript textual ou Pro. As aplicações correspondentes ficam em C02. Só pede publicação automática a atividade com todas as fontes na trilha (C01b); a importação e a barreira C01a continuam com a equipe.\n\n| Ilha | Atividade | Intenção | Objetivos obrigatórios atuais | Tipos sem fonte local na trilha | Publicação |\n| --- | --- | --- | --- | --- | --- |\n${linhas.map((d) => `| ${d.ilha} | ${limpar(d.titulo)} | ${d.classificacao} | ${d.objetivosObrigatorios.map((o) => limpar(o.descricao)).join('; ')} | ${d.semFonteNaTrilha.join(', ') || 'Nenhum neste recorte'} | ${d.publicarAutomaticamente ? 'pedida' : 'não'} |`).join('\n')}\n\nDetalhes de cada público e fonte por bloco: [repertorio-local.json](repertorio-local.json). Nenhuma fonte local comprova que o curso esteja publicado ou concluído. Lacunas não são preenchidas por blocos manuais.\n`
}
/** As fontes comuns ficam uma vez no artefato, sem repetir toda a cobertura em cada público. */
export function artefatoDeRepertorio() {
  return {
    fontes: FONTES_LOCAIS.map((f) => ({ ...f, blocos: listaDeBlocos(f.pasta) })),
    desafios: inventarioDeRepertorio().map(({ cobertura: _, ...desafio }) => desafio),
  }
}
if (import.meta.main) {
  await Bun.write(
    new URL('./repertorio-local.json', import.meta.url),
    `${JSON.stringify(artefatoDeRepertorio(), null, 2)}\n`,
  )
  await Bun.write(new URL('./repertorio-local.md', import.meta.url), relatorioDeRepertorio())
  const formatar = Bun.spawn(
    [
      'bunx',
      'biome',
      'format',
      '--write',
      fileURLToPath(new URL('./repertorio-local.json', import.meta.url)),
    ],
    {
      cwd: fileURLToPath(new URL('../../', import.meta.url)),
      stdout: 'inherit',
      stderr: 'inherit',
    },
  )
  if ((await formatar.exited) !== 0)
    throw new Error('Não foi possível formatar o inventário gerado.')
}
