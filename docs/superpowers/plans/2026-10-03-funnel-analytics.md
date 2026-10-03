# Medição do funil e entrada da bio — plano de implementação

> Execução com writing-plans, executing-plans e drizzle-safe-migrations, na sessão atual. O usuário aprovou a implementação e escolheu raiz curta + `/como-funciona/`.

**Objetivo:** medir páginas e interações dinâmicas, ligar navegação a resultados comerciais e apresentar os dados no painel existente. Preservar o histórico quando páginas e quizzes mudarem.

**Arquitetura:** coletor único no layout Astro, descoberta do DOM com exclusões de privacidade, endpoint validado no mesmo domínio, tabelas do schema `funil`, relatórios autenticados. Pagamentos continuam tendo o servidor como autoridade. Definições dos quizzes são fotografias imutáveis identificadas pelo hash do conteúdo e pela versão funcional.

**Stack:** Astro, TypeScript, React no painel e quizzes, Zod, Drizzle/PostgreSQL, bun:test. Sem nova dependência de analytics.

**Spec:** proposta aprovada na conversa de 03/10/2026. Acréscimos: quizzes mutáveis separados por produto; coleta não depende de catálogo prévio de seções; raiz curta e apresentação em `/como-funciona/`.

## Restrições

- Não modificar as perguntas em elaboração, checkout financeiro ou trabalho concorrente em outros pacotes.
- Não guardar valores de campos, respostas livres, URLs completas, CPF, contato ou texto de áreas privadas na telemetria.
- Só iniciar navegação analítica após escolha positiva; recusa preserva o quiz e a compra. Revogação interrompe envio e apaga o vínculo analítico.
- Identificadores explícitos nos componentes têm prioridade; descoberta automática cobre elementos novos e mutações do DOM. Versão da página é calculada pelo conteúdo público/estrutura, sem depender de versão manual por seção.
- Contagem de navegador não equivale a pessoa; base medida deve ficar explícita. Eventos comerciais e histórico anterior não são inventados nem somados em duplicidade.
- Migração gerada por Drizzle, aditiva e aplicada somente ao banco local conferido. Não publicar nesta etapa.

## Tarefas

### 1. Contratos, versões e testes
- [x] Criar `src/analytics/{types,quiz-definition,page-context,protocol}.ts`.
- [x] Fotografar perguntas: produto, hash, versão declarada, chave estável, título, tipo, posição e opções. Mudanças de texto/opções/ordem alteram o hash; igualdade preserva o hash.
- [x] Validar eventos, lotes, datas, caminhos e propriedades; rejeitar identificadores comerciais enviados como eventos de navegador.
- [x] Testar estabilidade, alterações e separação entre produtos, consultas sem PII e limites do protocolo.

### 2. Persistência, consentimento e ingestão
- [x] Criar tabelas de visitantes, sessões, eventos, vínculos com leads e definições de quiz, com índices e deduplicação por ID.
- [x] Implementar porta/repositório analítico separado, handlers e rotas `/api/analytics/*`; mesma origem, cookies HttpOnly, lotes limitados e rate limit próprio.
- [x] Persistir antes de confirmar; aceitar reenvio sem duplicação; ambiente definido pelo servidor; retenção de navegação de 90 dias.
- [x] Gerar migração, inspecionar SQL e validar num banco local.

### 3. Coletor e navegação dinâmica
- [x] Criar `Analytics.astro`, script cliente e preferência de cookies; incluir pelo BaseLayout apenas nas páginas públicas pertinentes.
- [x] Descobrir links, botões, detalhes, imagens ampliáveis, seções e vídeos; MutationObserver acompanha conteúdo novo; IntersectionObserver acompanha exposição.
- [x] IDs explícitos têm prioridade sobre identidade estrutural. Rótulos vêm apenas de conteúdo público; quiz/resultado/checkout não fornecem texto dinâmico ao coletor.
- [x] Fila limitada, reenvio com o mesmo ID, `fetch keepalive`, isolamento por sessão, revogação entre abas e erros sem interromper a navegação.

### 4. Quizzes e ligação comercial
- [x] Passar a definição atual às duas ilhas de quiz; identificar pergunta pela chave, e não pelo índice.
- [x] Guardar versão no lead, rejeitar envio de cliente desatualizado e preservar histórico da versão anterior.
- [x] Registrar apresentação da pergunta, resposta efetivamente salva e conclusão. Perguntas condicionais são avaliadas entre quem as recebeu.
- [x] Ligar sessão e lead no servidor; reconhecer contato salvo e compras confirmadas sem confiar no navegador.

### 5. Relatórios
- [x] Criar endpoint autenticado e nova aba de métricas no painel do funil.
- [x] Filtros por período, produto, ambiente, origem e versões; páginas, elementos, campanhas e percursos.
- [x] Seções separadas para os quizzes de cada produto, com títulos históricos e versão selecionada.
- [x] Conversões de uma mesma coorte, caminho direto/quiz separados, receita inicial identificada e compras sem atribuição visíveis.
- [x] Mostrar última coleta, janela disponível, ausência de dados e erros de consulta de forma distinta.

### 6. Raiz e apresentação
- [x] Mover a apresentação existente para `/como-funciona/`, preservando prints, FAQ e estilo.
- [x] Montar raiz curta com avatar real existente, posicionamento e botões para Comunidade, como funciona, quiz da Comunidade e Desafio.
- [x] Preservar origem nos links, metadados e sitemap; conferir ambas as páginas no celular.

### 7. Verificação e documentação
- [x] Testes de contrato, ingestão, deduplicação, consentimento, versões e relatórios; regressão dos quizzes existentes.
- [x] Testes reais no navegador: consentimento/recusa/revogação, conteúdo inserido depois, troca de pergunta, navegação e nenhuma coleta de dados de formulário.
- [x] `bun test`, `bun run typecheck`, `bun run check`, `bun run build`, `git diff --check`.
- [x] Registrar decisões, arquivos, migração, cobertura e limitações observadas em `docs/marketing/medicao-funil.md`.

Escopo visual aprovado: prints por versão/largura, recortes e mapa de cliques; reprodução de sessões adiada. Processo separado em packages/funnel/scripts/analytics-snapshots.ts. Ativação em produção é uma etapa de publicação; ver docs/marketing/medicao-funil.md.

