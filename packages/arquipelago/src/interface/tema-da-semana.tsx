import { useEffect, useState } from 'react'
import { lojaDaConstrucao, podeConstruir } from '../estado/construcao'
import { useEstado, useJogo } from '../estado/contexto'
import { TEMAS_DE_CONSTRUCAO, temaDaSemana } from '../sistemas/tema-da-semana'

/** Sugestão de criação, sem avaliar escolhas nem gravar uma conquista por abrir o diário. */
export function ConviteDaSemana() {
  const { loja } = useJogo()
  const [semana, setSemana] = useState(() => temaDaSemana(new Date()))
  const [escolha, setEscolha] = useState('semana')
  const pode = useEstado(
    (s) => !s.visita && s.dentroDeCasa && podeConstruir({ ...s, painelAberto: null }),
  )
  useEffect(() => {
    const atualizar = () =>
      setSemana((anterior) => {
        const atual = temaDaSemana(new Date())
        return atual?.semana === anterior?.semana ? anterior : atual
      })
    const timer = setInterval(atualizar, 60_000)
    document.addEventListener('visibilitychange', atualizar)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', atualizar)
    }
  }, [])
  const tema =
    escolha === 'semana' ? semana?.tema : TEMAS_DE_CONSTRUCAO.find((t) => t.id === escolha)
  if (!tema) return null
  return (
    <section className="arq-tema-semana arq-caderno-secao" aria-labelledby="arq-tema-titulo">
      <h3 id="arq-tema-titulo" className="arq-menu-titulo">
        {escolha === 'semana' ? 'Tema de construção da semana' : 'Uma ideia para continuar'}
      </h3>
      <label htmlFor="arq-tema-escolha">Ideias para construir</label>
      <select id="arq-tema-escolha" value={escolha} onChange={(e) => setEscolha(e.target.value)}>
        <option value="semana">Desta semana: {semana?.tema.nome}</option>
        {TEMAS_DE_CONSTRUCAO.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nome}
          </option>
        ))}
      </select>
      <strong>{tema.nome}</strong>
      <p>{tema.convite}</p>
      <p>{tema.alternativa}</p>
      <p className="arq-caderno-explica">
        O tema é um convite. Você pode continuar qualquer ideia depois da troca da semana. Não há
        nota, prazo ou compra obrigatória.
      </p>
      <button
        type="button"
        className="arq-botao leve"
        disabled={!pode}
        onClick={() => {
          const s = loja.getState()
          if (s.visita || !s.dentroDeCasa || !podeConstruir({ ...s, painelAberto: null })) return
          s.abrirPainel(null)
          lojaDaConstrucao(loja).getState().abrir()
        }}
      >
        Construir na minha casa
      </button>
      {!pode && (
        <span className="arq-caderno-explica">
          Depois de abrir a porta nova, volte à sua casa para construir.
        </span>
      )}
    </section>
  )
}
