# Tarefas de conciliação

- [x] Buscar remoto e congelar baseline/snapshot/inventário.
- [x] Backup SHA/ZIP independente1618arquivos antes de mutar base.
- [x] Review Molda, persistência, GLB/UV e fronteiras de assets:204paths/52fontes+10diffs,semachadoconfirmado;semqualificaçãodefontesconciliadas.
- [x] Review comunidade adulta/Kids, hosts/shared, Hub/acesso:521paths/42leituras+19deltas;issues002/003.
- [x] Review objetivos/admin/Core/Members/runtime/migrações/CI:303paths/46leituras;issues001/004;parecerfavorávelàunificaçãocomcorreções,semperformanceapproval.
- [x] Stash/ref/ZIP verificáveis; FF de staging local e feature; reaplicar WIP e resolver105sobreposições/colisões. Segundo delta3d83 também integrado sem conflito, com backup fresh1638arquivos e stash retido.
- [x] Corrigir os achados comprovados da conciliação e integrar seus contratos nos fluxos Python/JS. Os onze achados dos cinco rounds foram resolvidos, com provas específicas, gates finais e revisão independente. Os limites de carregamento passaram integralmente sem aumentar os orçamentos. Isso não encerra a qualificação completa Python.
- [x] Gates reais de tipos/lint/unidades/DB/browser afetados e review da conciliação. Auditoria final aprovada em `staging-checkpoint-gates-audit.json`; imagem85b e seis kits JavaScript validados. Quatro casos de shell Linux são skips existentes no Windows.
- [x] Após gates/review: commit aff20c1f9, merge e PUSH em staging ac85a7a323491b9b2416fcc3008b17140a328284; SHA remoto confirmado e agente jornada avisado. CI39163502111 inicialmente na fila; acompanhar sem antecipar aprovação.
- [ ] Continuar lotes Python originais depois do checkpoint; fullreview/correções/validação final.
- [x] Delegar Kids configurável a agente e worktree separados, a pedido explícito do usuário. Desenho revisado pelo root; T1 (contrato/avaliador puro e paridade) autorizado em paralelo antes do checkpoint. Banco, serviços, consumidores e UI aguardam atualização para a base conciliada publicada.
- [ ] Frente pedagógica paralela, explicitamente autorizada: revisar os cinco cursos/37 manifestos e propor lotes que aproveitem objetivos centralizados. Gabarito é uma solução possível; cores, aparência e velocidades permanecem livres quando não são a condição explícita da tarefa. Validar alternativas legítimas e contraexemplos; sincronizar manifestos, roteiros, geradores e provas após revisar o desenho. Não ampliar critérios de ferramentas externas nem converter tudo automaticamente em teste de execução.

Avanços remotos adicionais 93a/832/a1e também revisados e integrados com provas de preservação do WIP. O último delta a1e tem prova PostgreSQL nova: banco vazio, contaIA primeiro, outros três consumidores em seguida,25testes/125asserções e136migrações com hashes exatos. Estado e comandos/recibos: `docs/superpowers/plans/2026-10-16-studio-python-execution-state.md`.

Orientação vigente: checkpoint inclui todo Python implementado; sem flag temporária de liberação em staging. Infraestrutura normal continua parte do trabalho. Produção somente após validação completa.

Fetch completo adicional encontrou três branches `diag/molda-*`, sem novo commit em staging. Revisão dos deltas exclusivos e comparação direta da mais recente confirmaram que os ajustes de produto já estão integrados. Seus workflows temporários substituem o CI normal; não serão mesclados. Relatório local: `staging-molda-diagnostic-branches-review.md`.
