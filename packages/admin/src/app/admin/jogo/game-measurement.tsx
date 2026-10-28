'use client'

import {
  diaDeSaoPaulo,
  FiltroDaMedicaoSchema,
  type NumeroDaMedicao,
  type RelatorioDaMedicao,
  RelatorioDaMedicaoSchema,
} from '@sistemazero/arquipelago-contracts'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'
import { useEffect, useState } from 'react'
import { gameRequest } from './game-request'

const semFonte: Record<RelatorioDaMedicao['semFonte'][number], string> = {
  'volta-adulto':
    'Volta dos adultos: o histórico de dias de jogo ainda não é registrado para esta comunidade.',
  compras:
    'Objetos comprados: a origem galeria não comprova compra. Falta um histórico de aquisições.',
  minijogos:
    'Minijogos aprovados: os desafios ainda não têm uma classificação que identifique quais são minijogos.',
  'curso-24h':
    'Volta ao curso em 24 horas: depende da fonte de atividade de cursos do Members integrada ao histórico do jogo.',
  'conclusoes-curso':
    'Conclusões antes e depois de jogar: falta uma fonte integrada com as datas de conclusão e de entrada no jogo.',
}
export function measurementNumber(n: NumeroDaMedicao): string {
  return n.situacao === 'disponivel'
    ? n.valor.toLocaleString('pt-BR')
    : n.situacao === 'aguardando'
      ? 'Aguardando'
      : 'Poucos dados'
}
const dateLabel = (v: string) => v.split('-').reverse().join('/')

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
  const [resultado, setResultado] = useState<RelatorioDaMedicao | null>(null)
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
        const report = RelatorioDaMedicaoSchema.parse(raw)
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
          Acompanhe a volta ao jogo e as criações da comunidade. Os dias seguem o horário de São
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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(
              [
                ['Aparências do Pinta e Molda', report.criacao.pintaMolda],
                ['Criações guardadas', report.criacao.criacaoGuardada],
                ['Aparências da galeria', report.criacao.galeria],
                ['Desafios do Estúdio aprovados', report.desafiosAprovados],
              ] as const
            ).map(([titulo, numero]) => (
              <article key={titulo} className="min-w-0 rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm text-muted-foreground">{titulo}</h3>
                <p className="mt-2 break-words text-2xl font-semibold tabular-nums">
                  {measurementNumber(numero)}
                </p>
              </article>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            As aparências são as que estão guardadas hoje nos projetos azuis ganhos no período, não
            um histórico de criação ou compra. As aprovações contam a primeira conclusão de cada
            desafio por pessoa no período.
          </p>
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
          <aside
            className="space-y-2 rounded-xl border border-border bg-muted/30 p-4"
            aria-label="Limites das fontes"
          >
            <h3 className="text-sm font-semibold">O que estes dados ainda não mostram</h3>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {report.semFonte.map((codigo) => (
                <li key={codigo}>{semFonte[codigo]}</li>
              ))}
            </ul>
          </aside>
        </>
      )}
    </section>
  )
}
