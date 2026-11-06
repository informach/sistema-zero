// A continuidade usa a página principal inteira; somente a headline muda.
// A explicação da Jornada do Criador e todas as demais seções têm uma fonte só.
import { PAGINA_9A17, RELATOS_9A17 } from './pagina-9a17'

export const PAGINA_CONTINUAR = {
  ...PAGINA_9A17,
  seoTitle: 'Continue na Comunidade dos Criadores Kids | Sistema Zero',
  hero: {
    ...PAGINA_9A17.hero,
    title: 'Continue ajudando seu filho a resolver problemas e fazer escolhas com mais autonomia, ',
  },
}
export const RELATOS_CONTINUAR = RELATOS_9A17
