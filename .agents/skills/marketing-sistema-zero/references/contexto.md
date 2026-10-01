# Contexto de marketing do Sistema Zero

Todos os caminhos de código abaixo partem da raiz do repositório. Confira o estado atual antes de afirmar capacidade, disponibilidade ou condição comercial.

## Fontes que governam a entrega

| Assunto | Onde conferir |
| --- | --- |
| Produtos e rotas disponíveis | `packages/funnel/src/funnels/registry.ts` e os módulos em `src/funnels/` |
| Copy da página padrão | `packages/funnel/src/content/` e referências de `FunnelDef.content` |
| Páginas próprias de cada oferta | `packages/funnel/src/components/funnel/oferta/` |
| Passos e renderização | `packages/funnel/src/pages/[audience]/[produto]/`, ilhas em `src/islands/` |
| Contrato, preço e prazo de acesso | `packages/funnel/CLAUDE.md`, `FunnelDef.offerContract`, resolução de ofertas e catálogo em `packages/catalog/` |
| Voz de marketing | `packages/marketing/src/domain/copy/light-copy-rules.ts` |
| Linter mecânico existente | `packages/marketing/src/domain/copy/light-copy.ts` e espelho em `packages/marketing-app/src/lib/lightcopy.ts` |
| Produção e publicação de conteúdo | `docs/marketing.md`, `packages/marketing/CLAUDE.md`, `packages/marketing-app/CLAUDE.md` e implementação atual |
| Pesquisa e direção editorial anteriores | Documentos de copy e pesquisa em `docs/plans/` e `docs/superpowers/plans/` |

Documentos de planos são histórico de decisões e evidências, não prova automática de implementação. O manual de marketing contém trechos de fases anteriores; confirme no código a disponibilidade de publicação e métricas. Não copie datas, versões de APIs ou preços desses documentos como dados atuais.

## Produtos encontrados na integração de 01/10/2026

- `pro/no-comando-da-ia`: formação para adultos. Conferir módulo e conteúdo próprios.
- `kids/desafio-primeiro-jogo`: oferta de entrada, com contrato de acesso que precisa corresponder à página e ao checkout.
- `kids/comunidade-dos-criadores`: continuidade por assinatura. Distinguir planos, renovação, acesso e entregas disponíveis.

Esses itens são um ponto de partida; o registry atual prevalece. Para produto ainda em estudo, registre uma proposta, sem tratá-lo como disponível no catálogo.

## Direção para comunicação kids

O comprador é o responsável; a criança usa a experiência. A copy comercial conversa com o adulto. Roteiro pedagógico pertence à skill `aula-roteiro`, não às regras de anúncio.

Leia, quando tratar da Comunidade, `docs/plans/2026-09-30-comunidade-copy-v2-revisao-e-melhorias.md` e os documentos de pesquisa/implementação relacionados. A direção registrada pede:

- Explicar como criar jogos envolve escolhas, lógica, criatividade, teste e melhoria, usando cenas observáveis.
- Mostrar o que vem preparado, o que a criança faz e o que o produto oferece de fato.
- Não prometer revisão de toda atividade, prazo de resposta ou acompanhamento individual sem confirmação atual da oferta.
- Não garantir prazo de aprendizagem, ganho cognitivo ou resultado escolar a partir de pesquisa geral sobre educação.
- Não desqualificar jogos, escolas, ferramentas gratuitas ou outras atividades para defender a assinatura. Compare características verificáveis.
- Não usar culpa dos pais, medo sobre o futuro da criança, diagnósticos ou depoimentos inventados.

A pesquisa anterior pode conter marcas como `literal-conferir`, fontes não lidas e hipóteses. Verifique a fonte original antes de usar essas afirmações na copy; não converta a etiqueta de confiança em prova.

## Integração com o produto

O funil usa Astro com ilhas React e rotas compartilhadas. Aprimorar copy não significa criar um site HTML paralelo ou trocar o checkout. Preço dinâmico, cupom, recorrência, garantia e acesso devem continuar coerentes com o catálogo e com o contrato apresentado ao comprador.

O app de marketing tem ideias, conteúdos, roteiro, checklist, anexos, publicações por rede e métricas. Use esse fluxo para a operação editorial. Integrações passam pelo gateway; não crie um CRM JSON, dashboard social ou publicador paralelo. Conectar uma conta social não comprova acesso à conta de anúncios nem disponibilidade da Marketing API.

Para implementar, leia o `CLAUDE.md` do pacote e execute suas verificações. Para uma entrega exclusivamente editorial ou de pesquisa, confira texto, links, fontes e coerência da oferta; não é necessário subir todos os serviços.
