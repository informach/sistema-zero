# Liberação JavaScript com Python administrativo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preparar a liberação de JavaScript e as gravações, mantendo o código Python integrado e sua criação visível somente a administradores.

**Architecture:** Uma opção de apresentação explícita no host compartilhado recebe a decisão das páginas Kids/Adulto. A opção controla a descoberta e a oferta Python; os contratos de execução e os demais fluxos permanecem existentes.

**Tech Stack:** TypeScript, React, Next.js, Bun, Playwright.

**Spec:** `docs/plans/2026-10-20-python-selector-admin-design.md`.

## Global Constraints

- JavaScript é padrão; preservar modos, acesso, persistência e integrações existentes.
- Somente `admin` e `superadmin` recebem a nova oferta; `staff` não é equivalente.
- Nenhuma nova restrição em importação, Mural, remix ou autorizações de runtime.
- Preservar integralmente as falas gravadas, montagem, sequência e valores ensinados.
- Serializar testes pesados; não encerrar aplicativos do usuário.

## Task 1: Fechar a revisão pedagógica e o lote de liberação

**Files:** fontes em `docs/aulas-interativas-tecnico/qa/`; cursos em `docs/aulas-interativas/kids/` e `docs/aulas-interativas/adulto/`; contratos compartilhados Core/Studio/Members/Admin; relatório `docs/aulas-interativas-tecnico/revisao-verificacao-2026-10-20.md`.

- [x] Preservar as 86 falas Farol e o caderno original; integrar os ajustes mínimos.
- [x] Separar no teste estrutural os critérios que exigem execução real, sem alterar o avaliador de produção.
- [x] Executar a suíte integrada dos cursos após o review: 384 testes/24.351 asserções passaram em 20/10/2026.
- [x] Validar os 74 manifestos canônicos (37 Kids + 37 Adulto), sem ativar os candidatos Cadê pendentes.
- [x] Revisar os objetivos e os trechos de conferência das 74 aulas, registrando a decisão por par no relatório. As 4.610 linhas citadas dos roteiros permanecem idênticas às referências; preservar os valores ensinados não exige copiar esses valores na avaliação.
- [x] Integrar os contratos compartilhados e corrigir os achados do review: ações Farol no mesmo ramo, prioridade de derrota no Nave, ausência do medidor Dino independentemente da posição e termos dos controles na descrição final. Contratos compartilhados: 84 testes/516 asserções. Texto é conferido por termos explícitos, sem interpretação semântica.

## Task 2: Restringir a oferta de criação Python na interface

**Files:** `packages/member-shell/src/components/creator/studio-full-client.tsx`; páginas `packages/community-kids/src/app/(app)/estudio/page.tsx` e `packages/community/src/app/(app)/estudio/page.tsx`; helper existente `packages/member-shell/src/lib/studio-tier.ts`; testes existentes de papéis e descoberta.

**Interfaces:** opção `showPythonCreation?: boolean`, padrão `false`; páginas derivam `role === 'admin' || role === 'superadmin'` do contexto do servidor.

- [x] Acrescentar a opção explícita, independente de `showExamples`.
- [x] Habilitar `useFreeStudioOptions` somente com essa opção e fora de missão Pensa; projetar os mesmos critérios nos avisos e props de criação Python.
- [x] Passar a decisão administrativa em ambas as páginas pelo helper `canShowPythonCreation`, preservando todos os demais props.
- [x] Verificar aluno/admin e a consulta desabilitada: 21 testes/85 asserções; Pensa isolado 9/39; rota Pro 8 casos. Biome dos seis arquivos, diff-check e revisão independente passaram.
- [x] Commitar o lote isolado após verificação.

## Task 3: Verificar JavaScript e integrar staging

**Files:** cenários existentes Studio/Pensa, configuração de CI e registros de QA.

