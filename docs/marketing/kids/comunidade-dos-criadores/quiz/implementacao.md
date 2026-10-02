# Implementação do quiz da Comunidade

Versão vigente: v3, refeita para tráfego frio. A [revisão correspondente](revisao-trafego-frio.md) registra as alterações e a nova verificação. As entregas e contagens abaixo documentam a implementação original da v2.

Especificação: [proposta v2](logica-e-validacao.md), autorizada para implementação em 01/10/2026. Implementado localmente em 01/10/2026, preservando as alterações anteriores das ofertas. Sem publicação ou deploy nesta etapa.

## Arquitetura e entregas

- [x] Motor puro em `packages/funnel/src/funnels/comunidade-dos-criadores/quiz/`: perguntas, conjuntos, ramificações, invalidação, perfil, condições e composição do resultado. Conteúdo derivado da copy revisada, com campos de template resolvidos por opções fechadas.
- [x] Contrato de respostas com arrays em `src/lib/quiz-types.ts`, reexportado pelo registry e usado no JSONB/fake/admin. Nenhuma mudança de DDL: a coluna continua JSONB.
- [x] Extensão opcional de `FunnelQuiz` para passos ativos, redução e completude; fluxo legado preservado. Respostas condicionais gravadas com controle otimista de revisão, descarte de ramos inativos e perfil recalculado.
- [x] `ComunidadeQuiz.tsx`: início, oito perguntas-base, até três adicionais, retorno/edição, retomada por sessão, erros recuperáveis, saída por idade e novo filho com novo lead. Sem cadastro obrigatório.
- [x] Resultado SSR com composição por perfil/estado e componente Astro próprio, reutilizando `kids-oferta.css`, `comunidade-oferta.css` e `ComunidadeVisual.astro`. Feedback com persistência e revisão. Rota da oferta escolhida por mapa explícito.
- [x] Testes de motor e handlers com fake, incluindo empate, campos ausentes, conjuntos inválidos, restrições transversais, concorrência e isolamento de funil. Regressão dos quizzes existentes.
- [x] `bun test`, `bun run typecheck`, `bun run check`, `bun run build` no pacote. Navegação real desktop/celular, imagens, teclado, retomada, edição, feedback e destino das quatro ofertas.

## Interfaces e decisões

`QuizAnswers = Record<string, string | number | string[]>`; `QuizAnswerValue` representa seu valor. `FunnelQuiz` ganha hooks opcionais `activeSteps`, `applyAnswer` e `isComplete`, além de apresentação identificada. O motor oferece `activeCommunitySteps`, `applyCommunityAnswer`, `isCommunityQuizComplete` e `communityDecision`.

O servidor continua derivando a sessão do cookie HttpOnly. PATCH aceita um token da sessão e uma revisão esperada e responde com o estado canônico; uma revisão antiga retorna conflito, sem sobrescrever outra aba. A gravação compara o JSON anterior atomicamente e atualiza respostas, etapa e perfil juntos. Estado misto/exploratório/outra procura conserva perfil null. O resultado é calculado novamente a partir das respostas.

Novo filho cria um lead separado, sem apagar a resposta anterior. O feedback identifica somente resposta fechada e revisão, nunca dados identificáveis da criança. Preços, pagamentos, contatos e os convites de continuidade ficam nos fluxos existentes.

## Direção visual

Mesmos tokens `--kof-*`, fontes Baloo/Nunito, topo navy, fundo da Comunidade, cartas brancas, botões azuis com degrau e prints reais. Layout do quiz em namespace próprio, sem copiar paleta ou reutilizar a receita visual antiga `.btn/.card`. Opções igualmente apresentadas e com inputs nativos; foco visível, retorno explícito e animação respeitando redução de movimento.

## Documentação técnica consultada

Context7: Astro `/withastro/docs` (SSR e ilhas com props serializáveis), React `/reactjs/react.dev` (inputs controlados e foco), Zod `/colinhacks/zod` (arrays, enums e refinamentos). Padrões locais conferidos com Octocode. O código segue os componentes e as rotas existentes do pacote.

## Rotas e comportamento entregue

- Entrada opcional: `/kids/comunidade-dos-criadores/quiz`.
- Resultado individual: `/kids/comunidade-dos-criadores/resultado`, por cookie HttpOnly, sem respostas na URL e com `cache-control: no-store`.
- Destinos: oferta padrão A e rotas próprias de criação de jogos, expressão visual e formação tecnológica. Empate, exploração e outra procura usam a apresentação geral, mantendo perfil principal null.
- Edição: links para os interesses, os objetivos e o apoio; revisão de todas as respostas; atualização das perguntas condicionais e do destino.
- Novo filho: novo lead, sem apagar as respostas anteriores. Revisão + token da sessão impedem que uma aba antiga escreva no conjunto de outro filho.
- Avaliação: `POST /api/leads/quiz-feedback`, com opções fechadas e confirmação só depois da gravação. Não muda o perfil automaticamente.
- Admin: enumeração das quatro motivações a partir dos rótulos; respostas múltiplas aparecem com o texto das alternativas. Acesso à oferta geral não é contado como perfil A.

## Verificações realizadas

Em `packages/funnel`, sobre o código final:

| Verificação | Resultado |
| --- | --- |
| `bun test` | 396 testes passaram, zero falhas; 3.927 asserções em 41 arquivos. |
| `bun run typecheck` | 215 arquivos, zero erros, avisos ou hints. |
| `bun run check` | 223 arquivos, sem correções pendentes. |
| `bun run build` | Build SSR concluído. |
| Servidor do build | Executado temporariamente com Bun e a configuração local, sem HMR; percurso exploratório, resultado e feedback confirmados. |
| Navegador | Desktop 1440 px e celular 390 px; sem rolagem horizontal nas telas verificadas. |

Os testes automatizados cobrem os 17 conjuntos válidos de interesses combinados com os 12 conjuntos de objetivos, os seis pares empatados, validação de campos ativos, descarte de ramificações, revisão concorrente, isolamento entre filhos e recalculação de perfil. As quatro rotas foram conferidas no navegador.

Também foram exercitados: teclado (Space/Enter), seleção inicial vazia, revisão de objetivo abrindo a pergunta de desenho, empate desenho/formação, quatro condições não atendidas exibidas juntas, saída por idade, correção de idade, retomada após recarregar, falha simulada de PATCH preservando a escolha, tentativa posterior bem-sucedida e feedback persistido. Prints carregaram sem imagens quebradas. O percurso final no servidor do build terminou sem erros ou avisos no console.

A falha simulada de rede foi retirada após o teste. O servidor temporário de conferência foi encerrado; o servidor local habitual permanece em `http://localhost:4321`.

## Alcance da validação

A implementação confirma o funcionamento e a coerência das regras. Compreensão pelas famílias, duração real, preferência entre páginas e efeito comercial continuam sujeitos ao protocolo de pesquisa já documentado. Nenhum resultado é apresentado como diagnóstico de personalidade, capacidade ou garantia de aprendizagem.
