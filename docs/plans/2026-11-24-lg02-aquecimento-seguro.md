# LG02 — plano de implementação

> Execução nesta sessão com `executing-plans`, seguindo o escopo já aprovado pelo usuário.

**Objetivo:** aquecer e reutilizar com posse exclusiva o executor JavaScript/Pro, corrigindo R12 e qualificando a entrega no executor real.

**Arquitetura:** uma vaga persistente por perfil/classe no Durable Object; nomes e tokens de posse por geração. Sobreposição usa contêiner exclusivo separado; só uma máquina comprovadamente limpa volta à vaga.

**Tecnologias:** TypeScript, Cloudflare Durable Objects com SQLite, Sandbox SDK 0.10.3, Bun, Chrome real e Railway.

**Desenho:** [aquecimento seguro](2026-11-24-lg02-aquecimento-seguro-design.md).

## Restrições globais

- Base main/staging `538ae843b`; preservar o checkout local concorrente.
- Python fora do aquecimento. Preservar catálogos `2c53c74…` de produção e `05294b0…` de staging.
- Preservar correções LG01 e controles de Cenários/Regiões/prévia isolada/exemplos.
- Uma operação nunca destrói uma máquina que outra pode estar usando.
- Falhas no instrumento QA não criam métodos de teste nem rotas de falha no produto.

## 1. Reprodução e reserva persistente

Arquivos: `packages/studio-runtime/src/check-container.ts`, novos `check-sandbox-pool.ts` e `check-sandbox-pool-store.ts`; testes em `tests/check.test.ts` e novo `tests/check-sandbox-pool.test.ts`.

- [ ] Restaurar somente as integrações de aquecimento da branch preservada `work/lg02-aquecimento-20261123`, conservando a fixture R11 e as correções posteriores da LG01.
- [ ] Escrever uma regressão mínima do handler com duas verificações da mesma identidade: a falha destrói a máquina compartilhada e a outra resposta deixa de passar. Rodar e guardar o resultado vermelho.
- [ ] Implementar a vaga SQLite com `acquire('check'|'warm')` e `release(lease, reusable)`, usando `{sandboxId, token, pooled}` e expiração que troca o nome do recurso.
- [ ] Testar com SQLite real: duas aquisições, perfis/classes diferentes, reinício, expiração, liberação velha e reconhecimento perdido. Não basta verificar contagem de chamadas de mock.
- [ ] Integrar o handler; provar resposta válida para a outra aba após execução/limpeza falha. A limpeza termina antes de devolver a reserva e não há destruição depois da tentativa de liberação reutilizável.

## 2. Integração do produto e imagem

Arquivos: `studio-runtime/src/index.ts`, `src/worker.ts`, `wrangler.jsonc`, `Dockerfile`, `runtime/check-warm.mjs`; caminhos já existentes de core, Members, Gateway, member-shell, Kids/Community e palco.

- [ ] Declarar/exportar o novo coordenador e sua migração SQLite nos dois ambientes.
- [ ] Conferir autorização, revisão, identidade, intervalo e seleção 2D/3D de ponta a ponta. Conservar o caminho exclusivo da LG01 quando a coordenação não estiver disponível, registrando o motivo.
- [ ] Regenerar o perfil da imagem pelos scripts do pacote; executar testes de contrato/capacidade, UI do cartão, serviços, BFF e tipos dos pacotes afetados.
- [ ] Construir e conferir a imagem Linux com o script de aquecimento, usuário sem privilégios e rede de execução desabilitada.

## 3. Qualificação real e entrega

Instrumentos/recibos próprios de LG02, sem credenciais nos arquivos. Execução sobre projetos sintéticos e o perfil de homologação já indicado, sem enviar recados nem posts.

- [ ] Publicar o runtime/imagem em homologação e repetir a prova R12 com duas abas reais, além de aquecimento sobreposto, limpeza falha e perfis diferentes.
- [ ] Exercitar suspensão e capacidade; medir primeira verificação e repetições com amostra registrada e comparar com o caminho exclusivo.
- [ ] Passar CI completo e plano no head final; implantar a onda canônica de staging e percorrer a aula autenticada, incluindo recusas de sessão/acesso/revisão.
- [ ] Revisar entradas concorrentes e promover pelos PRs/fluxos canônicos somente com os critérios atendidos. Conferir sincronização de main/staging.
- [ ] Conferir runtime, catálogos, serviços, curso preservado e controles após a implantação. Atualizar o plano gradual com resultado e limitações efetivamente observados.
