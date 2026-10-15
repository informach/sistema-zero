# Recuperação e retenção

Depois de reiniciar, o supervisor verifica journal, checkpoints, artefatos, ambientes e serviços. A interface pode abrir durante `recovering`, mas novas execuções só começam em `ready`. Falha de recuperação fica visível; `doctor` retorna código não zero. Não apague o banco para fazer a inicialização passar.

Runs em voo tornam-se interrompidos. Efeitos confirmados não são repetidos; efeitos despachados sem recibo ficam incertos. Use `/effects`, investigue no sistema de destino e chame `effects.reconcile` com evidência da aplicação ou não aplicação. A falta de resposta não prova que uma mutação não ocorreu. Recibos externos e workflows podem exigir suas próprias reconciliações além da do dispatcher.

Checkpoints com escrita interrompida são comparados por hash. Mudanças externas são preservadas e reportadas como conflito; não há `git reset --hard` automático. Equipes interrompidas preservam worktrees e handoffs, mas não têm retomada geral: prepare nova tarefa com as evidências existentes. Workflows pausam após reinício e oferecem `workflow.resume`, conservando resultados confirmados.

Artefatos têm quota agregada de 5 GiB por perfil, teto individual de 16 MB e leitura paginada de até 256 KB. A coleta remove dados não fixados sem uso há 30 dias, preservando owners ativos e coordenadores pendentes. Reserva, tombstone e contadores são transacionais. A gravação sincroniza temporário e renomeia antes de confirmar; o conteúdo é validado por SHA-256.

Logs próprios de processo têm quota agregada de 1 GiB, retenção de 30 dias, reserva antecipada e teto padrão de 4 MB por processo. Ao atingir o teto, a árvore é encerrada com `output_limit`. Arquivos de log não reconhecidos como próprios não são apagados. A saída em memória é limitada separadamente.

`/storage` e `storage.status` consultam artefatos; `storage.collect` coleta expirados; `storage.pin {id,pinned}` altera a fixação. Definições de receitas, inputs de agendas, exports e dados legados ficam fixados para não desaparecerem enquanto referenciados. Depois de arquivá-los fora do perfil, desfixe-os conscientemente. Um export interrompido pode deixar partes fixadas; elas continuam contando na quota. Não há quota física para o bind mount de workspace do Docker.

Migrações e atualizações criam backups SQLite consistentes. Um rollback só pode abrir schema compatível; restaurar backup antigo é uma decisão explícita, pois descarta os registros posteriores. Preserve o banco atual e seus artefatos antes de qualquer restauração. O [instalador](release.md) não sobrescreve um schema mais novo para simular sucesso.
