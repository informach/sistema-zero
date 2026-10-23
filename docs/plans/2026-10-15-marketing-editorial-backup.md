# Cópia e restauração do acervo editorial

O servidor mantém os originais e finais editoriais confirmados como objetos imutáveis. Eles não entram no arquivador legado R2→Drive nem em limpeza automática de cache: o cache desktop pode ser descartado depois da confirmação; o arquivo canônico não. Excluir uma representação não apaga suas revisões ou os arquivos que elas referenciam.

O comando administrativo `bun run backup:editorial` no pacote `marketing` implementa `create`, `verify`, `restore-assets` e `restore-database`, seguidos de um diretório. Não é uma etapa do fluxo de criação do usuário. A instalação precisa de `pg_dump`/`pg_restore` compatíveis com a versão do servidor; caminhos alternativos podem ser configurados em `PG_DUMP_PATH`/`PG_RESTORE_PATH`.

## Conteúdo e integridade

- O formato v1 inclui o schema PostgreSQL `marketing`, seu journal `drizzle.marketing_migrations` e todos os arquivos editoriais confirmados no mesmo snapshot transacional. Catálogo e dois dumps usam `pg_export_snapshot`; alterações concorrentes posteriores não entram parcialmente no backup.
- Cada arquivo possui manifesto, tamanho e SHA-256. A leitura/gravação de mídia é feita em streaming. O catálogo aceita até 100 mil arquivos/64 MiB; cada dump, até 100 GiB. Exceder um limite encerra a operação com erro, sem declarar backup completo.
- O destino deve ser novo. `manifest.json` só é publicado depois de todos os arquivos serem conferidos; diretório sem esse manifesto é incompleto. Erros conservam a pasta parcial para diagnóstico, sem substituir uma cópia anterior.
- Não inclui o schema de identidade `auth`, chaves de criptografia, mídia legada R2/Drive, instalação dos clientes de IA, credenciais locais de assinaturas ou arquivos ainda não sincronizados. Esses itens exigem sua própria política. Não restaurar o schema marketing isoladamente sobre uma instalação ativa.

## Operação

`create` usa exclusivamente `MARKETING_BACKUP_DATABASE_URL` e as configurações `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_MARKETING_BUCKET`. `verify` é local e não usa credenciais. Nunca gravar esses valores no comando, relatório ou repositório. Os dumps incluem conteúdo privado e tokens sociais cifrados; guardar o diretório em volume cifrado e copiar para um destino independente com acesso restrito. A agenda, retenção externa e alarmes desse armazenamento pertencem à instalação; este comando não afirma que exista backup remoto automático.

Para recuperação, preparar um banco vazio e uma instância offline com **nova origem**. Isso impede que cursores/outboxes de clientes da instalação antiga sejam reutilizados após voltar no tempo. Restaurar a identidade correspondente por seu processo próprio, preservando os IDs dos membros; reconectar contas sociais depois da conferência.

1. Executar `verify` e conferir o alcance/data do manifesto.
2. Configurar explicitamente o destino R2 e executar `restore-assets`. A verificação integral antecede qualquer escrita; somente chaves ausentes são criadas. Objetos existentes são conferidos byte a byte e nunca sobrescritos. Repetir a operação é seguro; divergência exige diagnóstico.
3. Configurar `MARKETING_RESTORE_DATABASE_URL` e `MARKETING_RESTORE_NEW_INSTANCE=true`; executar `restore-database`. O destino não pode conter schema marketing ou seu journal. Falha parcial mantém a instância offline; usar outro banco vazio depois de corrigir a causa, sem apagar automaticamente dados.
4. Conferir membros, projetos, edições, arquivos e journal. Publicações pendentes ficam em falha com checkpoint preservado, execuções ficam encerradas, uploads/transferências incompletos ficam em falha e contas conectadas ficam desabilitadas. Nenhum trabalho é retomado automaticamente. Conferir também o estado externo que pode ter mudado depois do backup.
5. Iniciar o servidor isolado, conectar os desktops à nova origem, revisar entregas incertas e só então reconectar redes. Arquivos legados precisam de recuperação própria antes de reativar o arquivador Drive. Não conectar clientes antigos à origem restaurada.

## Prova local

`bun run packages/marketing/scripts/review-backup.ts`, a partir da raiz, usa exclusivamente o cluster Docker de revisão na porta 15439 e cria dois bancos identificados por UUID. Depende do PNG já renderizado na prova híbrida. Demonstra pg_dump/pg_restore reais, snapshot concorrente consistente, edição e revisão idênticas, arquivo recuperado com SHA-256 idêntico, replay sem nova escrita, recusa de objeto divergente, corrupção detectada antes de escrever e suspensão de envios. A mídia usa um adapter de revisão em memória; não equivale a um ensaio remoto R2 nem de recuperação de toda a instalação. Evidência local em `.cache/backup-proof/evidence.json`.
