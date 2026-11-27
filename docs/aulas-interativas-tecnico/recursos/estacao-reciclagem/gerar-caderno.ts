import {
  type EstacaoDimensao,
  type EstacaoEtapa,
  estacaoAssets2D,
  montarProjetoEstacao,
} from '../../qa/estacao-projeto'
import { gerarCaderno } from '../construtor-base/gerar-caderno'

// As etapas vêm como "2d:esteira": o projeto sai do gerador da missão (não há pasta projetos/).
// "resultado-derrota" é o resultado só com a derrota, para desenhar a etapa em duas folhas.
gerarCaderno('estacao-reciclagem', {
  projeto: (stage) => {
    const [d, etapa] = stage.split(':') as [EstacaoDimensao, string]
    if (etapa === 'resultado-derrota') return montarProjetoEstacao(d, 'resultado', true)
    return montarProjetoEstacao(d, etapa as EstacaoEtapa)
  },
  inicial: { assets: estacaoAssets2D() },
})
