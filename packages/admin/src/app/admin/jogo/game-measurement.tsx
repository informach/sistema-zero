'use client'

import {
  diaDeSaoPaulo,
  FiltroDaMedicaoSchema,
  type FonteQueFalta,
  type NumeroDaMedicao,
  type RelatorioDaMedicaoLido,
  RelatorioDaMedicaoLidoSchema,
} from '@sistemazero/arquipelago-contracts'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'
import { useEffect, useState } from 'react'
import { gameRequest } from './game-request'

const semFonte: Record<FonteQueFalta, string> = {
  'volta-adulto':
    'Volta dos adultos: o histórico de dias de jogo ainda não é registrado para esta comunidade.',
  'satisfacao-dos-pais':
    'Satisfação dos pais: o jogo não pergunta aos pais; falta uma fonte (pesquisa ou avaliação na área dos pais).',
  permanencia:
    'Permanência na assinatura: a renovação fica nos pagamentos, que o serviço do jogo não lê.',
  compras:
    'Compras na galeria: a leitura das compras no Members não respondeu agora (ou o serviço ainda não mede como se aprende).',
  minijogos:
    'Minijogos aprovados: a fonte de aprovações não está disponível nesta versão do serviço.',
  'curso-24h':
    'Volta ao curso em 24 horas: a leitura das aulas concluídas no Members não respondeu agora, ou o período pediria leituras demais.',
  'conclusoes-curso':
    'Conclusões antes e depois de jogar: falta uma fonte integrada com as datas de conclusão e de entrada no jogo.',
}
/**
 * O texto de uma fonte que falta. Uma fonte nova, que este Admin ainda não conhece (o serviço subiu
 * antes), aparece com o nome dela e um texto padrão em vez de quebrar o painel (lacunas, 01/11/2026).
 */
export function textoDaFonteQueFalta(codigo: string): string {
  return (
    semFonte[codigo as FonteQueFalta] ??
    `${codigo}: o serviço avisa que esta medida ainda não tem fonte. Atualize o Admin para ver a explicação.`
  )
}
export function measurementNumber(n: NumeroDaMedicao): string {
  return n.situacao === 'disponivel'
    ? n.valor.toLocaleString('pt-BR')
    : n.situacao === 'aguardando'
      ? 'Aguardando'
      : 'Poucos dados'
}
const dateLabel = (v: string) => v.split('-').reverse().join('/')

