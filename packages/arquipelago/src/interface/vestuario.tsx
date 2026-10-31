import { useState } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { useFesta } from '../estado/festas'
import { lojaDaGaleria } from '../estado/galeria'
import { salvamentoPausado } from '../sistemas/pausa'

export function VestuarioDaFesta() {
  const { loja, plataforma } = useJogo()
  const festa = useFesta()
  const [ocupado, ocupar] = useState(false)
  const pode = useEstado(
    (s) =>
      !s.acesso.somenteLeitura &&
      !s.visita &&
      !s.tempoAcabou &&
      !s.tempoPausado &&
      !s.tempoSincronizando &&
      !s.ferramentaAberta &&
      !salvamentoPausado(s.salvamentoSituacao),
  )
  if (!festa) return null
  async function abrir() {
    if (!festa || ocupado || !pode) return
    ocupar(true)
    loja.getState().definirFerramentaAberta(true)
    try {
      const r = await plataforma.abrirFerramenta({
        ferramenta: 'avatar',
        proposito: 'vestir',
        molde: { versao: 1, festa },
      })
      if (r.situacao === 'avatar-pronto') loja.getState().definirAvatar(r.avatar)
      else if (r.situacao === 'indisponivel')
        loja
          .getState()
          .dizer('O avatar não abriu agora. Suas roupas continuam guardadas na plataforma.')
      await lojaDaGaleria(loja, plataforma).getState().carregar()
    } catch (erro) {
      plataforma.relatarErro(erro, 'vestuario')
      loja.getState().dizer('Não foi possível abrir o avatar agora.')
    } finally {
      loja.getState().definirFerramentaAberta(false)
      ocupar(false)
    }
  }
  return (
    <section aria-label="Roupas da festa">
      <h3 className="arq-menu-titulo">Roupas da festa</h3>
      <p className="arq-caderno-explica">
        As roupas desta festa chegam ao seu avatar enquanto ela dura e continuam suas depois.
      </p>
      <button
        type="button"
        className="arq-botao"
        disabled={!pode || ocupado}
        onClick={() => void abrir()}
      >
        Abrir meu avatar
      </button>
    </section>
  )
}
