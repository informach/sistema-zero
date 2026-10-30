# A01: descarte de personagens animados

Base: `1b7a6c4a1`, com a correção de `copiarArteAnimada` deste lote. Nenhuma arte alterada.

## Problema e resultado

A auditoria observou 53, 74, 95, 116 e 137 texturas em reentradas no Farol. As geometrias
permaneciam em 399, por isso o verificador antigo não reprovava o crescimento.

A cópia animada agora libera os esqueletos que `SkeletonUtils.clone` criou, além dos materiais
de brilho que já eram próprios. Geometrias, materiais comuns e texturas do original não são
descartados. O mesmo descarte pode ocorrer novamente depois de uma remontagem de efeito.

| Cenário | Geometrias após aquecimento e três ciclos | Texturas após aquecimento e três ciclos |
| --- | --- | --- |
| Computador, 1280 × 720 | 399, 399, 399, 399 | 53, 53, 53, 53 |
| Celular emulado, 390 × 844, movimento reduzido | 399, 399, 399, 399 | 53, 53, 53, 53 |

Medidas: `ciclos-computador.json` e `ciclos-celular.json`. Capturas da sala, página, fachos,
Íris e reabertura nesta pasta. Chrome headless com SwiftShader e qualidade leve, plataforma falsa
e porta local reservada pelo verificador. Não é um teste de desempenho em aparelho físico.

O roteiro também passou em chegada e apoio no alto, caminhada até a mesa, leitura, pausa,
seis fachos, retorno, conversa com a Íris, diário, persistência ao recarregar, falha de carregamento
e bloqueio antes da Lenda. Nenhum erro de página foi reportado.

## Verificações

- Vermelho: teste dirigido antes da correção, dois casos falharam porque a textura de ossos
  continuava presente depois de `soltar()`.
- Verde: `bun test tests/arte-animada-descarte.test.ts tests/ajustes-da-arte.test.ts`, 22 testes
  passaram, 206 expectativas. Protege o original, outra cópia, chamadas repetidas, realocação e
  modelo sem esqueleto.
- `NODE_OPTIONS=--max-old-space-size=8192 bunx tsc --noEmit`: passou.
- `bunx biome check src/mundo/arte-animada.ts tests/arte-animada-descarte.test.ts playground/verificar-final-farol-browser.ts`:
  passou, sem avisos ou alterações pendentes.
- Navegador: `bun build playground/verificar-final-farol-browser.ts --target=node --external playwright-core --outfile .cache/a01-farol.mjs`,
  seguido de `node .cache/a01-farol.mjs`, com `ARQUIPELAGO_PRINTS` apontando para esta pasta. Código 0.
- Suíte completa final: `bun --smol test --timeout 30000`, 1.223 passaram, 1 ignorado, 0 falharam;
  144.146 expectativas em 144 arquivos, 142,10 segundos. O teste ignorado depende de Postgres.

A primeira execução da suíte completa, concorrendo com outras verificações pesadas na máquina,
teve quatro interrupções pelo limite de cinco segundos em testes de percursos/modelos. Não houve
falha de expectativa nesses casos. A repetição usa `bun test --timeout 30000`, sem concorrência
entre as verificações desta sessão. Ainda houve interrupção de um processo de teste da abertura e
de um percurso da Vila. A máquina apresentou 74% de CPU ocupada e cerca de 1,8 GB livres em 16 GB.
A repetição final usou o modo `--smol` do Bun, que coleta memória com mais frequência, e passou.
O limite maior e o modo de memória são só do comando de teste, não do jogo nem da CI. Nenhum teste
foi removido, relaxado ou alterado para fazer essa execução passar.

## Revisão do lote

- A propriedade vem da clonagem real, sem descartar o GLB mantido pelo cache.
- O conjunto evita liberar duas vezes o mesmo esqueleto na mesma limpeza.
- Não há alocação adicional no laço de física ou de desenho: o conjunto nasce na clonagem.
- O descarte não usa uma trava permanente que impediria liberar uma textura realocada após
  retomada de um efeito React.
- Nenhum contrato, salvamento, prêmio, colisor ou arquivo do lote de barcos foi alterado.
- A prova no navegador agora observa texturas e geometrias, depois do aquecimento.

Nenhum pedido de arte. Sem push ou implantação. Celular físico e sessão longa do mundo inteiro
continuam no lote integrado Q01, separados da regressão específica corrigida aqui.
