# Lote 2: chãos nas bibliotecas

17/11/2026. Recorte implementado, testado e revisado do lote 2, que permanece em execução até a conversão da Faísca. A implantação e a validação remota completa serão conferidas no encerramento global, conforme o critério da usuária.

## Implementação

A tela da biblioteca ganhou a opção **Chãos**, com os mesmos componentes, cores e tipografia do Molda. Permite trazer PNG, JPG e WebP, editar nome, pasta, etiquetas e escala de repetição em metros, buscar, paginar e remover imagens. Os cartões de biblioteca contam modelos e chãos. Há progresso e cancelamento; imagens são preparadas sequencialmente e enviadas em grupos de até 16, limitando a memória mantida pela importação.

PNG e WebP preservam seus bytes quando não exigem ajuste de orientação. JPG é convertido para PNG sem redução automática de resolução. O importador confere os cabeçalhos antes do decoder nativo, limita dimensões e pixels, confere o resultado decodificado e libera imagem, canvas e object URL. O teto do arquivo pronto é 4 MB; até 4.096 pixels por lado e 8.388.608 pixels no total. Arquivos fora dos limites são recusados com explicação.

**Trazer do Molda** consulta as texturas na mesma galeria da conta, com o perfil fixado e a revisão conferida antes da cópia. Escolher a mesma imagem não duplica o arquivo; escolher uma revisão nova conserva a anterior. O original no Molda não é modificado. A cópia fica na biblioteca escolhida.

Foi reutilizado o fluxo existente de reserva, cota por espaço, envio direto condicional, conferência de SHA/MIME/tamanho, leitura autorizada e remoção de arquivos sem uso. Não há outro inventário nem outro bucket. O servidor também mede a imagem e compara essas dimensões com o registro. A conferência pura de PNG/WebP agora é compartilhada pelo núcleo e pelo BFF.

A migração **0156_hesitant_lorna_dane**, gerada por `bun run db:generate`, acrescenta `cenario_texturas` e o papel de arquivo `textura`. A biblioteca, o espaço e a licença continuam sendo os mesmos dos modelos. A confirmação de arquivos e o registro das texturas são atômicos sob a trava do espaço: falha de metadados ou limite da biblioteca não deixa um arquivo confirmado sem textura. Imagens usadas por modelos ou por outras bibliotecas não são removidas indevidamente.

## Verificação e evidências

- Chrome real, nos dois temas: PNG, JPG convertido e WebP; repetição sem duplicação; edição; busca por etiqueta; textura do Molda; nova revisão preservando a cópia anterior; miniaturas carregadas; layout de 390 px sem rolagem horizontal. [Resultado](evidencias/lote2-texturas/resultado.json), [claro](evidencias/lote2-texturas/biblioteca-light.png), [escuro no celular](evidencias/lote2-texturas/celular-dark.png).
- Postgres descartável: **15 testes**, incluindo a migração real, integridade das reservas, busca, compartilhamento de imagens, cascata e rollback do registro.
- Members serviço/HTTP: **33 testes**. BFF/conteúdo: **29 testes**, incluindo prova de dimensões e recusa de espaço alheio ou GLB apresentado como imagem. Gateway/Kids: **5 testes** com cobertura das rotas novas.
- Núcleo: **51 testes**; oficina/host: **33 testes**. Tipagens Members, member-shell, oficina e núcleo passaram.
- Lint global conferido sem erros. Credenciais, fontes privadas e GLBs licenciados não foram incluídos.

O ensaio de interface usa o host em memória e uma fonte simulada da galeria, mas os codificadores, o importador, o componente e o cliente de integração do Molda são reais. A persistência foi conferida separadamente no Postgres e nas rotas. Isso não substitui a validação final em staging nem representa desempenho aprovado em dispositivos físicos.

Na preparação do teste negativo SQL, o matcher de rejeição do Bun bloqueava o avanço do cliente Postgres. O teste passou a aguardar a rejeição diretamente e conferir sua classe, mantendo os mesmos casos de dimensões, espaço e tamanho errados. Não foi alterado timeout, comportamento de produção ou validação para acomodar o teste.

## Continuidade exclusiva do lote 2

Os formatos de modelos, a biblioteca viva Meus moldes, descrição/capa e o acervo da equipe já têm revisões anteriores. A próxima pendência é converter a Faísca com seu relevo e referências reais, preservando os projetos antigos. Não apresentar o perfil v1 sobre um plano como conversão concluída. Ferramentas de edição de conjuntos pertencem ao lote 3; os pincéis e a pintura de terreno pertencem ao 4. Esses lotes não foram retomados nesta passada.
