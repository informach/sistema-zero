import { PAGINA_ADULTO } from './pagina'

// Decisão aprovada: toda a página é igual; somente a headline muda.
export const PAGINA_ADULTO_CONTINUAR = {
  ...PAGINA_ADULTO,
  hero: {
    ...PAGINA_ADULTO.hero,
    titulo: { ...PAGINA_ADULTO.hero.titulo, antes: 'Continue ganhando autonomia para ' },
  },
}
