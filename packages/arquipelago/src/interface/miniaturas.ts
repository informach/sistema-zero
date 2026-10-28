import type { ObjetoDaCasa, PisoDaCasa, PisoDoQuintal } from '@sistemazero/arquipelago-contracts'
import caminhoGrama from '../assets/casa/miniaturas/caminho-grama.png'
import caminhoPedra from '../assets/casa/miniaturas/caminho-pedra.png'
import janelaArco from '../assets/casa/miniaturas/janela-arco.png'
import janelaGrande from '../assets/casa/miniaturas/janela-grande.png'
import janelaRedonda from '../assets/casa/miniaturas/janela-redonda.png'
import objetoAquario from '../assets/casa/miniaturas/objeto-aquario.png'
import objetoBanda from '../assets/casa/miniaturas/objeto-banda.png'
import objetoCasinha from '../assets/casa/miniaturas/objeto-casinha.png'
import objetoFliperama from '../assets/casa/miniaturas/objeto-fliperama.png'
import objetoForno from '../assets/casa/miniaturas/objeto-forno.png'
import objetoGeladeira from '../assets/casa/miniaturas/objeto-geladeira.png'
import objetoLareira from '../assets/casa/miniaturas/objeto-lareira.png'
import objetoMuseu from '../assets/casa/miniaturas/objeto-museu.png'
import pisoAzulejo from '../assets/casa/miniaturas/piso-azulejo.png'
import pisoLadrilho from '../assets/casa/miniaturas/piso-ladrilho.png'
import pisoTabua from '../assets/casa/miniaturas/piso-tabua.png'
import type { TipoDeJanela } from '../sistemas/construcao/ferramentas'

/**
 * As miniaturas das escolhas do Construir, feitas dos próprios modelos do jogo
 * (`arte/casa/miniaturas.py`): a criança reconhece a peça pelo desenho, mesmo sem ler o nome.
 */
const url = (caminho: string) => new URL(caminho, import.meta.url).href

export const MINIATURA_DA_JANELA: Record<TipoDeJanela, string> = {
  'janela-grande': url(janelaGrande),
  'janela-arco': url(janelaArco),
  'janela-redonda': url(janelaRedonda),
}

export const MINIATURA_DO_PISO: Record<PisoDaCasa, string> = {
  tabua: url(pisoTabua),
  ladrilho: url(pisoLadrilho),
  azulejo: url(pisoAzulejo),
}

export const MINIATURA_DO_CAMINHO: Record<PisoDoQuintal, string> = {
  pedra: url(caminhoPedra),
  grama: url(caminhoGrama),
}

export const MINIATURA_DO_OBJETO: Record<ObjetoDaCasa, string> = {
  geladeira: url(objetoGeladeira),
  forno: url(objetoForno),
  aquario: url(objetoAquario),
  lareira: url(objetoLareira),
  banda: url(objetoBanda),
  fliperama: url(objetoFliperama),
  museu: url(objetoMuseu),
  casinha: url(objetoCasinha),
}
