import { useEffect } from 'react'
import { lojaDasCartas } from '../estado/cartas'
import { useJogo } from '../estado/contexto'
import { lojaDaRotina } from '../estado/rotina'
import {
  chuvaComOJogoFechado,
  falaDoJogoFechado,
  rotinasComOJogoFechado,
  viradasComOJogoFechado,
} from '../sistemas/jogo-fechado'
import { cartasNaMao, rotinasDoQuando } from '../sistemas/rotina'

/**
 * Enquanto você estava fora (§6.28, A12 e A14), montado pela `Cena`: ao abrir, a chuva dos dias que
 * passaram rega a horta e os Lumis fazem as rotinas das viradas que passaram, uma vez só. As
 * rotinas conferem os cartões na mão, como o Lumi que trabalha no mundo; o painel Rotina mostra o
 * que cada um fez. Numa visita ou só para olhar, nada roda.
 */
export function EnquantoFechado() {
  const { loja, plataforma } = useJogo()
  useEffect(() => {
    const desde = loja.getState().fechadoDesde
    if (desde === null) return
    const rodar = () => {
      const s = loja.getState()
      // Uma vez por abertura (o efeito pode montar duas vezes; quem chega primeiro usa).
      if (s.fechadoDesde !== desde) return
      s.esquecerFechado()
      if (s.acesso.somenteLeitura || s.visita) return
      const agora = Date.now()
      const horta = chuvaComOJogoFechado(s.salvamento, s.jornada, desde, agora)
      if (horta) s.mudar((atual) => ({ ...atual, horta }))
      const viradas = viradasComOJogoFechado(desde, agora, Date.parse(s.salvamento.criadoEm))
      const r = rotinasComOJogoFechado(
        loja.getState().salvamento,
        viradas,
        cartasNaMao(cartas.getState().dados),
        s.jornada,
      )
      if (r.salvamento !== loja.getState().salvamento) s.mudar(() => r.salvamento)
      for (const v of r.vezes)
        lojaDaRotina(loja)
          .getState()
          .registrar(v.lumi, { origem: 'fechado', registro: v.registro, erro: v.erro })
      const fala = falaDoJogoFechado(horta !== null, r.vezes.length)
      if (fala) s.dizer(fala)
    }
    const cartas = lojaDasCartas(loja, plataforma)
    const s = loja.getState().salvamento
    const temRotina = viradasComOJogoFechado(desde, Date.now(), Date.parse(s.criadoEm)).some(
      (v) => rotinasDoQuando(s, v.quando).length > 0,
    )
    // Sem rotina para rodar, não espera os cartões do serviço.
    if (!temRotina || cartas.getState().dados) rodar()
    else void cartas.getState().carregar().finally(rodar)
  }, [loja, plataforma])
  return null
}
