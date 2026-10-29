'use client'

import {
  HORAS_DA_VOLTA_AO_CURSO,
  type PermissoesDaFamilia,
  PermissoesDaFamiliaSchema,
  type SemanaDaFamiliaParaOsPais,
} from '@sistemazero/member-shell/lib/arquipelago-contracts'
import { sessionFetch } from '@sistemazero/member-shell/lib/session-fetch'
import { BookOpenCheck, Clock, Palette, Trophy } from 'lucide-react'
import { useId, useState } from 'react'
import { StatTile } from './parent-ui'

/**
 * As duas partes novas do cartão do Arquipélago na área dos pais (28/10/2026, fase1-18): a semana
 * de cada criança e as permissões de visita. Cada número só aparece quando o serviço o tem
 * (nada de zero inventado quando o dado falta).
 */

type Crianca = SemanaDaFamiliaParaOsPais['criancas'][number]

/** "45 min", "1 h", "1 h 30 min": o mesmo jeito de falar de tempo em toda a área dos pais. */
export function duracaoPorExtenso(minutos: number): string {
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  if (horas === 0) return `${resto} min`
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`
}

/** O mesmo, a partir de segundos (o tempo do jogo sobe de segundo em segundo). */
export function tempoPorExtenso(segundos: number): string {
  if (segundos > 0 && segundos < 60) return 'menos de 1 min'
  return duracaoPorExtenso(Math.floor(segundos / 60))
}

const plural = (n: number, um: string, varios: string) => (n === 1 ? `1 ${um}` : `${n} ${varios}`)

export type LadrilhoDaSemana = {
  chave: 'desafios' | 'objetos' | 'tempo' | 'curso'
  valor: string
  rotulo: string
  detalhe?: string
}

/**
 * Os números da semana de uma criança, na língua dos pais. Desafios, objetos e a volta ao curso só
 * aparecem quando o serviço tem o número; o tempo livre sempre, ao lado do limite que vale agora (o do cartão).
 */
export function ladrilhosDaSemana(c: Crianca, limiteDiarioMinutos: number): LadrilhoDaSemana[] {
  const ladrilhos: LadrilhoDaSemana[] = []
  if (c.desafios) {
    const { aprovados, deIlhasAnteriores } = c.desafios
    const anteriores =
      deIlhasAnteriores === null || deIlhasAnteriores === 0
        ? undefined
        : deIlhasAnteriores === aprovados && aprovados > 1
          ? 'todos de ilhas anteriores'
          : `${deIlhasAnteriores} de ilhas anteriores`
    ladrilhos.push({
      chave: 'desafios',
      valor: String(aprovados),
      rotulo: aprovados === 1 ? 'desafio do Estúdio aprovado' : 'desafios do Estúdio aprovados',
      detalhe: anteriores,
    })
  }
  if (c.objetos) {
    const { pinta, molda } = c.objetos
    ladrilhos.push({
      chave: 'objetos',
      valor: String(pinta + molda),
      rotulo: `${pinta + molda === 1 ? 'objeto' : 'objetos'} com a aparência criada por ${c.nome}`,
      detalhe: `${pinta} no Pinta e ${molda} no Molda, desde o começo`,
    })
  }
  const { segundos, dias } = c.tempoLivre
  const limite = `limite de ${duracaoPorExtenso(limiteDiarioMinutos)} por dia`
  ladrilhos.push({
    chave: 'tempo',
    valor: tempoPorExtenso(segundos),
    rotulo: 'de tempo livre no jogo',
    detalhe: segundos > 0 ? `em ${plural(dias, 'dia', 'dias')}, ${limite}` : limite,
  })
  const volta = voltaAoCurso(c)
  if (volta) ladrilhos.push(volta)
  return ladrilhos
}

/**
 * Se ela concluiu aula do curso logo depois de jogar (29/10/2026). Só com a leitura dos cursos
 * e com tempo de jogo na janela; diz o fato, nunca que o jogo foi a causa.
 */
function voltaAoCurso(c: Crianca): LadrilhoDaSemana | null {
  const { segundos, dias } = c.tempoLivre
  if (!c.voltaAoCurso || segundos <= 0 || dias <= 0) return null
  const voltou = Math.min(c.voltaAoCurso.dias, dias)
  return {
    chave: 'curso',
    valor: `${voltou} de ${dias}`,
    rotulo: `${dias === 1 ? 'dia' : 'dias'} de jogo com aula concluída depois`,
    detalhe: `aula do curso, até ${HORAS_DA_VOLTA_AO_CURSO} h depois de jogar`,
  }
}

const ICONE_DO_LADRILHO = {
  desafios: { icon: Trophy, color: 'var(--level-hacker)' },
  objetos: { icon: Palette, color: 'var(--level-architect)' },
  tempo: { icon: Clock, color: 'var(--primary)' },
  curso: { icon: BookOpenCheck, color: 'var(--level-explorer)' },
} as const

/** "22/10 a 28/10" (a janela do resumo). */
function janela(inicio: string, fim: string): string {
  const curto = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`
  return `${curto(inicio)} a ${curto(fim)}`
}

