# Continuidade do Arquipélago: plano de implementação L01

> Execução nesta sessão com a skill `executing-plans`, tarefa por tarefa, com revisão entre entregas.

**Goal:** guardar progresso das Nuvens e Farol e impedir perda de aparências antigas na migração.

**Architecture:** próxima versão de salvamento, esquemas históricos preservados, progresso monotônico conciliado por união e preferências por conflito conservador. A loja deriva o durável do salvamento; animações continuam transitórias.

**Tech Stack:** TypeScript, Zod, Zustand, Bun, API existente com Postgres local descartável.

**Spec:** `docs/plans/2026-10-29-arquipelago-entrega-integral-design.md`.

## Restrições globais

65.536 bytes UTF-8; sem truncamento; sem alterar `.env`, CI, Blender ou GLB; sem banco remoto; contratos antigos preservados. Conferir número livre antes de criar V16. Formato de ferramenta não pode mudar implicitamente junto com salvamento.

## Tarefa 1: migração e contrato

Arquivos: `packages/arquipelago-contracts/src/salvamento.ts`, testes `salvamento-v16.test.ts`, testes de versão atual e orçamento. A API já usa `SalvamentoSchema`; testar o caminho HTTP, não apenas a função pura.

Interface proposta da V16: `nuvens: { constelacoes: number }`, `farol: { pagina: boolean; concluido: boolean }`, `clima: 'sol' | 'nublado' | 'chuva'`. Recordes `nuvens-saltos` e `nuvens-balao` passam ao catálogo atual de percursos, sem ampliar o enum histórico usado pelas versões antigas. IDs de aparência legados até 80 preservados na nova versão; V15 continua com teto histórico 40.

- [x] Teste causal: migrar documento V14 com aparência de 80 caracteres mantém a ativa e a guardada; V15 mantém filhote.
- [x] Testar defaults, versão futura recusada, máscara 0..63, final concluído exige página e clima inválido recusado.
- [x] Implementar migração V15→V16 e caminho até V14→V16 sem passar pelo filtro V15. Não mudar `migrarDaV14` histórico.
- [x] Testar ida e volta JSON e orçamento no limite real dos produtores, casos Unicode e recusa acima de 64 KB sem apagar o original.

Exemplo do oráculo:

```ts
const migrated = migrarSalvamento(old)
expect(migrated?.projetos.geladeira?.aparencia).toEqual(old.projetos.geladeira.aparencia)
expect(migrated?.nuvens.constelacoes).toBe(0)
expect(migrated?.farol).toEqual({ pagina: false, concluido: false })
```

## Tarefa 2: loja, mundo e conflitos

Arquivos: `packages/arquipelago/src/estado/loja.ts`, `estado/farol.ts`, `sistemas/percurso.ts`, `sistemas/conciliar-salvamento.ts`, componentes consumidores das constelações/clima/resultado/diário/final e testes próprios.

- [x] Remover o caminho especial de recordes só da sessão, usando o salvamento dos percursos.
- [x] Escrever constelação e clima por `mudar`, que já protege leitura, visita e conflito; consumidores leem a mesma fonte.
- [x] Gravar página ao concluir a leitura e conclusão ao terminar a sequência; exibir Íris pela conquista durável. Não gravar a cada quadro.
- [x] Conciliar constelações por OR, página/conclusão por OR, estrelas por OR e melhor tempo por mínimo. Climas concorrentes distintos não recebem vitória arbitrária.
- [x] Testar criar loja, agir, serializar e criar nova loja; testar adotar salvamento remoto; visita e suporte somente leitura não alteram progresso.

Oráculo de concorrência:

```ts
expect(conciliarSalvamento(base, local, remote)?.nuvens.constelacoes).toBe(3)
// local descobre bit 0; remoto descobre bit 1; nenhum some.
```

## Tarefa 3: integração e fechamento

Arquivos: `packages/arquipelago-api/tests/integration/http.test.ts`, testes DB existentes, `docs/arquipelago-regras.md`, CLAUDE dos pacotes tocados, documentação de QA do lote.

- [x] HTTP grava e lê V16; V14 com referência longa migra sem perda; gravação acima do teto recusa sem modificar a linha anterior.
- [x] Revalidar contrato do editor Lumi com geladeira antiga e nova. Se o payload mudar incompatível, usar nova versão da ferramenta e adaptar os dois lados.
- [x] `bun test` nos três pacotes; testes DB apenas em banco descartável; typecheck com heap de 8 GB; Biome nos arquivos tocados.
- [x] Navegador: constelação, corrida e final, salvar/reabrir; pausar e sair antes do final não concede conclusão. Provar cada fluxo sem creditar conquista por hook de teste.
- [x] Revisar diff completo e registrar limites/evidências em `docs/qa/2026-10-29-continuidade/README.md`.
- [ ] Commit e integração com staging antes do push da onda.

Critério de fechamento: não basta a API aceitar os campos; o mundo deve escrevê-los e reconstruir a experiência ao abrir de novo. Pendência de browser não é conclusão completa do lote.
