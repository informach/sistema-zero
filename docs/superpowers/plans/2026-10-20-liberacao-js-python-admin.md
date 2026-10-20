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

## Task 1: Fechar o lote pedagógico de liberação

**Files:** `docs/aulas-interativas-tecnico/qa/pedagogical-project-examples.test.ts`; manifesto e roteiros Farol já integrados.

- [x] Preservar as 86 falas Farol e o caderno original; integrar os ajustes mínimos.
- [x] Separar no teste estrutural os critérios que exigem execução real, sem alterar o avaliador de produção.
- [x] Executar a suíte dos cursos: 219 testes/23.819 asserções passaram em 20/10/2026.
- [x] Validar os 37 manifestos canônicos, sem ativar os candidatos Cadê pendentes.

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

- [ ] Concluir no CI os sete cenários JavaScript reais de edição/persistência/Pensa, preservando negativos locais anteriores e seus limites. O build local r4 excedeu o orçamento RSS e foi encerrado antes de qualquer teste; não conta como falha funcional nem como aceite.
- [ ] Conferir o CI do commit que reúne este lote; corrigir falhas reais sem enfraquecer critérios.
- [ ] Revisar o lote completo, conciliar qualquer avanço remoto e integrar/push em staging.
- [ ] Informar separadamente o estado da liberação JavaScript e o que continua pendente na homologação Python.
