import { Button } from '@sistemazero/molda/ui'
import { Download, Loader2 } from 'lucide-react'
import { type JSX, useEffect, useState } from 'react'
import type { DestinoDeArquivo } from '../../exportar/preparar'
import type { ControladorDaOficina } from '../controlador'
import { Chegando, Dialogo } from '../pecas'
import type { CenariosHost } from '../portas'
import { useExportacao } from '../useExportacao'
import Publicar from './Publicar'

const bytes = (n: number) =>
  n < 1024 * 1024
    ? `${(n / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KiB`
    : `${(n / 1024 ** 2).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MiB`
const ETAPAS = {
  terreno: 'Preparando o terreno',
  modelos: 'Preparando as peças',
  texturas: 'Preparando as texturas',
  geometria: 'Montando a composição',
  pintura: 'Preparando o chão',
  arquivos: 'Gravando o arquivo',
} as const

export default function Exportar({
  host,
  id,
  nome,
  revisao,
  controlador,
  aoFechar,
  aoReabrir,
}: {
  host: CenariosHost
  id: string
  nome: string
  revisao: number
  controlador?: ControladorDaOficina
  aoFechar(): void
  aoReabrir(): Promise<void> | void
}): JSX.Element {
  const tarefa = useExportacao(host, id, revisao, controlador),
    e = tarefa.estado,
    preparo = 'preparo' in e ? e.preparo : undefined,
    [destino, setDestino] = useState<DestinoDeArquivo>('three'),
    [juntar, setJuntar] = useState(false),
    [regiao, setRegiao] = useState(64),
    [reabrindo, setReabrindo] = useState(false),
    [erroLocal, setErroLocal] = useState<string | null>(null),
    divergente = e.tipo === 'erro' && e.revisaoAtual !== undefined,
    desabilitado = tarefa.pendente || e.tipo === 'carregando' || !preparo || divergente,
    restritas = preparo?.contexto.bibliotecas.filter((b) => b.licenca === 'restrita') ?? []
  const [modo, setModo] = useState<'arquivo' | 'publicar'>('arquivo')
  const [podePublicar, setPodePublicar] = useState(false)
  const espacoDaFonte = preparo?.espacoId,
    equipeDaFonte = preparo?.contexto.equipe
  useEffect(() => {
    if (!host.publicacoes || equipeDaFonte === false) {
      setPodePublicar(false)
      return
    }
    if (!espacoDaFonte || equipeDaFonte !== true) return
    let vivo = true
    void host.espacos().then(
      (espacos) => {
        if (vivo)
          setPodePublicar(espacos.some((e) => e.tipo === 'equipe' && e.id === espacoDaFonte))
      },
      () => {
        if (vivo) setPodePublicar(false)
      },
    )
    return () => {
      vivo = false
    }
  }, [host, espacoDaFonte, equipeDaFonte])
  const mudarModo = (novo: 'arquivo' | 'publicar') => {
    if (novo === modo) return
    tarefa.cancelar()
    setErroLocal(null)
    setModo(novo)
  }
  const modos =
    podePublicar || modo === 'publicar' ? (
      <fieldset className="mcn-publicar-modos">
        <legend className="sr-only">O que fazer com o cenário</legend>
        <Button
          variant={modo === 'arquivo' ? 'primary' : 'outline'}
          aria-pressed={modo === 'arquivo'}
          onClick={() => mudarModo('arquivo')}
        >
          Baixar arquivo
        </Button>
        <Button
          variant={modo === 'publicar' ? 'primary' : 'outline'}
          aria-pressed={modo === 'publicar'}
          disabled={!podePublicar && modo !== 'publicar'}
          onClick={() => mudarModo('publicar')}
        >
          Publicar no Arquipélago
        </Button>
      </fieldset>
    ) : null
  const reabrir = async () => {
    setReabrindo(true)
    setErroLocal(null)
    try {
      await aoReabrir()
      aoFechar()
    } catch (erro) {
      setErroLocal(erro instanceof Error ? erro.message : 'Não consegui abrir a revisão atual.')
      setReabrindo(false)
    }
  }
  if (modo === 'publicar')
    return (
      <Dialogo
        titulo="Publicar no Arquipélago"
        aoFechar={aoFechar}
        className="mcn-dialogo-exportar"
      >
        <div className="mcn-exportar">
          {modos}
          {erroLocal ? (
            <p role="alert" className="font-semibold text-mld-danger text-sm">
              {erroLocal}
            </p>
          ) : null}
          <Publicar
            host={host}
            tarefa={tarefa}
            autorizado={podePublicar}
            aoFechar={aoFechar}
            aoReabrir={() => void reabrir()}
            reabrindo={reabrindo}
          />
        </div>
      </Dialogo>
    )
  return (
    <Dialogo titulo="Exportar cenário" aoFechar={aoFechar} className="mcn-dialogo-exportar">
      <div className="mcn-exportar">
        {modos}
        <p className="text-mld-muted text-sm">
          <strong className="text-mld-text">{preparo?.documento.nome ?? nome}</strong>
          {' · '}Revisão {preparo?.fonte.revisao ?? revisao}
        </p>
        <p className="text-sm">
          Leve uma cópia do cenário guardado. Seu trabalho continua na oficina.
        </p>
        {e.tipo === 'carregando' ? (
          <Chegando texto="Conferindo a revisão e as bibliotecas" />
        ) : null}
        {e.tipo === 'feito' ? (
          <section aria-label="Arquivo conferido" className="space-y-3">
            <p role="status" className="font-bold">
              Seu arquivo está pronto.
            </p>
            <dl className="mcn-exportar-medidas">
              {[
                ['Malhas', e.arquivo.medidas.malhas.toLocaleString('pt-BR')],
                ['Triângulos', e.arquivo.medidas.triangulos.toLocaleString('pt-BR')],
                ['Recursos da cena', bytes(e.arquivo.medidas.bytesDosRecursos)],
                ['Arquivo para baixar', bytes(e.arquivo.bytes)],
              ].map(([titulo, valor]) => (
                <div key={titulo}>
                  <dt>{titulo}</dt>
                  <dd>{valor}</dd>
                </div>
              ))}
            </dl>
            {e.arquivo.avisos.length ? (
              <details>
                <summary className="cursor-pointer font-semibold text-sm">
                  Cuidados deste arquivo ({e.arquivo.avisos.length})
                </summary>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
                  {e.arquivo.avisos.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </section>
        ) : null}
        <fieldset disabled={desabilitado} className="mcn-exportar-opcoes">
          <label className="mcn-campo">
            <span>Para onde levar</span>
            <select
              value={destino}
              onChange={(ev) => {
                tarefa.cancelar()
                setDestino(ev.target.value as DestinoDeArquivo)
              }}
            >
              <option value="three">three.js · pacote para o navegador</option>
              <option value="glb">GLB · um arquivo 3D</option>
              <option value="raylib">Python · pacote Raylib</option>
            </select>
          </label>
          <p className="text-mld-muted text-sm">
            {destino === 'three'
              ? 'Inclui a cena, os recursos e um exemplo para explorar sem login. Depois de extrair o ZIP, abra-o por um servidor local.'
              : destino === 'raylib'
                ? 'Inclui os modelos, dados, auxiliar Python e exemplo para Raylib 6.0.1.0. Água fica estática; colisões são aproximações por caixas. O solo mantém suas alturas e buracos.'
                : 'Inclui a composição e as animações em um arquivo de até 32 MiB. Água fica estática; céu, névoa e física dependem do programa que abrir.'}
          </p>
          <label className="mcn-opcao">
            <input
              type="checkbox"
              checked={juntar || destino === 'raylib'}
              disabled={destino === 'raylib'}
              onChange={(ev) => {
                tarefa.cancelar()
                setJuntar(ev.target.checked)
              }}
            />
            <span>
              <strong>Juntar peças estáticas por região</strong>
              <small>
                {destino === 'raylib'
                  ? 'O pacote Raylib sempre agrupa o estático. '
                  : 'Reduz as malhas da cópia. '}
                Personagens e peças com propriedades de jogo ficam separados.
              </small>
            </span>
          </label>
          {juntar || destino === 'raylib' ? (
            <label className="mcn-campo">
              <span>Tamanho da região</span>
              <select
                value={regiao}
                onChange={(ev) => {
                  tarefa.cancelar()
                  setRegiao(Number(ev.target.value))
                }}
              >
                {[32, 64, 96, 128].map((m) => (
                  <option key={m} value={m}>
                    {m} metros
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </fieldset>
        {preparo ? (
          <section className="mcn-exportar-licencas" aria-label="Bibliotecas e licenças">
            <h3 className="font-bold text-sm">Bibliotecas desta revisão</h3>
            {preparo.contexto.bibliotecas.length ? (
              <ul className="mt-2 space-y-1 text-sm">
                {preparo.contexto.bibliotecas.map((b) => (
                  <li key={b.id}>
                    <strong>{b.nome}</strong> ·{' '}
                    {{ livre: 'livre', propria: 'uso próprio', restrita: 'restrita' }[b.licenca]}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-mld-muted text-sm">
                Esta composição não usa arquivos de bibliotecas.
              </p>
            )}
            {restritas.length ? (
              <p className="mt-2 font-semibold text-sm">
                As licenças restritas continuam valendo fora da oficina; esta cópia não autoriza
                redistribuir os modelos.
              </p>
            ) : null}
          </section>
        ) : null}
        {e.tipo === 'gerando' ? (
          <div role="status" className="mcn-exportar-andamento" aria-live="polite">
            <span className="flex items-center gap-2 font-semibold">
              <Loader2
                aria-hidden="true"
                className="size-4 animate-spin motion-reduce:animate-none"
              />
              {ETAPAS[e.progresso.etapa]}
            </span>
            {e.progresso.nome ? (
              <span className="text-mld-muted text-sm">{e.progresso.nome}</span>
            ) : null}
            <progress
              max={Math.max(1, e.progresso.total)}
              value={e.progresso.feitos}
              aria-label="Progresso desta etapa"
            />
            <span className="text-mld-muted text-xs">
              {e.progresso.feitos.toLocaleString('pt-BR')} de{' '}
              {e.progresso.total.toLocaleString('pt-BR')}
            </span>
          </div>
        ) : tarefa.pendente ? (
          <Chegando texto="Liberando os recursos da exportação" />
        ) : null}
        {e.tipo === 'erro' || erroLocal ? (
          <p role="alert" className="font-semibold text-mld-danger text-sm">
            {erroLocal ?? (e.tipo === 'erro' ? e.mensagem : '')}
          </p>
        ) : null}
        <div className="mcn-exportar-acoes">
          <Button variant="ghost" onClick={aoFechar}>
            Fechar
          </Button>
          {e.tipo === 'gerando' ? (
            <Button variant="outline" onClick={tarefa.cancelar}>
              Cancelar exportação
            </Button>
          ) : divergente ? (
            <Button
              variant="primary"
              disabled={reabrindo || tarefa.pendente}
              onClick={() => void reabrir()}
            >
              Abrir revisão atual
            </Button>
          ) : e.tipo === 'erro' ? (
            <Button variant="primary" disabled={tarefa.pendente} onClick={tarefa.repetir}>
              Tentar de novo
            </Button>
          ) : e.tipo === 'feito' ? (
            <a
              className="sz-tool-pill sz-tool-pill--primary min-h-11"
              href={e.arquivo.url}
              download={e.arquivo.nome}
            >
              <Download aria-hidden="true" className="size-4" />
              Baixar {destino === 'glb' ? 'GLB' : 'ZIP'}
            </a>
          ) : (
            <Button
              variant="primary"
              disabled={desabilitado}
              onClick={() => void tarefa.gerar({ destino, juntar, tamanhoDaRegiao: regiao })}
            >
              Preparar arquivo
            </Button>
          )}
        </div>
      </div>
    </Dialogo>
  )
}
