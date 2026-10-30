import type {
  Movel,
  ObjetoDaCasa,
  PisoDaCasa,
  PisoDoQuintal,
} from '@sistemazero/arquipelago-contracts'
import caminhoGrama from '../assets/casa/miniaturas/caminho-grama.png'
import caminhoPedra from '../assets/casa/miniaturas/caminho-pedra.png'
import janelaArco from '../assets/casa/miniaturas/janela-arco.png'
import janelaGrande from '../assets/casa/miniaturas/janela-grande.png'
import janelaRedonda from '../assets/casa/miniaturas/janela-redonda.png'
import movelArmarioAlto from '../assets/casa/miniaturas/movel-armario-alto.png'
import movelBalcao from '../assets/casa/miniaturas/movel-balcao.png'
import movelBalcaoPia from '../assets/casa/miniaturas/movel-balcao-pia.png'
import movelBanheira from '../assets/casa/miniaturas/movel-banheira.png'
import movelBoxChuveiro from '../assets/casa/miniaturas/movel-box-chuveiro.png'
import movelCadeiraCozinha from '../assets/casa/miniaturas/movel-cadeira-cozinha.png'
import movelEspelho from '../assets/casa/miniaturas/movel-espelho.png'
import movelEstanteBaixa from '../assets/casa/miniaturas/movel-estante-baixa.png'
import movelLuminariaPe from '../assets/casa/miniaturas/movel-luminaria-pe.png'
import movelMesaCozinha from '../assets/casa/miniaturas/movel-mesa-cozinha.png'
import movelMesinhaCentro from '../assets/casa/miniaturas/movel-mesinha-centro.png'
import movelPiaBanheiro from '../assets/casa/miniaturas/movel-pia-banheiro.png'
import movelPlanta from '../assets/casa/miniaturas/movel-planta.png'
import movelPoltrona from '../assets/casa/miniaturas/movel-poltrona.png'
import movelPrateleiraPotes from '../assets/casa/miniaturas/movel-prateleira-potes.png'
import movelQuadro from '../assets/casa/miniaturas/movel-quadro.png'
import movelSofa from '../assets/casa/miniaturas/movel-sofa.png'
import movelTapete from '../assets/casa/miniaturas/movel-tapete.png'
import movelTapetinho from '../assets/casa/miniaturas/movel-tapetinho.png'
import movelToalheiro from '../assets/casa/miniaturas/movel-toalheiro.png'
import movelVasoSanitario from '../assets/casa/miniaturas/movel-vaso-sanitario.png'
import objetoAquario from '../assets/casa/miniaturas/objeto-aquario.png'
import objetoBanda from '../assets/casa/miniaturas/objeto-banda.png'
import objetoCasinha from '../assets/casa/miniaturas/objeto-casinha.png'
import objetoFliperama from '../assets/casa/miniaturas/objeto-fliperama.png'
import objetoForno from '../assets/casa/miniaturas/objeto-forno.png'
import objetoGeladeira from '../assets/casa/miniaturas/objeto-geladeira.png'
import objetoLareira from '../assets/casa/miniaturas/objeto-lareira.png'
import objetoMuseu from '../assets/casa/miniaturas/objeto-museu.png'
import objetoPlantaInterior from '../assets/casa/miniaturas/objeto-planta-interior.png'
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
  'planta-interior': url(objetoPlantaInterior),
}

export const MINIATURA_DO_MOVEL: Record<Movel, string> = {
  'balcao-pia': url(movelBalcaoPia),
  balcao: url(movelBalcao),
  'armario-alto': url(movelArmarioAlto),
  'mesa-cozinha': url(movelMesaCozinha),
  'cadeira-cozinha': url(movelCadeiraCozinha),
  'prateleira-potes': url(movelPrateleiraPotes),
  sofa: url(movelSofa),
  poltrona: url(movelPoltrona),
  'mesinha-centro': url(movelMesinhaCentro),
  tapete: url(movelTapete),
  'estante-baixa': url(movelEstanteBaixa),
  'luminaria-pe': url(movelLuminariaPe),
  planta: url(movelPlanta),
  quadro: url(movelQuadro),
  banheira: url(movelBanheira),
  'pia-banheiro': url(movelPiaBanheiro),
  espelho: url(movelEspelho),
  'vaso-sanitario': url(movelVasoSanitario),
  'box-chuveiro': url(movelBoxChuveiro),
  tapetinho: url(movelTapetinho),
  toalheiro: url(movelToalheiro),
}
