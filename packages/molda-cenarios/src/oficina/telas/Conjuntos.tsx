import { Boxes, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { type JSX, useId, useRef, useState } from 'react'
import { Capa, Chegando, DialogoDeApagar, DialogoDeNome, Falhou, useCarga } from '../pecas'
import type { CenariosHost, ConjuntoDeBiblioteca } from '../portas'

export function Conjuntos({
  host,
  bibliotecaId,
  busca = '',
  pasta,
  compacto = false,
  excluido,
  aoEditar,
  aoPor,
  aoMudar,
}: {
  host: CenariosHost
  bibliotecaId: string
  busca?: string
  pasta?: string
  compacto?: boolean
  excluido?: string
  aoEditar?(id: string): Promise<void>
  aoPor?(conjunto: ConjuntoDeBiblioteca): Promise<void>
  aoMudar?(): void
}): JSX.Element {
  const consulta = JSON.stringify([bibliotecaId, busca, pasta])
  const [navegacao, setNavegacao] = useState<{
    consulta: string
    cursor: string | null
    anteriores: Array<string | null>
  }>({ consulta, cursor: null, anteriores: [] })
  const pagina =
    navegacao.consulta === consulta ? navegacao : { consulta, cursor: null, anteriores: [] }
  const [volta, setVolta] = useState(0),
    [erro, setErro] = useState<string | null>(null),
    [ocupado, setOcupado] = useState<string | null>(null)
  const [janela, setJanela] = useState<{
    tipo: 'editar' | 'apagar'
    conjunto: ConjuntoDeBiblioteca
  } | null>(null)
  const [pastaNova, setPastaNova] = useState(''),
    [etiquetas, setEtiquetas] = useState('')
  const salvando = useRef(false),
    idPasta = useId(),
    idEtiquetas = useId()
  const carga = useCarga(
    () =>
      host.listarConjuntos(bibliotecaId, {
        busca,
        pasta,
        cursor: pagina.cursor,
        limite: compacto ? 40 : 60,
      }),
    [host, bibliotecaId, busca, pasta, pagina.cursor, volta, compacto],
  )
  const atualizar = () => {
    setNavegacao({ consulta, cursor: null, anteriores: [] })
    setVolta((v) => v + 1)
    aoMudar?.()
  }
  const agir = async (c: ConjuntoDeBiblioteca, tarefa: () => Promise<void>) => {
    if (salvando.current) return
    salvando.current = true
    setOcupado(c.id)
    setErro(null)
    try {
      await tarefa()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui abrir este conjunto')
    } finally {
      salvando.current = false
      setOcupado(null)
    }
  }
  if (carga.falhou) return <Falhou aoTentar={carga.recarregar} />
  if (!carga.dados) return <Chegando texto="Buscando conjuntos…" />
  const dados = carga.dados
  return (
    <div>
      {erro ? (
        <p role="alert" className="mcn-gaveta-aviso">
          {erro}
        </p>
      ) : null}
      {!dados.total ? (
        <p className="mcn-gaveta-aviso">
          {busca || pasta
            ? 'Nenhum conjunto encontrado.'
            : 'Guarde uma composição na oficina para usá-la aqui.'}
        </p>
      ) : (
        <>
          <ul
            className={compacto ? 'mcn-gaveta-lista' : 'mcn-modelos'}
            aria-label="Conjuntos da biblioteca"
          >
            {dados.itens.map((c) => (
              <li key={c.id} className={compacto ? undefined : 'mcn-modelo'}>
                <button
                  type="button"
                  className={compacto ? 'mcn-brinquedo' : 'w-full text-left'}
                  disabled={ocupado !== null || c.id === excluido || (!aoPor && !aoEditar)}
                  aria-label={`${aoPor ? 'Colocar conjunto' : 'Abrir conjunto'} ${c.nome}`}
                  title={
                    c.id === excluido ? 'Um conjunto não pode conter uma cópia de si mesmo' : c.nome
                  }
                  onClick={() =>
                    void agir(c, () =>
                      aoPor ? aoPor(c) : aoEditar ? aoEditar(c.id) : Promise.resolve(),
                    )
                  }
                >
                  <span className={compacto ? 'mcn-brinquedo-foto' : 'mcn-modelo-foto'}>
                    <Capa key={c.miniatura} endereco={c.miniatura} reserva={<Boxes />} />
                  </span>
                  <span className={compacto ? 'mcn-brinquedo-nome' : 'mcn-modelo-nome'}>
                    {c.nome}
                  </span>
                </button>
                {!compacto ? (
                  <>
                    <span className="mcn-modelo-detalhe">
                      {c.objetos} {c.objetos === 1 ? 'peça' : 'peças'} · versão {c.revisao}
                    </span>
                    {c.pasta ? <small className="mcn-modelo-detalhe">{c.pasta}</small> : null}
                    <button
                      type="button"
                      className="mcn-modelo-tirar mcn-modelo-editar"
                      aria-label={`Organizar conjunto ${c.nome}`}
                      onClick={() => {
                        setPastaNova(c.pasta)
                        setEtiquetas(c.etiquetas.join(', '))
                        setJanela({ tipo: 'editar', conjunto: c })
                      }}
                    >
                      <Pencil aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="mcn-modelo-tirar"
                      aria-label={`Apagar conjunto ${c.nome}`}
                      onClick={() => setJanela({ tipo: 'apagar', conjunto: c })}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
          {pagina.anteriores.length || dados.proximo ? (
            <nav
              className="flex items-center justify-center gap-3 py-3"
              aria-label="Páginas de conjuntos"
            >
              <button
                type="button"
                className="sz-tool-pill sz-tool-pill--outline"
                disabled={!pagina.anteriores.length}
                onClick={() =>
                  setNavegacao({
                    consulta,
                    cursor: pagina.anteriores.at(-1) ?? null,
                    anteriores: pagina.anteriores.slice(0, -1),
                  })
                }
              >
                <ChevronLeft aria-hidden="true" />
                Anterior
              </button>
              <span className="text-sm text-mld-muted">Página {pagina.anteriores.length + 1}</span>
              <button
                type="button"
                className="sz-tool-pill sz-tool-pill--outline"
                disabled={!dados.proximo}
                onClick={() =>
                  setNavegacao({
                    consulta,
                    cursor: dados.proximo,
                    anteriores: [...pagina.anteriores, pagina.cursor],
                  })
                }
              >
                Próxima
                <ChevronRight aria-hidden="true" />
              </button>
            </nav>
          ) : null}
        </>
      )}
      {janela?.tipo === 'editar' ? (
        <DialogoDeNome
          titulo="Organizar conjunto"
          inicial={janela.conjunto.nome}
          acao="Guardar"
          aoFechar={() => {
            if (!salvando.current) setJanela(null)
          }}
          aoConfirmar={async (nome) => {
            salvando.current = true
            try {
              await host.editarConjunto(janela.conjunto.id, {
                nome,
                pasta: pastaNova,
                etiquetas: etiquetas
                  .split(',')
                  .map((e) => e.trim())
                  .filter(Boolean),
              })
              atualizar()
            } finally {
              salvando.current = false
            }
          }}
        >
          <label htmlFor={idPasta} className="mcn-campo">
            <span>Pasta</span>
            <input
              id={idPasta}
              value={pastaNova}
              maxLength={240}
              onChange={(e) => setPastaNova(e.target.value)}
            />
          </label>
          <label htmlFor={idEtiquetas} className="mcn-campo">
            <span>Etiquetas, separadas por vírgulas</span>
            <input
              id={idEtiquetas}
              value={etiquetas}
              maxLength={700}
              onChange={(e) => setEtiquetas(e.target.value)}
            />
          </label>
        </DialogoDeNome>
      ) : null}
      {janela?.tipo === 'apagar' ? (
        <DialogoDeApagar
          titulo={`Apagar ${janela.conjunto.nome}?`}
          texto="As cópias guardadas nos cenários continuam disponíveis. O rascunho deste conjunto será apagado."
          aoFechar={() => {
            if (!salvando.current) setJanela(null)
          }}
          aoConfirmar={async () => {
            salvando.current = true
            try {
              await host.apagarConjunto(janela.conjunto.id)
              atualizar()
            } finally {
              salvando.current = false
            }
          }}
        />
      ) : null}
    </div>
  )
}
