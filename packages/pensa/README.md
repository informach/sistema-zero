# Pensa

Planejador de jogos para crianças, consumido como código TypeScript pelos apps do monorepo. Ajuda a definir o jogo completo escolhido e organizar sua construção em missões funcionais, com linguagem simples, objetivo, regras e formas de conferir o resultado.

O plano pode começar com a preparação das extensões oficiais recomendadas. A instalação acontece por escolha explícita no Estúdio. As demais missões descrevem funcionalidades, criação de artes, integração e testes do jogo; os cursos ensinam a implementação.

## Contratos

- `@sistemazero/core/pensa` define schemas, validação do plano, revisões, capacidades, progresso, disponibilidade e próxima ação. O browser recebe as decisões do servidor.
- `PensaApp` é a única interface: meus jogos, conversa, definição, revisão de mudanças, plano, equipe e pontos de proteção.
- `PensaHostAdapter` fornece `transport`, identidade, tema, voz/narração e navegação `onOpenMission`/`onOpenGame`. O host prefixa as chamadas com `/api/pensa`.
- Recusas HTTP do transporte usam `PensaApiError`, preservando status e código. Falhas de conexão permanecem incertas; ações de proteção conservam o pedido para repetir com segurança.
- `PensaMissionHandoff` leva uma missão completa para a oficina. `PensaMissionSession`, `PensaMissionContent` e `PensaMissionPanel` vivem em `@sistemazero/ui` e são compartilhados entre Estúdio, Pinta e o host do Molda.

Planos aceitos são revisões imutáveis. Uma mudança cria um rascunho com impacto, exige aceite e pode pedir nova conferência de resultados anteriores. Abrir uma missão futura permite ler a especificação; executá-la depende da disponibilidade autorizada. A próxima ação sempre vem do servidor.

O texto ainda não enviado fica no navegador por perfil, jogo e tipo de conversa. Progresso, entregas, revisões, equipe e aceite são persistidos no servidor. A conclusão aguarda a criação salva na conta e envia sua revisão real. A criação de uma arte e sua integração no jogo são missões distintas.

## Consumo

Importe `PensaApp` e os tipos do adapter de `@sistemazero/pensa`, e `@sistemazero/pensa/styles.css`. O host configura `transpilePackages`; a folha compartilhada `@sistemazero/ui/tool-chrome.css` deve vir antes da folha do Pensa. A biblioteca não inclui router, backend, cobrança nem uma instância do Estúdio.

## Desenvolvimento

Na pasta `packages/pensa`:

```sh
bun run dev
bun run typecheck
bun test src
bun run e2e
```

O playground usa um servidor em memória e não chama provedores pagos. Abra `?vazio=1` para percorrer o primeiro envio, revisar o plano de nove missões e aceitá-lo. O exemplo padrão já está aceito. As fixtures são verificadas com `validatePensaPlan`, além da validação de formato.

A integração real usa um PostgreSQL local descartável explicitamente selecionado por `PENSA_TEST_DATABASE_URL` (banco `pensa_*`). Execute `bun run typecheck:e2e` e `bun run e2e:native`. Esse percurso usa PensaApp, a sessão de missão do Kids, o BFF, o worker, a API Elysia, o catálogo oficial e as migrations reais. Inclui falha inicial do provedor e retomada explícita antes do aceite e da execução. Identidade de QA, respostas do provedor e armazenamento de arquivos são fronteiras de teste; progresso, aceite, créditos e revisões ficam no banco. O host de verificação não substitui os editores completos.

Especificação: [reestruturação do Pensa](../../docs/plans/2026-10-16-pensa-reestruturacao-spec.md). Plano de implementação: [lotes e verificação](../../docs/superpowers/plans/2026-10-16-pensa-reestruturacao.md).
