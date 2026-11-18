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