- [x] Concluir no CI os sete cenários JavaScript reais de edição/persistência/Pensa, preservando negativos locais anteriores e seus limites. No commit `a5ac64b14`, workflow `39495346790`, tentativa 1, os sete cenários e o cenário Pro de edição por teclado passaram, sem repetição nem skips. Os três shards Chromium somaram 325 testes aprovados e 10 skips fora desses alvos. O build local r4 excedeu o orçamento RSS antes de qualquer teste; não conta como falha funcional nem como aceite.
- [ ] Conferir o CI do commit que reúne este lote; corrigir falhas reais sem enfraquecer critérios.
- [ ] Corrigir a dependência Vite apontada por `audit:image`, atualizar o perfil canônico e verificar a implantação coerente do Worker e da imagem antes de declarar o Pro validado.
- [ ] Homologar a recuperação determinística dos projetos Pro existentes. O reparo implementado em `24d298969` atualiza somente o Vite 8.0.16 conhecido e seu lock canônico antes da execução, sem IA ou créditos, em Full, aulas, salas e Admin; preserva os demais arquivos e usa CAS/Undo. Testes de transação, componentes e autorização passaram; o review corrigiu o cancelamento de leitura do novo BFF. Faltam CI completo e execução real com Worker/imagem coerentes em staging. Não tratar abertura/exportação como prova de compilação.
- [x] Revisar o lote de conciliação pedagógica, seletor administrativo, layout das missões e dependências; integrar/push em staging (`a5ac64b14`). Essa publicação no Git não equivale à atualização dos serviços nem à homologação completa do Python.
- [ ] Informar separadamente o estado da liberação JavaScript e o que continua pendente na homologação Python.

Verificações adicionais em 20/10: a imagem local com Vite 8.1.6 e perfil `9e33e74e…` passou pelo smoke sem rede e pelos seis kits, com usuário não root, compilação, comportamento e captura PNG. O bundle correspondente do Worker foi produzido por dry-run. Isso não comprova publicação no registry ou implantação de staging. A tentativa 2 do CI passou por Molda e Windows e revelou dois testes editoriais desatualizados: os sons alternativos passaram a controles positivos; ausência do efeito e efeito apenas em evento alheio continuam controles negativos, com serialização Blockly real. O foco corrigido passou com 19 testes e 245 asserções; o CI completo da correção ainda precisa concluir.

Atualização da regressão de empacotamento em 20/10: no commit `10a69eda5`, CI `39504777180`, os três shards Chromium passaram com 325 testes e dez skips fora dos oito alvos JavaScript/Pro; esses oito passaram na primeira tentativa. Kids, Windows, Firefox, WebKit e armazenamento macOS também passaram. O job central parou no orçamento do bundle, antes da tipagem global. A instalação local ainda apontava para Vite 8.0.16; após `bun install --frozen-lockfile`, Vite 8.1.6/Rolldown 1.1.5 reproduziu os 25 arquivos iniciais do CI. A medição com o compilador anterior não qualifica o atual.

A configuração do playground agora reúne o grafo inicial pela tag oficial `$initial` e os módulos compartilhados que o editor já alcança por imports estáticos. Os imports dinâmicos, as três fronteiras existentes e `strictExecutionOrder` permanecem preservados. O teste original passou com 27 asserções, mantendo os tetos anteriores; o ajuste remoto `cdb7073d2` foi conciliado sem conservar o aumento dos tetos.

| Escopo | Arquivos | Bytes | Gzip |
| --- | ---: | ---: | ---: |
| Inicial | 2 | 346.215 | 112.674 |
| Rota do editor, além do inicial | 5 | 3.949.373 | 1.218.684 |
| Blocos | 12 | 4.501.495 | 1.187.547 |
| Ponte | 13 | 3.980.275 | 1.050.886 |
| Código | 10 | 2.417.435 | 666.547 |

Os conjuntos de módulos carregados antes/depois são idênticos no inicial (86), na rota (514) e na união da rota com cada modo: Blocos 642, Ponte 638 e Código 548. Os hashes do CSS também são iguais. A contabilização isolada dos modos inclui módulos compartilhados que a rota já carregou; não significa download adicional. Três testes existentes no Chromium passaram com build de produção novo, sem repetição: abertura em Blocos, execução do script na Ponte e criação de arquivo no Pro. Build, preview e runner encerraram com código zero e a porta 5195 ficou livre. O CI do próximo commit e a homologação dos serviços publicados continuam pendentes.