export function SemanaDasCriancas({
  semana,
  limiteDiarioMinutos,
}: {
  semana: SemanaDaFamiliaParaOsPais
  limiteDiarioMinutos: number
}) {
  const titulo = useId()
  if (semana.criancas.length === 0 && semana.aindaSemJogo.length === 0) return null
  return (
    <section aria-labelledby={titulo} className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 id={titulo} className="font-extrabold text-base">
          A semana no jogo
        </h3>
        <p className="text-muted-foreground text-xs">
          Dos últimos 7 dias, de {janela(semana.inicio, semana.fim)}.
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {semana.criancas.map((c) => (
          <li
            key={c.perfilId}
            className="min-w-0 rounded-2xl border border-border bg-card p-4 text-sm"
          >
            <p className="break-words font-extrabold">{c.nome}</p>
            <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-2">
              {ladrilhosDaSemana(c, limiteDiarioMinutos).map((l) => (
                <StatTile
                  key={l.chave}
                  icon={ICONE_DO_LADRILHO[l.chave].icon}
                  color={ICONE_DO_LADRILHO[l.chave].color}
                  value={l.valor}
                  label={l.rotulo}
                  hint={l.detalhe}
                />
              ))}
            </div>
          </li>
        ))}
        {semana.aindaSemJogo.map((c) => (
          <li
            key={c.perfilId}
            className="min-w-0 rounded-2xl border border-border border-dashed bg-card p-4 text-sm"
          >
            <p className="break-words font-extrabold">{c.nome}</p>
            <p className="mt-2 text-muted-foreground">
              Ainda sem números do jogo. Eles aparecem quando a criança jogar.
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

const PERMISSOES: ReadonlyArray<{
  chave: keyof PermissoesDaFamilia
  nome: string
  explica: string
}> = [
  {
    chave: 'visitasDeIrmaos',
    nome: 'Visitas de irmãos',
    explica: 'Os irmãos desta conta podem visitar a ilha um do outro.',
  },
  {
    chave: 'visitasDeOutrasCriancas',
    nome: 'Visitas de outras crianças',
    explica: 'Crianças de outras famílias podem visitar a ilha.',
  },
  {
    chave: 'fotosNoClube',
    nome: 'Fotos no Clube',
    explica: 'As fotos tiradas no jogo podem aparecer no Clube dos Criadores.',
  },
]

const ROTA_DAS_PERMISSOES = '/api/parents/arquipelago/permissoes'

/**
 * Com quem a criança pode interagir no jogo (ECA Digital, art. 21: restrito por padrão, os pais
 * liberam). Cada interruptor grava na hora; se não gravar, volta ao que estava e avisa.
 */
export function PermissoesDeVisita({ inicial }: { inicial: PermissoesDaFamilia }) {
  const titulo = useId()
  const ajuda = useId()
  const [permissoes, setPermissoes] = useState(inicial)
  const [salvando, setSalvando] = useState<keyof PermissoesDaFamilia | null>(null)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  async function mudar(chave: keyof PermissoesDaFamilia, ligada: boolean) {
    const antes = permissoes
    const pedido = { ...permissoes, [chave]: ligada }
    setPermissoes(pedido)
    setSalvando(chave)
    setErro('')
    setAviso('')
    try {
      const response = await sessionFetch(ROTA_DAS_PERMISSOES, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(pedido),
      })
      const data = PermissoesDaFamiliaSchema.safeParse(await response.json())
      if (!response.ok || !data.success) throw new Error('permissões não salvas')
      setPermissoes(data.data)
      const nome = PERMISSOES.find((p) => p.chave === chave)?.nome ?? ''
      setAviso(`${nome}: ${data.data[chave] ? 'liberado' : 'desligado'}.`)
    } catch {
      setPermissoes(antes)
      setErro('Não consegui salvar agora. Tente de novo daqui a pouco.')
    } finally {
      setSalvando(null)
    }
  }

  return (
    <section aria-labelledby={titulo} className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 id={titulo} className="font-extrabold text-base">
          Com quem pode interagir
        </h3>
        <p id={ajuda} className="max-w-2xl text-muted-foreground text-xs">
          As visitas chegam numa próxima parte do jogo. A escolha de vocês já fica guardada e vale
          para todas as crianças da conta.
        </p>
      </div>
      <ul className="flex flex-col gap-2" aria-describedby={ajuda}>
        {PERMISSOES.map((p) => {
          const ligada = permissoes[p.chave]
          return (
            <li key={p.chave}>
              <label className="flex min-h-11 cursor-pointer items-start justify-between gap-4 rounded-2xl border border-border bg-card p-4 text-sm">
                <span className="min-w-0">
                  <span className="block font-extrabold">{p.nome}</span>
                  <span className="mt-1 block text-muted-foreground">{p.explica}</span>
                </span>
                <span className="relative mt-0.5 inline-flex shrink-0">
                  <input
                    type="checkbox"
                    role="switch"
                    aria-checked={ligada}
                    checked={ligada}
                    disabled={salvando !== null}
                    onChange={(event) => void mudar(p.chave, event.target.checked)}
                    className="peer absolute inset-0 z-10 size-full cursor-pointer opacity-0"
                  />
                  <span
                    aria-hidden="true"
                    className="h-7 w-12 rounded-full bg-muted ring-1 ring-muted-foreground/60 ring-inset transition-colors peer-checked:bg-primary peer-checked:ring-0 peer-focus-visible:outline-2 peer-focus-visible:outline-primary peer-focus-visible:outline-offset-2 peer-disabled:opacity-60"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute top-1 left-1 size-5 rounded-full bg-card shadow ring-1 ring-muted-foreground/40 transition-transform peer-checked:translate-x-5 peer-checked:ring-0"
                  />
                </span>
              </label>
            </li>
          )
        })}
      </ul>
      {erro ? (
        <p role="alert" className="font-semibold text-destructive text-sm">
          {erro}
        </p>
      ) : null}
      <p role="status" className="font-semibold text-sm">
        {aviso}
      </p>
    </section>
  )
}
