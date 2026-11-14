# Arquipélago Vagalume

Jogo 3D independente das comunidades Kids e adulta. A integração com a plataforma usa os contratos de `@sistemazero/arquipelago-contracts`; acesso, salvamento e tempo são atendidos por `@sistemazero/arquipelago-api`.

A casa, o quarto e a construção usam a biblioteca Morada e uma única casa da plataforma, com revisão e recuperação de conflitos. Casa/Construir e os portais abrem a cena nativa em escala 1; as ilhas mantêm sua física atual durante a transição. Pinta/Molda, projetos, coleções, horta e progresso continuam no jogo. Detalhes e limites de projeção da autoria estão em [CLAUDE.md](./CLAUDE.md).

No Kids, o responsável define o limite diário de tempo livre. Os segundos ativos são guardados por perfil e enviados em eventos idempotentes. Uma falha de envio pausa o jogo para permitir a recuperação. Na comunidade adulta não há limite diário. O dia usa o relógio do aparelho; essa confiança deve ser avaliada na validação de produção.

Para executar: `bun run dev`. Para verificar: `bun test`, `bun run typecheck` e `bun run test:tempo-browser` (Chrome instalado). O teste `tests/tempo-api.integration.test.ts` também requer `ARQUIPELAGO_TEMPO_TEST_DATABASE_URL` para um Postgres local descartável com nome começando por `arquipelago_test` e migrações já aplicadas; ele é pulado sem essa variável.

A arquitetura e os comandos completos estão em [CLAUDE.md](./CLAUDE.md); os padrões do jogo estão em [PADROES.md](./PADROES.md).
