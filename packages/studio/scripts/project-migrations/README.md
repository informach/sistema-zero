# Conversão de documentos Studio — staging e produção

Ferramenta operacional separada do editor, do player e do motor. O motor executa somente o contrato atual. O leitor histórico é `src/project-migrations`, carregado sob demanda nas fronteiras de importação/abertura. Nenhum bloco histórico volta à paleta.

## Alcance e garantias

- Inventário do banco e R2: criações integrais/em partes, assets, mural, entregas atuais/anteriores (inclusive snapshots da galeria), configurações de aulas ativas/arquivadas, rascunhos e seu `previous_document` (desfazer), estruturas, cursos e concessões congeladas. Evidências e notas históricas conservam sua proveniência.
- Preserva IDs, autoria, links, progresso, recursos, ordem de avaliação e representação autoral. Não inventa uma tradução para código dinâmico ambíguo: o plano fica pendente e não pode ser aplicado.
- SHA-256 de cada asset, tamanho, manifesto e índice conferidos antes de converter. Conversão repetida precisa produzir o mesmo resultado.
- Backups privados imutáveis em `studio-migration-backups/<sourceHash>/`, fora da coleta de lixo e da quota do aluno. O plano contém os registros anteriores e posteriores. Trate os arquivos do corpus e os backups como dados privados.
- Novas revisões de criação, comparação integral de registros e ETags para snapshots. A transação de promoção bloqueia brevemente escritas nas tabelas inventariadas e recusa diferenças, inclusive novas linhas. Não substitui trabalho concorrente.
- Cursos ganham versão nova. Rascunhos conservam edições e recebem a referência publicada convertida quando estavam alinhados; conflitos anteriores permanecem conflitos. Não há limpeza automática de progresso ou respostas.
- A revisão pedagógica dos blocos é conservada numa conversão equivalente. Quando um critério muda de representação, somente a referência correspondente nas verificações existentes é convertida; aprovações, datas e identidade de cada perfil permanecem. Jogadas e curtidas do mural não são revertidas nem bloqueiam o lote; o snapshot é protegido por ETag.
- Recuperação cria revisões novas, conserva backups e recusa edições posteriores. Seu diário é persistido antes da primeira escrita para permitir retomada após queda de conexão.

## Execução

Execute a partir de `packages/studio`, com Railway CLI autenticado. `--environment` é obrigatório em todos os comandos; o vínculo local do Railway não escolhe o destino. A allowlist em `target.ts` fixa o projeto `415d5a1c-5f75-432c-8445-b395d0977ce3` e estes destinos:

| Ambiente | ID Railway | UGC | Privado |
|---|---|---|---|
| staging | `f634cff6-aafb-4804-8b69-172fad4e946e` | `testes-ugc` | `testes-privado` |
| production | `19c212a5-85c0-493c-9630-a7a0569e8412` | `comunidade-sistema-zero-ugc` | `comunidade-sistema-zero-privado` |

Corpus e plano guardam o destino completo. Cada chamada remota compara projeto, nome/ID do ambiente e, ao acessar R2, ambos os buckets. Um lote de staging é recusado em produção, inclusive no rollback. Plano de formato 2 não aceita arquivos antigos sem destino: recapture um lote ainda não aplicado. **Para recuperar uma aplicação antiga/parcial de formato 1, preserve o corpus e use a versão original do operador; não recapture por cima dela.**

O preflight e a captura conferem tabelas, colunas e registro da migration `0098` da release B. Não produzem um inventário incompleto no schema antigo. Na produção ainda em `0075`, a recusa é esperada. Para a sequência A/B, manutenção, backups e homologação, siga o [runbook vigente](../../../../docs/runbooks/promocao-producao-aulas-2026-09-19.md).

```powershell
$migrationEnvironment = 'production' # use 'staging' no ensaio desse ambiente
$batchDirectory = '../../.cache/jogo-2d/producao-final'
bun scripts/project-migrations/cli.ts preflight --environment $migrationEnvironment
bun scripts/project-migrations/cli.ts capture --environment $migrationEnvironment --directory $batchDirectory
bun scripts/project-migrations/cli.ts plan --environment $migrationEnvironment --directory $batchDirectory
bun scripts/project-migrations/cli.ts simulate --environment $migrationEnvironment --directory $batchDirectory
bun scripts/project-migrations/cli.ts check-remote --environment $migrationEnvironment --directory $batchDirectory
```

Esses cinco comandos não alteram dados remotos. Pare a sequência se qualquer comando falhar. `capture` exige diretório novo. Resolva todas as falhas do relatório e inspecione o plano antes da promoção. `simulate` exercita interrupção, retomada, aplicação repetida, segunda migração vazia e recuperação repetida com os bytes reais em memória.

Depois de implantar a versão candidata aprovada pelo CI no destino e cumprir os gates do runbook, defina `$candidateSha` com o SHA completo dessa versão:

```powershell
bun scripts/project-migrations/cli.ts apply --environment $migrationEnvironment --directory $batchDirectory --candidate $candidateSha
```

O comando confere o commit implantado em Members e Kids, o formato do backend e a igualdade entre o plano salvo e o plano reconstruído. Verifica novamente origens e assets, guarda backups, grava e relê os objetos e só então promove o banco. Em falha, repetir o mesmo comando é seguro enquanto não houver edição concorrente. Não recapture por cima do plano parcialmente aplicado.

Após aplicar, faça novo inventário em outro diretório e gere outro plano: deve ficar sem alterações nem pendências. Teste abrir, editar/salvar, recarregar, publicar, jogar, fazer minha versão e remixar a cópia, além da continuidade das aulas e rascunhos. Teste também clientes antigos: o salvamento deve ser recusado sem trocar a versão válida.

Para recuperar o lote antes de novas edições:

```powershell
bun scripts/project-migrations/cli.ts rollback --environment $migrationEnvironment --directory $batchDirectory --candidate $candidateSha
```

A recuperação restaura o conteúdo original sob revisões novas. O aplicativo atual ainda converte esses documentos ao abrir. Para migrar novamente depois da recuperação, capture outro corpus e faça outro plano. O mesmo plano de aplicação não volta a números de revisão anteriores.

## Remoção futura

O script operacional pode ser arquivado/removido após homologação, período de recuperação e tratamento de todos os conjuntos de dados. Preserve os backups e instruções de recuperação fora do deploy. O leitor histórico do produto só pode sair quando também houver uma decisão para arquivos exportados, perfis offline e cópias externas: oferecer conversão avulsa ou recusar esses arquivos com orientação explícita. O banco migrado, sozinho, não elimina essas origens.

Versão de formato, validação de integridade, CAS e recusa de escritores antigos são parte do contrato atual; não são emulação de blocos antigos. Futuras mudanças de rótulo/categoria não exigem conversão de programa. Mudanças de dados ou semântica exigem uma nova transformação isolada, sem recolocar sobrecargas no motor.
