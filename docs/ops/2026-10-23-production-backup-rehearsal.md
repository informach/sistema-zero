# Ensaio real do backup de produção

Em 23/10, entre 04:48:47 e 04:49:11 UTC, um `pg_dump` consistente do PostgreSQL
18.6 de produção foi cifrado diretamente pelo age, sem arquivo intermediário em
texto claro. A chave X25519 específica foi recuperada da variável compartilhada
`RELEASE_POSTGRES_BACKUP_AGE_IDENTITY` do Railway. As variáveis brutas e resolvidas
dos 20 serviços permaneceram iguais e não receberam referência a essa chave.
Nenhuma chave anterior foi rotacionada e nenhum aplicativo foi reimplantado
por essa configuração.

O arquivo foi autenticado até EOF e restaurado integralmente com `pg_restore`
18.6 em um PostgreSQL local exclusivo: sem rede, portas ou mounts do host,
root filesystem somente leitura, dados em tmpfs, usuário postgres e limite de
384 MiB. A restauração conferiu 200 tabelas, 533 índices, 11 sequências e os
journals de Members (102 entradas) e Hub (14). O contêiner próprio foi removido
e seu CID confirmado ausente. Não houve restauração em produção.

O ciphertext tem **2.303.491 bytes**, SHA-256
`f23a35b1dfb7db5708d05464148a5a5801d3b7ca0a07d50e7b424e58c7b22c00`.
Foi enviado uma vez para o bucket privado `sistemazero-release-backups-production`,
objeto `rehearsal/production-backup-rehearsal-transfer-root-r2/f23a35b1dfb7db5708d05464148a5a5801d3b7ca0a07d50e7b424e58c7b22c00.dump.age`.
Um download novo reproduziu tamanho e SHA e foi novamente decifrado até EOF,
usando a cópia recuperada da identidade. O bucket não tem domínio público
gerenciado ou personalizado, expiração habilitada de objetos nem data catalog.

As cópias locais e a identidade ficam fora do Git, em diretório com ACL restrita
ao usuário e SYSTEM, sob `%USERPROFILE%\SistemaZeroRecovery\production\postgres`.
Dados do banco, chaves, variáveis completas, URLs assinadas e stderr bruto não
integram esta documentação. Para recuperação em outra máquina, a identidade
deve ser obtida pela conta autorizada do Railway e o ciphertext pelo R2 privado;
o SHA e tamanho acima identificam o arquivo deste ensaio.

## Limites e próxima etapa

Este é um **ensaio anterior à pausa das escritas**. Não é o backup final da
promoção. Antes das migrations destrutivas 0126/0128, ainda são necessários
o fechamento dos escritores afetados, um dump novo, nova restauração e nova
cópia remota identificada separadamente. O ensaio não prova restauração de
roles/ACL do cluster, PITR, retenção imutável ou rollback automático de uma
migração. Outros serviços têm schemas próprios; o fechamento de cinco
processos não deve ser descrito como bloqueio de todos os escritores do banco.

Os negativos de preparação foram preservados: PowerShell 5.1 carregava um
módulo Security incompatível; o adaptador passou a usar o PowerShell 7 já
instalado. O GET oficial de objeto ausente do Wrangler escreve um LF antes
do erro; o leitor aceita somente esse formato comprovado, sem aceitar outros
erros ou bytes como prova de ausência. Nenhum desses negativos enviou PUT.

Wrangler não oferece create-only atômico nesse comando. A transferência usou
nome novo, ausência conferida, intenção permanente, catálogo desabilitado e
exclusividade de configuração; não é apresentada como CAS. ACK e readback
foram positivos na execução real.

Recibos privados vinculados ao ensaio: `production-postgres-rehearsal-root-r1`,
`production-backup-rehearsal-transfer-root-r2` e
`production-rehearsal-download-authenticated-root-r1`. O primeiro tem SHA-256
`3f8293eb899e5350cbd922257f01b211b956c564f1b072cffbbacfbb4ff7cbf9`.
