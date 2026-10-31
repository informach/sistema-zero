import { RoupasConcedidasSchema } from '@sistemazero/arquipelago-contracts'
import { useEffect, useRef } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { useFesta } from '../estado/festas'
import { falaDasRoupasNovas, roupasConquistadas } from '../sistemas/roupas'

/**
 * As roupas conquistadas (§6.28, A21): ao abrir e quando a conquista muda (um morador chega a três
 * corações, uma festa começa), o jogo salva e pede ao serviço que confira e conceda no avatar. O
 * serviço decide pelo salvamento guardado; o Zappy só conta o que chegou de novo.
 */
export function RoupasConquistadas() {
  const { loja, plataforma, fila } = useJogo()
  const festa = useFesta()
  const chave = useEstado((s) => roupasConquistadas(s.salvamento, festa).join(','))
  const ultima = useRef<string | null>(null)
  useEffect(() => {
    if (!chave || chave === ultima.current) return
    ultima.current = chave
    const s = loja.getState()
    if (s.acesso.somenteLeitura || s.visita) return
    let vivo = true
    void (async () => {
      try {
        // O serviço lê o salvamento guardado: a amizade nova precisa chegar lá antes.
        await fila?.salvarAgora()
        const r = await plataforma.servico.buscar('/roupas/sincronizar', {
          metodo: 'POST',
          corpo: {},
        })
        if (!vivo || r.status !== 200) return
        const lido = RoupasConcedidasSchema.safeParse(r.corpo)
        const fala = lido.success ? falaDasRoupasNovas(lido.data.novas, festa) : null
        if (fala) loja.getState().dizer(fala)
      } catch (erro) {
        plataforma.relatarErro(erro, 'roupas')
      }
    })()
    return () => {
      vivo = false
    }
  }, [chave, festa, loja, plataforma, fila])
  return null
}
