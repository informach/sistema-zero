import {
  GALERIA,
  type IdDaGaleria,
  type Movel,
  type ObjetoDaCasa,
  type PisoDaCasa,
  type PisoDoQuintal,
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
import movelCafeBalcao from '../assets/casa/miniaturas/movel-cafe-balcao.png'
import movelCafeBancaFeira from '../assets/casa/miniaturas/movel-cafe-banca-feira.png'
import movelCafeCadeira from '../assets/casa/miniaturas/movel-cafe-cadeira.png'
import movelCafeCaixote from '../assets/casa/miniaturas/movel-cafe-caixote.png'
import movelCafeLousaCardapio from '../assets/casa/miniaturas/movel-cafe-lousa-cardapio.png'
import movelCafeMesaRedonda from '../assets/casa/miniaturas/movel-cafe-mesa-redonda.png'
import movelCafeVitrineDoces from '../assets/casa/miniaturas/movel-cafe-vitrine-doces.png'
import movelEspelho from '../assets/casa/miniaturas/movel-espelho.png'
import movelEstanteBaixa from '../assets/casa/miniaturas/movel-estante-baixa.png'
import movelFestaCarnavalConfete from '../assets/casa/miniaturas/movel-festa-carnaval-confete.png'
import movelFestaCarnavalMascara from '../assets/casa/miniaturas/movel-festa-carnaval-mascara.png'
import movelFestaCarnavalSerpentina from '../assets/casa/miniaturas/movel-festa-carnaval-serpentina.png'
import movelFestaFimDeAnoArvore from '../assets/casa/miniaturas/movel-festa-fim-de-ano-arvore.png'
import movelFestaFimDeAnoEstrelaJanela from '../assets/casa/miniaturas/movel-festa-fim-de-ano-estrela-janela.png'
import movelFestaFimDeAnoGuirlanda from '../assets/casa/miniaturas/movel-festa-fim-de-ano-guirlanda.png'
import movelFestaJuninaBandeirinhas from '../assets/casa/miniaturas/movel-festa-junina-bandeirinhas.png'
import movelFestaJuninaFogueira from '../assets/casa/miniaturas/movel-festa-junina-fogueira.png'
import movelFestaJuninaLanternaPapel from '../assets/casa/miniaturas/movel-festa-junina-lanterna-papel.png'
import movelFestaLanternasLanternaChao from '../assets/casa/miniaturas/movel-festa-lanternas-lanterna-chao.png'
import movelFestaLanternasVaralDeLuz from '../assets/casa/miniaturas/movel-festa-lanternas-varal-de-luz.png'
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
import varianteAquarioModerna from '../assets/casa/miniaturas/objeto-aquario-moderna.png'
import varianteAquarioRetro from '../assets/casa/miniaturas/objeto-aquario-retro.png'
import objetoBanda from '../assets/casa/miniaturas/objeto-banda.png'
import varianteBandaModerna from '../assets/casa/miniaturas/objeto-banda-moderna.png'
import varianteBandaRetro from '../assets/casa/miniaturas/objeto-banda-retro.png'
import objetoCasinha from '../assets/casa/miniaturas/objeto-casinha.png'
import varianteCasinhaModerna from '../assets/casa/miniaturas/objeto-casinha-moderna.png'
import varianteCasinhaRetro from '../assets/casa/miniaturas/objeto-casinha-retro.png'
import objetoFliperama from '../assets/casa/miniaturas/objeto-fliperama.png'
import varianteFliperamaModerna from '../assets/casa/miniaturas/objeto-fliperama-moderna.png'
import varianteFliperamaRetro from '../assets/casa/miniaturas/objeto-fliperama-retro.png'
import objetoForno from '../assets/casa/miniaturas/objeto-forno.png'
import varianteFornoModerna from '../assets/casa/miniaturas/objeto-forno-moderna.png'
import varianteFornoRetro from '../assets/casa/miniaturas/objeto-forno-retro.png'
import objetoGeladeira from '../assets/casa/miniaturas/objeto-geladeira.png'
import varianteGeladeiraModerna from '../assets/casa/miniaturas/objeto-geladeira-moderna.png'
import varianteGeladeiraRetro from '../assets/casa/miniaturas/objeto-geladeira-retro.png'
import objetoLareira from '../assets/casa/miniaturas/objeto-lareira.png'
import varianteLareiraModerna from '../assets/casa/miniaturas/objeto-lareira-moderna.png'
import varianteLareiraRetro from '../assets/casa/miniaturas/objeto-lareira-retro.png'
import objetoMuseu from '../assets/casa/miniaturas/objeto-museu.png'
import varianteMuseuModerna from '../assets/casa/miniaturas/objeto-museu-moderna.png'
import varianteMuseuRetro from '../assets/casa/miniaturas/objeto-museu-retro.png'
import objetoPlantaInterior from '../assets/casa/miniaturas/objeto-planta-interior.png'
import variantePlantaInteriorModerna from '../assets/casa/miniaturas/objeto-planta-interior-moderna.png'
import variantePlantaInteriorRetro from '../assets/casa/miniaturas/objeto-planta-interior-retro.png'
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
  'cafe-mesa-redonda': url(movelCafeMesaRedonda),
  'cafe-cadeira': url(movelCafeCadeira),
  'cafe-balcao': url(movelCafeBalcao),
  'cafe-vitrine-doces': url(movelCafeVitrineDoces),
  'cafe-lousa-cardapio': url(movelCafeLousaCardapio),
  'cafe-banca-feira': url(movelCafeBancaFeira),
  'cafe-caixote': url(movelCafeCaixote),
  'festa-junina-bandeirinhas': url(movelFestaJuninaBandeirinhas),
  'festa-junina-lanterna-papel': url(movelFestaJuninaLanternaPapel),
  'festa-junina-fogueira': url(movelFestaJuninaFogueira),
  'festa-carnaval-serpentina': url(movelFestaCarnavalSerpentina),
  'festa-carnaval-mascara': url(movelFestaCarnavalMascara),
  'festa-carnaval-confete': url(movelFestaCarnavalConfete),
  'festa-fim-de-ano-arvore': url(movelFestaFimDeAnoArvore),
  'festa-fim-de-ano-guirlanda': url(movelFestaFimDeAnoGuirlanda),
  'festa-fim-de-ano-estrela-janela': url(movelFestaFimDeAnoEstrelaJanela),
  'festa-lanternas-lanterna-chao': url(movelFestaLanternasLanternaChao),
  'festa-lanternas-varal-de-luz': url(movelFestaLanternasVaralDeLuz),
}

