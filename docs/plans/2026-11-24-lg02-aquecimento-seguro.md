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

- [x] Restaurar somente as integrações de aquecimento da branch preservada `work/lg02-aquecimento-20261123`, conservando a fixture R11 e as correções posteriores da LG01.
- [x] Escrever uma regressão mínima do handler com duas verificações da mesma identidade: a falha destrói a máquina compartilhada e a outra resposta deixa de passar. Rodar e guardar o resultado vermelho.
- [x] Implementar a vaga SQLite com `acquire('check'|'warm')` e `release(lease, reusable)`, usando `{sandboxId, token, pooled}` e expiração que troca o nome do recurso.
- [x] Testar com SQLite real: duas aquisições, perfis/classes diferentes, reinício, expiração, liberação velha e reconhecimento perdido. Não basta verificar contagem de chamadas de mock.
- [x] Integrar o handler; provar resposta válida para a outra aba após execução/limpeza falha. A limpeza termina antes de devolver a reserva e não há destruição depois da tentativa de liberação reutilizável.

## 2. Integração do produto e imagem

Arquivos: `studio-runtime/src/index.ts`, `src/worker.ts`, `wrangler.jsonc`, `Dockerfile`, `runtime/check-warm.mjs`; caminhos já existentes de core, Members, Gateway, member-shell, Kids/Community e palco.

- [x] Declarar/exportar o novo coordenador e sua migração SQLite nos dois ambientes.
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

## Evidência local inicial

Antes da correção, as duas regressões R12 falharam: execução e limpeza destruíam a máquina da outra aba. Depois passaram os testes com a reserva persistente habilitada, inclusive a confirmação de uma reserva reutilizável e outra exclusiva na sobreposição.

A suíte completa do runtime passou: **434 testes, 56 pulados, zero falhas**, 4.646 expectativas. Os pulados dependem de habilitações/dados das suas frentes e não representam prova do executor hospedado. Também passaram 34 testes Members, 16 core, 60 Gateway, 11 wrappers/BFF do member-shell e 48 do palco. Os tipos do runtime e Members passaram; Members usou os mesmos 6.144 MiB de heap do CI. As primeiras execuções da suíte ampla registraram falta das dependências próprias do runtime e, depois, quatro timeouts locais durante concorrência com a compilação. Após instalar pelo lockfile e executar a suíte sem essa concorrência, ela passou sem mudar testes ou aumentar seu timeout. A referência main também passou os 51 testes Python de artefatos/promoção.

O `workerd` real passou a prova de 12 pedidos RPC concorrentes e persistência após reinício do Durable Object. A imagem `sistemazero-studio-runtime:lg02-20261124` passou o smoke (UID 1000, dependências protegidas, rede desabilitada), o comando de aquecimento e os objetivos 3D reais, incluindo as recusas esperadas. As tipagens geradas pelo Wrangler conferem o novo binding e a opção de interrupção. Isso ainda não qualifica a promoção: faltam o executor hospedado, falhas/capacidade/suspensão, percurso autenticado, CI remoto e ondas canônicas.

O instrumento hospedado será um Worker temporário separado de staging, com aplicações de contêiner próprias e teto de duas instâncias por classe. Ele usa o mesmo código/imagem e acrescenta somente controle QA autenticado: uma barreira após as duas máquinas estarem prontas, falhas por comandos reais no contêiner e descarte dos recursos sintéticos. A capacidade reduzida permite exercitar a recusa sem ocupar o teto do serviço usado por outras frentes. Não é uma medição de carga de dez instâncias 3D. As rotas QA não fazem parte do entrypoint de produção.
