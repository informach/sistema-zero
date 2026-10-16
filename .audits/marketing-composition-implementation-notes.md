# Autoria de composição — histórico de implementação

As notas abaixo registram a direção inicial. A integração foi implementada e provada; o estado atualizado está em [revisão da composição](marketing-l6-composition-review-2026-10-16.md). O reaproveitamento de render está em `marketing-l6-render-cache-review-2026-10-16.md`. Os demais critérios operacionais de L6 e o objetivo global continuam abertos.

## Estado inicial, antes da integração

- `packages/marketing-desktop/src/main/media/composition-source.ts` valida TSX usando AST do TypeScript, sem avaliar código. Escopo: uma função `export default function GeneratedComposition(props)`, imports visuais permitidos de Remotion, matemática determinística, JSX limitado, estilos inline permitidos, listas literais até 32 itens/até dois maps e imagens por IDs autorizados. Fonte até 32 KB, 4.000 nós e profundidade 80. Não aceita loops, mutação, imports externos, acesso a ambiente, DOM/rede, protótipos, atributos ativos ou URLs arbitrárias.
- `tests/composition-source.test.ts`: 3 testes / 36 assertions passaram. Tipos passaram (`types-composition-source2`). Corrigidos nomes contextuais incompatíveis com o parser Bun e distinção entre propriedades CSS como `top` e identificadores globais. O código ainda não está ligado ao executor/UI; nenhuma capacidade funcional foi declarada pronta.

## Direção de integração

1. Manter a biblioteca Remotion incorporada. Adicionar uma composição de execução isolada somente ao entry de render do pacote de produção, sem exportá-la ao Player ou à janela com preload. O bundle de dependências permanece preparado no build do app.
2. O worker de render valida e transpila o único arquivo TSX com TypeScript para um módulo JavaScript controlado. O componente de execução avalia esse módulo somente no Chromium de render, com imports restritos ao runtime JSX e às funções Remotion permitidas. O código-fonte não executa em Node, no main do Electron nem no renderer com ponte. A AST não é substituto do isolamento: cancelamento/prazo, memória, recursos locais autorizados e validação do resultado continuam obrigatórios.
3. Usar o bundle estático do motor e o hash do módulo validado, evitando instalar um bundler dinâmico, carregar projetos/plugins ou reconstruir React/Remotion a cada variação. A versão efetiva do compilador deve entrar na identidade (preferencialmente bundlado ao worker, cujo SHA já é conferido).
4. Fonte, parâmetros, mídias/fontes, origem e recibo da composição precisam permanecer versionados/sincronizados. Prévia validada deve circular como mídia confirmada. Clientes web/Electron reproduzem essa mídia na timeline; nunca avaliam o fonte gerado. Edição posterior pela IA recebe o fonte e parâmetros da revisão exata.
5. Preferir capacidade explícita de produção de composição sobre uma cena selecionada, integrada a request/proposal/journal/lease/aplicação CAS/Desfazer/alternativas existentes. Não usar um campo não relacionado ou simular isso como mera edição textual. Criar/ajustar cenas gráficas (texto/imagem e composições já geradas), preservando gravações, áudio e demais cenas. Animações sobre gravações exigem transparência: provar WebM VP9 com alpha, não substituir overlay por retângulo MP4 opaco.
6. Backend deve conferir autorização/escopo, proteção, source hash e render recebido, dimensões/duração/codec e vínculo da nova mídia confirmada. Saídas geradas não podem entrar no contexto congelado por mutação: adicionar manifestos produzidos de maneira explícita à validação/aplicação, com acesso revalidado. Reuso posterior preserva o recibo e as referências.
7. Fonte livre não pode fazer texto exigido desaparecer silenciosamente. Wrapper confiável deve validar legibilidade/overflow e presença do texto exigido durante o render, respeitando entrada/saída animadas. Só integrar a proposta depois da validação; falha preserva a resposta/checkpoint, não publica a receita.
8. Integrar contratos, DTO nativo (nullable obrigatório), provider-result, executor, metadados de transferência, domínio, bancada e negociação de protocolo. Não marcar pronta com apenas parser/render isolados.

## Leituras úteis já feitas

- `src/main/render-worker.ts`, `media/render-process.ts`, `execution/native-executor.ts`, `execution/video-edit.ts`, `provider-result.ts`, `provider-video-schema.ts` no desktop.
- `marketing/src/domain/workspace/{visual-request,video-proposal,editorial-proposal,references,render-result}.ts`; `infrastructure/persistence/drizzle/execution.repository.ts` (`applyProposal`, `finish`); `marketing-workbench/src/request-panel.tsx` (alvo da cena).
- `marketing-production/src/{entry.tsx,video/composition.tsx,composition-fonts.ts}`. Composição compartilhada atual continua atendendo à timeline ordinária.
- Documentação primária consultada: `https://www.remotion.dev/docs/bundle`, `https://www.remotion.dev/docs/renderer/open-browser`, `https://www.remotion.dev/docs/distributed-rendering`. A decisão de não adicionar bundling dinâmico evita a dependência operacional de Webpack no desktop; o código validado usa apenas o runtime já incorporado.

## Pendências registradas antes da integração

Implementação integrada, provas com as duas assinaturas oficiais, render/alpha, interrupção/recuperação, resultado inválido, proteção/concorrência, UI web/desktop e regressões. Depois, demais critérios operacionais listados no plano (instalação/login, vídeo longo/celular, paridade/handoff, exportação, retenção/piloto), full review, commit e merge local. Não há autorização para push/deploy e Docker não deve ser usado.
