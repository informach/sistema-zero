# Molda Cenários — revisão de plataforma e primeira passada de bibliotecas

16/11/2026. Continuação do plano integral do Claude e do PDF aprovado. Esta revisão **não fecha os lotes 1 ou 2**, nem substitui a revisão final.

## Lote 1: evidências locais

As quatro telas existentes foram preservadas e fotografadas no navegador: início, bibliotecas, mundo e oficina. As capturas cobrem 1440, 1366×768, 1024, celular 390×844 e temas claro/escuro. [Capturas](evidencias/lote1/05-oficina.png); [celular](evidencias/lote1/12-oficina-celular.png); [tema escuro](evidencias/lote1/14-oficina-escuro.png). A conferência visual manteve as seis abas, ferramentas à esquerda, palco, painel recolhível e gaveta inferior do PDF.

A migração 0151 foi exercitada em Postgres 17 **descartável**, separado dos bancos de autoria e da plataforma. Sete testes de repositório passaram. A imagem Docker do Members foi construída e passou pelo smoke real com usuário sem privilégio, sistema de arquivos somente leitura, rede desligada e `/tmp` temporário; o teste conferiu os sete workspaces e os 152 registros de migração. Isso não comprova migração ou funcionamento de conta no staging remoto; essa prova continua pendente.

## Lote 2: implementado nesta passada

- Importação de GLB, GLTF com binários/imagens, OBJ/MTL, FBX, pastas escolhidas/arrastadas e ZIP com subpastas. O conversor e a medição executam em worker; o retrato usa a fila WebGL existente.
- Leitor ZIP compartilhado com o Molda, com CRC, orçamento inflado, limite de arquivos, recusa de traversal/duplicatas normalizadas e entradas de diretório Windows. Os backups do Molda conservam o contrato anterior.
- Recursos resolvidos apenas dentro do conjunto escolhido. Blobs e data URIs são lidos diretamente, sem `fetch(blob:)` ou afrouxamento da CSP dos apps. Textura ausente não é aceita silenciosamente como modelo sem arte. Animações reconhecidas pelo importador acompanham o GLB convertido. Unidade declarada do FBX é convertida de centímetros por unidade para metros.
- Cancelamento encerra o worker e impede novos uploads/registros. Sair da biblioteca cancela seu trabalho; o renderer de miniaturas é liberado depois das fotos pendentes.
- Edição de nome, pasta e etiquetas; filtro por pasta; busca existente sem acentos; etiquetas clicáveis; indicação da cota; confirmação ao retirar modelo. Paginação não incorpora respostas de uma consulta anterior e não dispara a mesma página simultaneamente.
- O novo índice de organização é consultado no Members por biblioteca inteira, passando pelo gateway e BFF e pela mesma verificação de conta/espaço; não depende apenas dos modelos da página visível.

## Verificação

- Molda: 14 testes de ZIP/backup aprovados, 41 verificações.
- Oficina: 22 testes de host/ações aprovados, 102 verificações, incluindo aborto durante upload sem registro posterior.
- Motor: 9 testes aprovados, 31 verificações.
- Members: 28 testes de serviço/HTTP aprovados, 89 verificações; 7 testes em Postgres, 42 verificações. Consulta do índice de biblioteca alheia responde 404.
- BFF: 17 testes aprovados, 69 verificações. Gateway: 5 testes aprovados, 151 verificações, incluindo a rota nova.
- Tipagem de Members, motor e oficina aprovada. A tipagem do Molda também passou durante a preparação do leitor compartilhado.
- Chrome real: GLTF com `.bin`, ZIP com OBJ/MTL/PNG e FBX convertidos; imagem incorporada ao GLB; unidades do FBX verificadas; materiais ausentes e links externos recusados; cancelamento confirmado. Importação, edição de pasta/etiquetas, filtro e busca exercitados pela interface. A resposta do worker recebeu a CSP `connect-src 'self' https:`; nenhum erro de página. [Resultado](evidencias/importacao/resultado.json), [captura](evidencias/importacao/biblioteca-importada.png).
- Script reproduzível: `node packages/molda-cenarios/playground/oficina/verificar-importacao.mjs`, com o playground da oficina na porta 4541. O ensaio usa modelos sintéticos livres; nenhum GLB licenciado foi adicionado ao Git.

## Revisão própria e pendências

A falha inicial do teste do gateway foi a lista de cobertura ainda não conter a nova rota de organização; a lista foi corrigida mantendo o teste de igualdade de cobertura. O ensaio de navegador também corrigiu o seletor de busca para o nome acessível real, “Buscar modelo”. Nenhum contrato foi afrouxado para passar.

Ainda faltam no lote 2: biblioteca viva **Meus moldes**, chãos/texturas, conjuntos reutilizáveis (desenvolvidos com as ferramentas do lote 3), capa/descrição editáveis das bibliotecas, envio do acervo da equipe por coleção e conversão da Faísca. Também continuam necessários ensaios com arquivos representativos mais complexos (animação, FBX binário com imagens e famílias de texturas) e a prova de armazenamento real no staging. Não considerar esse ensaio sintético uma homologação de todos os pacotes.

Lotes 3–10 permanecem no plano de execução. Não houve abertura a membros nem publicação em produção nesta passada.