/** As miniaturas das versões retrô e moderna dos objetos (B8, `objeto-<objeto>-<modelo>.png`). */
const MINIATURA_DA_VARIANTE: Readonly<Record<ObjetoDaCasa, { retro: string; moderna: string }>> = {
  geladeira: { retro: url(varianteGeladeiraRetro), moderna: url(varianteGeladeiraModerna) },
  forno: { retro: url(varianteFornoRetro), moderna: url(varianteFornoModerna) },
  aquario: { retro: url(varianteAquarioRetro), moderna: url(varianteAquarioModerna) },
  lareira: { retro: url(varianteLareiraRetro), moderna: url(varianteLareiraModerna) },
  banda: { retro: url(varianteBandaRetro), moderna: url(varianteBandaModerna) },
  fliperama: { retro: url(varianteFliperamaRetro), moderna: url(varianteFliperamaModerna) },
  museu: { retro: url(varianteMuseuRetro), moderna: url(varianteMuseuModerna) },
  casinha: { retro: url(varianteCasinhaRetro), moderna: url(varianteCasinhaModerna) },
  'planta-interior': {
    retro: url(variantePlantaInteriorRetro),
    moderna: url(variantePlantaInteriorModerna),
  },
}

/** A miniatura de uma aparência da galeria: a do objeto (clássica) ou a da versão. */
export function miniaturaDaAparencia(id: IdDaGaleria): string {
  const { objeto, modelo } = GALERIA[id]
  return modelo === 'objeto' ? MINIATURA_DO_OBJETO[objeto] : MINIATURA_DA_VARIANTE[objeto][modelo]
}
