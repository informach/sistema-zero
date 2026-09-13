# Conversão de documentos Studio — staging

Ferramenta operacional separada do editor, do player e do motor. O motor executa somente o contrato atual. O leitor histórico é `src/project-migrations`, carregado sob demanda nas fronteiras de importação/abertura. Nenhum bloco histórico volta à paleta.

## Alcance e garantias

- Inventário do banco e R2: criações integrais/em partes, assets, mural, entregas atuais/anteriores (inclusive snapshots da galeria), configurações de aulas ativas/arquivadas, rascunhos, estruturas, cursos e concessões congeladas. Evidências e notas históricas conservam sua proveniência.
- Preserva IDs, autoria, links, progresso, recursos, ordem de avaliação e representação autoral. Não inventa uma tradução para código dinâmico ambíguo: o plano fica pendente e não pode ser aplicado.
- SHA-256 de cada asset, tamanho, manifesto e índice conferidos antes de converter. Conversão repetida precisa produzir o mesmo resultado.
- Backups privados imutáveis em `studio-migration-backups/<sourceHash>/`, fora da coleta de lixo e da quota do aluno. O plano contém os registros anteriores e posteriores. Trate os arquivos do corpus e os backups como dados privados.
- Novas revisões de criação, comparação integral de registros e ETags para snapshots. A transação de promoção bloqueia brevemente escritas nas tabelas inventariadas e recusa diferenças, inclusive novas linhas. Não substitui trabalho concorrente.
- Cursos ganham versão nova. Rascunhos conservam edições e recebem a referência publicada convertida quando estavam alinhados; conflitos anteriores permanecem conflitos. Não há limpeza automática de progresso ou respostas.
- Recuperação cria revisões novas, conserva backups e recusa edições posteriores. Seu diário é persistido antes da primeira escrita para permitir retomada após queda de conexão.

## Execução

Execute a partir de `packages/studio`. Railway CLI precisa estar autenticado. O destino é fixo: projeto `415d5a1c-5f75-432c-8445-b395d0977ce3`, ambiente `staging`, buckets `testes-ugc` e `testes-privado`. O programa recusa outros destinos. Não há opção de produção.

```powershell
bun scripts/project-migrations/cli.ts capture --directory ../../.cache/jogo-2d/ensaio
bun scripts/project-migrations/cli.ts plan --directory ../../.cache/jogo-2d/ensaio
bun scripts/project-migrations/cli.ts simulate --directory ../../.cache/jogo-2d/ensaio
bun scripts/project-migrations/cli.ts check-remote --directory ../../.cache/jogo-2d/ensaio
```

Esses quatro comandos não alteram dados remotos. `capture` exige diretório novo. Resolva todas as falhas do relatório e inspecione o plano antes da promoção. `simulate` exercita interrupção, retomada, aplicação repetida, segunda migração vazia e recuperação repetida com os bytes reais em memória.

Depois de implantar a versão candidata aprovada pelo CI em staging:

```powershell
bun scripts/project-migrations/cli.ts apply --directory ../../.cache/jogo-2d/ensaio --candidate SHA_COMPLETO
```

O comando confere o commit implantado em Members e Kids, o formato do backend e a igualdade entre o plano salvo e o plano reconstruído. Verifica novamente origens e assets, guarda backups, grava e relê os objetos e só então promove o banco. Em falha, repetir o mesmo comando é seguro enquanto não houver edição concorrente. Não recapture por cima do plano parcialmente aplicado.

Após aplicar, faça novo inventário em outro diretório e gere outro plano: deve ficar sem alterações nem pendências. Teste abrir, editar/salvar, recarregar, publicar, jogar, fazer minha versão e remixar a cópia, além da continuidade das aulas e rascunhos. Teste também clientes antigos: o salvamento deve ser recusado sem trocar a versão válida.

Para recuperar o lote antes de novas edições:

```powershell
bun scripts/project-migrations/cli.ts rollback --directory ../../.cache/jogo-2d/ensaio --candidate SHA_COMPLETO
```

A recuperação restaura o conteúdo original sob revisões novas. O aplicativo atual ainda converte esses documentos ao abrir. Para migrar novamente depois da recuperação, capture outro corpus e faça outro plano. O mesmo plano de aplicação não volta a números de revisão anteriores.

## Remoção futura

O script operacional pode ser arquivado/removido após homologação, período de recuperação e tratamento de todos os conjuntos de dados. Preserve os backups e instruções de recuperação fora do deploy. O leitor histórico do produto só pode sair quando também houver uma decisão para arquivos exportados, perfis offline e cópias externas: oferecer conversão avulsa ou recusar esses arquivos com orientação explícita. O banco migrado, sozinho, não elimina essas origens.

Versão de formato, validação de integridade, CAS e recusa de escritores antigos são parte do contrato atual; não são emulação de blocos antigos. Futuras mudanças de rótulo/categoria não exigem conversão de programa. Mudanças de dados ou semântica exigem uma nova transformação isolada, sem recolocar sobrecargas no motor.
