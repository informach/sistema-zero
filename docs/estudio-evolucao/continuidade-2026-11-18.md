# Continuação da missão após a revisão

Referências: revisão `4c2ff6a61`, staging `42b395d93`. Worktree isolada
`sistema-zero-estudio-missao`, branch `estudio-missao-completar-20261118`.
Missão e correção dos seis achados autorizadas pelo usuário; GitHub Actions autorizado
para testes pesados. Não implantar, não mesclar staging automaticamente e não alterar
as frentes Pinta/Molda. Manter cores, fontes, componentes e percursos dos cursos.

## Contrato e desenho do primeiro lote

Reutilizar Blockly/IR, persistência, origem isolada, runtimes e Monaco. Não criar um
segundo armazenamento ou tentar garantir isolamento de processamento com timers.
O relatório de revisão continua válido como baseline, não será reescrito como se
os achados nunca tivessem existido.

1. Estabelecer CI de homologação isolada, sem secrets ou deploy, selecionável por
   branch/SHA; Linux/Windows, Chromium completo, Firefox e WebKit onde disponíveis.
   Publicar artefatos com versão do browser, ambiente, testes, medições e capturas.
2. R1: reproduzir arranjos e capacidades por motor; avaliar os contratos de origem
   e caminhos Worker existentes antes de alterar execução de jogos DOM/Canvas.
   Testes verdes no Chromium não qualificam Firefox/WebKit. Não desligar recursos
   ensinados, não chamar navegador não suportado de isolamento resolvido.
3. R3: executar somente revisão confirmada pela persistência. Remover corrida com
   timeout. Se houver edição durante uma gravação, confirmar a nova revisão antes
   de iniciar. Falha impede a intenção de Rodar, preserva buffer e execução anterior
   e oferece o diagnóstico existente; Parar cancela intenção, nunca uma mutação.
4. R6: atualizar documentação atual e nomear corretamente abertura da página e proxy
   de apresentação, conservando números e evidências históricos intactos.

## Tarefas e provas

- [x] Reproduzir R3 com testes de falha, demora e edição durante confirmação.
- [x] Implementar confirmação da revisão e estado de erro sem perda de buffers.
- [ ] Testar parar, mudança de projeto/perfil, autoridade e reload real.
- [x] Adicionar workflow de homologação sem herdar jobs de deploy do CI principal.
- [ ] Executar workflows no GitHub e revisar falhas/artefatos, sem contar disparo como aprovação.
- [ ] Fechar R1 por executor com evidência; registrar capacidades e limites reais.
- [ ] Completar baseline/cursos no host de homologação conforme acesso disponível.
- [ ] R2: carga/desenho incremental, integridade e ciclo completo 5/10 mil blocos.
- [ ] Etapa 3: execução leve, FS/perfis/limites e homologação Pro com dependências reais.
- [ ] Etapa 4: streaming nos motores existentes e fixtures D/E.
- [ ] Etapas 5–7: depuração, profiler opt-in e testes de autoria, por runtime.
- [ ] Etapas 8–10: adaptadores integrais, recuperação, export/build reprodutíveis e manuais.
- [ ] Homologação A–H e revisão final; commits coesos e PR com pendências explícitas.

Cada item exige testes pertinentes, navegador para fluxo de usuário, descarte/segurança,
evidência e commit. Serviços controlados não substituem serviços reais; runner hospedado
não substitui aparelho físico de entrada. Ausência de acesso não equivale a aprovação.

## Estado reproduzível após as primeiras rodadas GitHub

PR draft: https://github.com/informach/sistema-zero/pull/273, base staging.
Não houve merge ou deploy. O merge anterior de `origin/staging` foi feito somente
na branch isolada. O trabalho das outras sessões na árvore original foi preservado.

- R3: correção em `d22be2f75`; 24 testes de preparação/preview (96 asserts) e teste
  real de Rodar/reload sem aguardar autosave. A proteção contra interrupção tardia
  foi mantida em `3c6e02955`, com 53 testes (209 asserts) e seis casos de navegador.
- R1: o marcador tardio e o limite de console na origem são proteções adicionais,
  não fechamento do isolamento. Os dados Linux do run `44284088297` confirmam
  bloqueio no WebKit e no srcdoc do Firefox. Consultar o relatório de ambientes.
- R2, R4, R5: continuam abertos. Não substituir renderização incremental por ocultar
  SVGs após montar tudo, nem apresentar pausas cooperativas como depurador completo.
- R6: documentação atual corrigida, com métricas históricas conservadas e identificadas.
- CI: `44280842226` e `44284088297` falharam; Firefox/WebKit selecionados e uma shard
  Chromium passaram, mas isso não aprova as suítes completas. `44289781987` já confirmou
  nova medição e os casos selecionados Firefox/WebKit. Seus demais jobs e a próxima
  rodada precisam de revisão. A auditoria é um gate independente que continua falhando
  por `GHSA-fc5q-39xc-vjpf`, sem patched version publicada; não a silenciar.
- Docker: regenerado o fingerprint canônico em `57a7a6de9` depois de reproduzir a
  recusa de perfil desatualizado. Confirmar build real/validação/Python no próximo run.
- Windows: o preflight aceita grafia curta de diretórios, conservando a recusa de
  links/junctions em raiz/ancestrais/artefatos; 7 testes, 29 asserts localmente.
- Ambiente local completo: serviços e PG encerrados; dados/credenciais ignorados
  preservados. Disco insuficiente interrompeu o setup Next e uma rodada com traces.
  Remoção de caches recusada pela revisão automática; não tentar por outra via.

Retomar com `git status`, consultar `gh run list --repo informach/sistema-zero
--workflow studio-mission.yml --branch estudio-missao-completar-20261118` e revisar
logs/artefatos do SHA mais recente. O workflow usa instalação congelada e Chromium
completo; contratos incluem Chromium e WebKit para o teste real de IndexedDB.
Os novos relatórios em `docs/qa/2026-11-18-studio-*` registram comandos, resultados
e limitações. Não contabilizar execução interrompida, job disparado ou artefato de
medição com saída zero como aceite global. Depois, continuar R1/R2 e etapas 3–10
na ordem do plano, mantendo a homologação pedagógica bloqueante.

Lote adicional: corrigida a referência pública/onReady do ramo Pro compilado pelo
host e a recompilação causada apenas por novo callback `onError`. Testes reproduziram
ambas as causas antes da correção; quatro casos unitários e dois de navegador
passaram. Relatório: `docs/qa/2026-11-18-studio-host-built-controls.md`.
O job `contracts (ubuntu-24.04)` do run `44289781987` concluiu com sucesso, incluindo
suíte isolada completa e typecheck, mas corresponde a `1d486e19b`; não estender essa
aprovação aos commits posteriores. Confirmar o próximo SHA na fila do workflow.
