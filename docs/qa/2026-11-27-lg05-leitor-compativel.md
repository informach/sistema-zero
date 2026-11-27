# LG05 A — preparação do leitor compatível

27/11/2026. Leitor A implementado e qualificado localmente na staging compartilhada. **Não é conclusão da LG05 nem recibo de implantação.** [Plano da etapa](../superpowers/plans/2026-11-27-lg05-regras-projecoes.md); [acompanhamento geral](../plans/2026-11-23-plano-de-liberacao-gradual.md).

## Comportamento implementado

- O inventário causal passa a admitir leitor 8. O BFF verifica e sela os documentos nativos 9 completos: mapa com livro de regras, hexagonal com livro e isométrico sem livro.
- O host separa suas capacidades em `pinta-workshop-capabilities.ts`: leitor 8, gravador 7 e teto nativo público 8. O canal legado permanece em leitura/escrita 6.
- A instalação de uma cópia canônica baixada usa a autoridade de leitura, com sanitização integral, base transacional e orçamento existentes. Edições, importações e unidades locais continuam passando pela autoridade do gravador. Não há conversão para formato anterior.
- A fila privada de qualificação 8 conserva os documentos offline e resolve confirmação perdida sem publicar outra revisão. Essa configuração não é selecionada pelo host público.

## Reprodução e correção

As novas provas reproduziram quatro recusas na base: leitor 8 respondia 400 e as três variantes respondiam 409 sem selo. Após preparar o leitor do serviço/BFF, as três verificações passaram.

A prova pela conta encontrou um bloqueio adicional: a cópia baixada passava pelo carimbo do gravador local 8 e não era instalada. `LocalPersistenceFormat.applyReadTransitions` separa somente a instalação canônica da autoria local; o restante da autoridade não foi relaxado. A repetição recuperou os mesmos documentos pelo codec físico e continuou recusando uma edição nativa 9 sem tocar no disco/fila.

Na preparação dessa prova, a tentativa de editar uma fixture sem sua origem e sem observar as dependências foi recusada pelas guardas existentes. A prova passou a abrir a revisão pela persistência e observar suas referências antes de tentar editar, como o editor real; as guardas não foram removidas.

## Evidências

| Comando/prova | Resultado |
| --- | --- |
| Base focada: codecs, recuperação privada, conta regional e rotas | 15 aprovados, 188 expectativas, zero falhas |
| Core: `bun test packages/core/src/creations` | 71 aprovados, zero falhas, 36.643 expectativas |
| Core completo: `bun run --cwd packages/core test`, repetição final | 3.371 aprovados, zero falhas, 214.396 expectativas |
| Pinta, comando oficial na pasta do pacote: `bun run test` | 3.010 aprovados, 18 condicionais pulados, zero falhas, 35.917 expectativas; 307 arquivos |
| Member Shell, comando oficial na pasta do pacote: `bun run test` | 2.832 aprovados, dois condicionais pulados, zero falhas, 18.407 expectativas; 328 arquivos |
| Tipos Pinta: `bun run --cwd packages/pinta typecheck` | Aprovado |
| Tipos Member Shell: `bun run --cwd packages/member-shell typecheck`, com heap de 8 GiB | Aprovado |
| Tipos Core: `bun run --cwd packages/core typecheck` | Aprovado |
| Aceite final focado após a revisão das capacidades: BFF, conta, host e oficina | 13 aprovados, zero falhas, 65 expectativas; as fixtures da conta e do host rodam isoladas |
| Biome dos dez arquivos TypeScript alterados | Aprovado; dois arquivos formatados |
| Guardas pedagógicas, ausência de flags e grafo das regras | 893 aprovados, zero falhas, 191.240 expectativas |
| Perfil do executor, adaptador regional Phaser e cópias dos motores Pro | Três conferências aprovadas, sem regeneração necessária |
| Build de produção do playground e `protected-lessons.spec.ts`, Chrome, sem repetição | Cinco aulas aprovadas; build de 3.235 módulos, 21,32 segundos; percurso completo em 8,5 minutos |
| `ilha-do-farol-browser.ts`, cenário correto, Chrome real | Sete objetivos de execução aprovados, código de saída zero |

As provas da conta usam o IndexedDB de testes com o codec físico ligado e os algoritmos reais de autoridade, captura, fila, descida e recuperação. O servidor dessa fixture é simulado; não é uma prova de PostgreSQL remoto. As rotas do BFF usam descompressão limitada, hashes, admissão e atestação reais sobre um armazenamento em memória.

A primeira tentativa de rodar toda a suíte do Pinta a partir da raiz ignorou o `bunfig.toml` do pacote e ficou sem DOM (`document is not defined`), resultando em 730 falhas e um erro. Não foi contada como aprovação. A execução pelo comando oficial, na pasta correta e com o preload existente, passou integralmente; nenhum teste/configuração foi enfraquecido.

A primeira rodada completa do Core teve 3.370 aprovados e um timeout de cinco segundos no teste de paridade de bloqueios da Jornada. O mesmo arquivo passou isoladamente (seis testes; o caso demorou um segundo), sem mudar prazo ou código. A repetição integral terminou em 15,96 segundos com 3.371 aprovados e nenhuma falha. A rodada inicial permanece em `.cache/lg05/core-completo.log`; a final está em `core-repeticao.log`.

Os 18 condicionais do Pinta dependem de programas nativos/ambientes externos. Os dois condicionais do Member Shell são a compilação regional na imagem real e a integração BFF/Gateway/PostgreSQL/MinIO. Eles não foram executados nesta rodada geral e não são contados como aprovados.

## Limites e sequência

- Falta qualificação hospedada e implantação do leitor A, com fonte e serviços identificados. A fonte local não comprova serviço remoto.
- A entrega B ainda precisa da abertura/edição projetada na oficina e da qualificação de PNG 6/cena 5 e seus destinos antes de elevar gravador/teto públicos.
- Não houve publicação de QA, alteração de curso/progresso, envio de recado nem mudança da distribuição Python.
- O retorno da futura ativação do gravador deve ser para um leitor A já qualificado, conservando os documentos 9/nuvem 8. Não rebaixar documentos para retornar.

Logs locais: `.cache/lg05/`. Guardar os recibos hospedados separadamente quando essa etapa ocorrer.
