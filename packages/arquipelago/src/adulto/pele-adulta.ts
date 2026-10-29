/**
 * O pedaço da comunidade adulta: só `jogo.tsx` o importa, e por `import()` quando
 * `plataforma.publico === 'adulto'`. O build separa este arquivo num pedaço próprio
 * (`splitting`), então o Kids nunca baixa a voz nem o CSS do adulto
 * (`tests/pele-do-jogo.test.ts` trava isso).
 */
export { ESTILOS_ADULTOS } from './estilos-adultos'
export { VOZ_ADULTA } from './voz-adulta'