/** Uma média com uma casa, só quando os dois números puderam ser mostrados. */
function media(total: NumeroDaMedicao, vezes: NumeroDaMedicao): string | null {
  if (total.situacao !== 'disponivel' || vezes.situacao !== 'disponivel' || vezes.valor === 0)
    return null
  return (total.valor / vezes.valor).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

/**
 * Como se aprende no jogo (§6.28, A26): tentativas e dicas até concluir, acerto na primeira,
 * rotinas dos Lumis que funcionam, reenvios de minijogo e compras na galeria.
 */
function Aprendizagem({ a }: { a: NonNullable<RelatorioDaMedicaoLido['aprendizagem']> }) {
  const tentativas = media(a.tentativas, a.conclusoesMedidas)
  const dicas = media(a.dicas, a.conclusoesMedidas)
  const linhas: [string, NumeroDaMedicao, string | null][] = [
    ['Conclusões medidas', a.conclusoesMedidas, null],
    ['Acertos na primeira tentativa', a.acertoNaPrimeira, null],
    ['Tentativas até concluir', a.tentativas, tentativas ? `${tentativas} por conclusão` : null],
    ['Conclusões sem abrir dica', a.semDica, null],
    ['Dicas abertas até concluir', a.dicas, dicas ? `${dicas} por conclusão` : null],
    ['Rotinas dos Lumis montadas', a.rotinas, 'Guardadas hoje, em qualquer período'],
    ['Rotinas que funcionam', a.rotinasQueFuncionam, 'Rodam até o fim sem erro'],
    ['Reenvios de minijogo', a.reenvios, null],
    ...(a.compras
      ? [['Compras na galeria', a.compras, null] as [string, NumeroDaMedicao, null]]
      : []),
    ...(a.moedasNasCompras
      ? [['Moedas gastas na galeria', a.moedasNasCompras, null] as [string, NumeroDaMedicao, null]]
      : []),
  ]
  return (
    <section aria-label="Como se aprende no jogo" className="space-y-3">
      <h3 className="font-semibold">Como se aprende no jogo</h3>
      <p className="text-sm text-muted-foreground">
        Conclusões de desafios no período, medidas desde 31/10/2026: tentativas e dicas abertas até
        concluir. As rotinas são as guardadas hoje.
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {linhas.map(([titulo, numero, nota]) => (
          <article key={titulo} className="min-w-0 rounded-xl border border-border bg-card p-4">
            <h4 className="text-sm text-muted-foreground">{titulo}</h4>
            <p className="mt-2 break-words text-lg font-semibold tabular-nums">
              {measurementNumber(numero)}
            </p>
            {nota ? <p className="mt-1 text-xs text-muted-foreground">{nota}</p> : null}
          </article>
        ))}
      </div>
    </section>
  )
}

export function GameMeasurement({
  publico,
  onPublicoChange,
}: {
  publico: 'kids' | 'adulto'
  onPublicoChange: (publico: 'kids' | 'adulto') => void
}) {
  const [hoje] = useState(() => diaDeSaoPaulo(new Date()))
  const [de, setDe] = useState(() =>
    new Date(Date.parse(hoje) - 27 * 86_400_000).toISOString().slice(0, 10),
  )
  const [ate, setAte] = useState(hoje)
  const [aplicado, setAplicado] = useState({ de, ate })
  const [resultado, setResultado] = useState<RelatorioDaMedicaoLido | null>(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  useEffect(() => {
    const controller = new AbortController()
    setCarregando(true)
    setResultado(null)
    setErro('')
    const query = new URLSearchParams({ ...aplicado, publico })
    void gameRequest(`medicao?${query}`, 'GET', undefined, controller.signal)
      .then((raw) => {
        if (controller.signal.aborted) return
        const report = RelatorioDaMedicaoLidoSchema.parse(raw)
        if (
          report.periodo.publico !== publico ||
          report.periodo.de !== aplicado.de ||
          report.periodo.ate !== aplicado.ate
        )
          throw new Error('O relatório não corresponde ao filtro solicitado.')
        setResultado(report)
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted)
          setErro(e instanceof Error ? e.message : 'Não foi possível carregar a medição.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false)
      })
    return () => controller.abort()
  }, [aplicado, publico])
  // A lente troca antes do efeito. Nunca mostrar dados da comunidade anterior nesse intervalo.
  const report = resultado?.periodo.publico === publico ? resultado : null
  return (
    <section className="min-w-0 space-y-5" aria-label="Medição do Arquipélago">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Medição do Arquipélago</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe a volta ao jogo, as aparências e as aprovações. Os dias seguem o horário de São
          Paulo.
        </p>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault()
            const filtro = FiltroDaMedicaoSchema.safeParse({ de, ate, publico })
            if (!filtro.success || ate > hoje) {
              setErro('Escolha até 90 dias, sem datas futuras e com início antes do fim.')
              return
            }
            setAplicado({ de, ate })
          }}
        >
          <label className="min-w-0 space-y-1 text-sm">
            Comunidade
            <Select
              aria-label="Comunidade da medição"
              value={publico}
              onChange={(e) => onPublicoChange(e.target.value === 'adulto' ? 'adulto' : 'kids')}
            >
              <option value="kids">Kids</option>
              <option value="adulto">Adultos</option>
            </Select>
          </label>
          <label className="min-w-0 space-y-1 text-sm">
            De
            <Input
              className="min-w-0"
              type="date"
              value={de}
              max={hoje}
              required
              onChange={(e) => setDe(e.target.value)}
            />
          </label>
          <label className="min-w-0 space-y-1 text-sm">
            Até
            <Input
              className="min-w-0"
              type="date"
              value={ate}
              max={hoje}
              required
              onChange={(e) => setAte(e.target.value)}
            />
          </label>
          <Button type="submit" className="self-end">
            Aplicar período
          </Button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          Grupos com menos de 5 pessoas mostram Poucos dados. Não são exibidos nomes ou dados
          individuais.
        </p>
      </div>
      {erro && (
        <div
          role="alert"
          className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          <p>{erro}</p>
          <Button variant="outline" onClick={() => setAplicado((v) => ({ ...v }))}>
            Tentar novamente
          </Button>
        </div>
      )}
      {carregando && (
        <p role="status" className="p-4 text-sm text-muted-foreground">
          Carregando a medição.
        </p>
      )}
      {report && !carregando && (
        <>
          <p className="text-sm text-muted-foreground">
            Período: {dateLabel(report.periodo.de)} a {dateLabel(report.periodo.ate)} ·{' '}
            {publico === 'kids' ? 'Kids' : 'Adultos'}
          </p>
          <section aria-label="Fotografia atual das aparências" className="space-y-3">
            <h3 className="font-semibold">Fotografia atual das aparências</h3>
            <p className="text-sm text-muted-foreground">
              Aparências guardadas hoje nos projetos azuis recebidos no período escolhido. Uma troca
              feita hoje pode mudar esta fotografia de um período antigo.
            </p>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
              {(
                [
                  ['Aparências do Pinta e Molda', report.criacao.pintaMolda],
                  ['Aparências de criações guardadas', report.criacao.criacaoGuardada],
                  ['Aparências da galeria', report.criacao.galeria],
                ] as const
              ).map(([titulo, numero]) => (
                <article
                  key={titulo}
                  className="min-w-0 rounded-xl border border-border bg-card p-4"
                >
                  <h4 className="text-sm text-muted-foreground">{titulo}</h4>
                  <p
                    className={`mt-2 break-words font-semibold tabular-nums ${numero.situacao === 'disponivel' ? 'text-2xl' : 'text-lg text-muted-foreground'}`}
                  >
                    {measurementNumber(numero)}
                  </p>
                </article>
              ))}
            </div>
          </section>
          <section aria-label="Mudanças de aparência no período" className="space-y-3">
            <h3 className="font-semibold">Mudanças de aparência no período</h3>
            <p className="text-sm text-muted-foreground">
              Aplicações e trocas confirmadas pelo salvamento, na data em que o servidor as recebeu.
              A coleta começa com a atualização do serviço. O primeiro salvamento é apenas a base, e
              o passado não é reconstruído. Reaplicar uma aparência pode contar outra mudança.
            </p>
            {report.mudancasDeAparencia ? (
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                {(
                  [
                    ['Com origem Pinta ou Molda', report.mudancasDeAparencia.pintaMolda],
                    ['Com origem criação guardada', report.mudancasDeAparencia.criacaoGuardada],
                    ['Com origem galeria', report.mudancasDeAparencia.galeria],
                  ] as const
                ).map(([titulo, numero]) => (
                  <article
                    key={titulo}
                    className="min-w-0 rounded-xl border border-border bg-card p-4"
                  >
                    <h4 className="text-sm text-muted-foreground">{titulo}</h4>
                    <p className="mt-2 break-words text-lg font-semibold tabular-nums">
                      {measurementNumber(numero)}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm">
                O histórico de mudanças ainda não está disponível neste serviço.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              As origens são as declaradas nos projetos. Mudança de aparência não comprova criação,
              compra ou aprendizado. As datas de criação e compra não estão integradas a esta
              medição.
            </p>
          </section>
          <section aria-label="Aprovações no período" className="space-y-3">
            <h3 className="font-semibold">Aprovações no período</h3>
            <p className="text-sm text-muted-foreground">
              Primeira aprovação de cada desafio por pessoa no período.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ['Desafios do Estúdio aprovados', report.desafiosAprovados],
                  ...(report.minijogos ? [['Minijogos aprovados', report.minijogos] as const] : []),
                ] as const
              ).map(([titulo, numero]) => (
                <article
                  key={titulo}
                  className="min-w-0 rounded-xl border border-border bg-card p-4"
                >
                  <h4 className="text-sm text-muted-foreground">{titulo}</h4>
                  <p className="mt-2 break-words text-lg font-semibold tabular-nums">
                    {measurementNumber(numero)}
                  </p>
                </article>
              ))}
            </div>
          </section>
          {report.aprendizagem ? <Aprendizagem a={report.aprendizagem} /> : null}
          <div className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-3 sm:p-5">
            <h3 className="font-semibold">Volta ao jogo</h3>
            <p className="text-sm text-muted-foreground">
              Cada linha reúne quem teve o primeiro dia de tempo livre registrado naquela data. Dia
              7 é o sétimo dia, seis dias após a entrada. Só dias encerrados entram na conferência.
            </p>
            {report.volta.situacao === 'sem-fonte' ? (
              <p className="text-sm">
                O histórico de dias de jogo dos adultos ainda não está disponível.
              </p>
            ) : (
              <>
                <table className="w-full table-fixed text-left text-xs sm:text-sm">
                  <caption className="sr-only">
                    Pessoas que voltaram por primeiro dia registrado no jogo
                  </caption>
                  <thead>
                    <tr className="border-b border-border">
                      {['Primeiro dia', 'Dia 1', 'Dia seguinte', 'Dia 7'].map((titulo) => (
                        <th key={titulo} scope="col" className="break-words px-1 py-3 font-medium">
                          {titulo}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.volta.coortes.map((c) => (
                      <tr key={c.dia} className="border-b border-border last:border-0">
                        <th scope="row" className="px-1 py-3 font-normal">
                          {dateLabel(c.dia)}
                        </th>
                        {[c.dia1, c.diaSeguinte, c.dia7].map((n, i) => (
                          <td
                            key={['dia1', 'seguinte', 'sete'][i]}
                            className="break-words px-1 py-3 tabular-nums"
                          >
                            {measurementNumber(n)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {report.volta.coortes.length === 0 && (
                  <p className="py-3 text-sm text-muted-foreground">
                    Sem primeiros dias de jogo encerrados neste período.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Aguardando significa que o dia de retorno ainda não terminou. A linha inteira pode
                  ser protegida para não revelar grupos pequenos por subtração.
                </p>
              </>
            )}
          </div>
          {report.voltaAoCurso && (
            <div className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-3 sm:p-5">
              <h3 className="font-semibold">Volta ao curso depois de jogar</h3>
              <p className="text-sm text-muted-foreground">
                Dias de jogo (cada pessoa em cada dia) e, deles, os que tiveram aula do curso
                concluída até 24 horas depois do fim de uma sessão. É a mesma conta do cartão dos
                pais e diz o que aconteceu, não que o jogo foi a causa. Só entram sessões com as 24
                horas já passadas.
              </p>
              <dl className="grid grid-cols-2 gap-3">
                {(
                  [
                    ['Dias de jogo', report.voltaAoCurso.diasDeJogo],
                    ['Com aula concluída depois', report.voltaAoCurso.diasComAula],
                  ] as const
                ).map(([titulo, numero]) => (
                  <div key={titulo} className="min-w-0 rounded-lg bg-muted/40 p-3">
                    <dt className="text-sm text-muted-foreground">{titulo}</dt>
                    <dd
                      className={`mt-1 font-semibold tabular-nums ${numero.situacao === 'disponivel' ? 'text-2xl' : 'text-lg text-muted-foreground'}`}
                    >
                      {measurementNumber(numero)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          <aside
            className="space-y-2 rounded-xl border border-border bg-muted/30 p-4"
            aria-label="Limites das fontes"
          >
            <h3 className="text-sm font-semibold">O que estes dados ainda não mostram</h3>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {report.semFonte.map((codigo) => (
                <li key={codigo}>{textoDaFonteQueFalta(codigo)}</li>
              ))}
            </ul>
          </aside>
        </>
      )}
    </section>
  )
}
