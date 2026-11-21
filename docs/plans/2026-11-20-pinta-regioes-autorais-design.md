# Regiões autorais: mapas expansíveis com orçamento fixo

## Problema e decisão

Os lotes 8a1/8a2 tornaram o IO físico incremental e evitaram canvases
descartados. O documento autoral ainda reserva todas as células do retângulo.
Ampliar apenas `maxCols`/`maxRows` repetiria esse custo e não implementaria
regiões autorais. Este lote completa essa fronteira, antes do automapping.

Alternativas: ampliar o retângulo denso (descartado); criar outro editor
(descartado); evoluir o mapa existente com armazenamento autoral esparso
(escolhido). Preservar exatamente a representação e os bytes dos mapas antigos.
Nenhuma mudança de identidade visual ou fontes funcionais 3D.

## Contrato e orçamento propostos

- Formato nativo **8** somente para quem usa regiões. Formatos 0–7 preservados.
- Grade esparsa simples, serializável, sem Proxy/classe: `RegionCellGrid`
  com `kind: 'regions'`, `version: 1`, lado 32 e chunks `{ col, row, cells }`.
  Coordenadas dos chunks são índices globais; células continuam `Int16Array`,
  com os mesmos valores e flags atuais. Não duplicar sua decodificação.
- No máximo **2.048 chunks / 2.097.152 células / 4 MiB de índices**, somados
  entre todas as camadas. Chunk vazio é omitido. Os tetos de camadas, peças,
  recursos, histórico e backup permanecem orçados, sem remoção de validações.
- Extensão lógica proposta de até 10.000 células por eixo, dentro do intervalo
  global −10.000 a 10.000. Origem explícita; crescer para a esquerda não move
  os dados nem os objetos existentes. Esses números são critérios a medir,
  não desempenho já comprovado. Verificar inclusive o DOM no zoom máximo.
- Validação dos descritores/orçamento antes de alocar buffers; duplicatas,
  valores inválidos, conteúdo fora dos limites e formatos futuros são recusados.
- Chunks de transporte com codec versionado determinístico para inteiros
  de 16 bits little endian e base64 canônico. A representação histórica de
  `cells`/RLE e seus fingerprints permanece inalterada para mapas anteriores.

## Fronteiras e segurança

Separar DTO/codec compartilhados em `core/creations/pinta-regions.ts`, acesso
e edição imutável no Pinta, IO físico, render/consulta e adaptadores. O mesmo
editor e os mesmos stores continuam responsáveis pelo documento.

Leitura/mutação passam por acessores de células/região; nunca criar um vetor
do tamanho do mundo vazio. Escrita em lote copia cada chunk alterado uma vez;
histórico compartilha os demais. Operações extensas têm orçamento de trabalho
e recusa atômica, com orientação para selecionar uma área menor.

Envelope físico local **3** para separar cabeçalho e chunks autorais na mesma
transação, com CAS, espelho compatível, recuperação e coleta isolada. Leitores
anteriores recusam o protocolo antes de cair no espelho. IDs legados arbitrários
nunca são encurtados: fallback inline protegido quando não puderem virar chave.
Captura/exportação obtêm o documento completo a partir da mesma autoridade.

Nativo 8 exige barreira de nuvem **7**; primeiro leitores, depois gravadores.
Não ativar escritor novo neste lote antes de comprovar o leitor em staging.
Cena estruturada **4**, PNG de dados **5** e capacidade explícita para regiões
impedem que um runtime antigo receba dados que não consegue executar. Jogos e
receitas anteriores preservam seus contratos e comportamento.

### Coordenadas e metadados do leitor interno

A origem lógica usa células; posições e geometrias de objetos usam pixels
globais do mapa. Expandir à esquerda ou acima não desloca objetos, caminhos,
portas, IDs ou propriedades. O leitor nativo 8 precisa aceitar posições
assinadas, derivar seus limites da extensão orçada e do maior tamanho de peça
permitido, e preservar valores autorais sem os arredondar ou truncar. As
normalizações históricas dos formatos 0–7 não devem mudar silenciosamente.

O leitor novo deve reutilizar a validação de metadados existente com limites
explícitos por formato. Descritores e orçamento global são conferidos antes
dos buffers. Uma camada, referência ou propriedade que não possa ser conservada
deve recusar o documento inteiro: não descartar a parte e autorizar uma gravação
parcial. O codec interno em `core/regionDocument.ts` aplica essa regra sem
ativar a união pública, o arquivo de galeria, a persistência ou o escritor.
O formato 8 aqui continua ortogonal; isometria e hexágonos exigem seus próprios
contratos e consumidores antes de qualquer opção aparecer na oficina.

A validação reutiliza os sanitizadores de objetos, grupos, propriedades e
recursos. Somente a política interna 8 conserva posições assinadas, medidas
fracionárias, giros já dentro de `[0, 360)` e padrões explícitos válidos. Os
limites geométricos derivam de 10.000 células × 48 pixels; a comparação final
recusa qualquer normalização que alteraria o documento. Os caminhos 0–7
continuam aplicando sua política histórica.

Metadados têm orçamento próprio: 500.000 nós, profundidade 64, 8 MiB de buffers
de arte e 8 Mi de unidades UTF-16 de texto/chaves. Esses limites são cumulativos
e independentes dos 4 MiB de índices das regiões. A comparação não executa
getters nem aceita perda de campos desconhecidos; buffers de arte e seus arrays
JSON equivalem pelos valores. Propriedades opcionais `undefined` equivalem à
ausência no JSON. A validação de células e seu orçamento global continuam no
contrato compartilhado do Core, antes da decodificação dos chunks.
O encoder reutiliza `pintaAssetToWire` para as versões de arte, permitindo
`JSON.stringify` comum sem um replacer externo. O contêiner de backup e seus
tetos totais ainda precisam ser integrados ao novo documento antes da ativação.

## Fluxo e consumidores

Autoria, seleção, terrenos, preenchimento, copiar/colar, conjuntos, objetos,
geometria, teste com personagem e minimapa devem consumir a nova grade. O
palco e o minimapa mantêm canvas limitado ao viewport/resolução de visão geral,
sem varrer toda a área vazia. Não expor opção sem suporte integral.

Documentos autorais ocupados continuam limitados a 4 MiB de índices; carregá-los
em chunks não materializa as lacunas do mundo. Consumidores portáteis podem
carregar arquivos de regiões sob demanda, com pré-carregamento para física;
um chunk ausente não deve virar chão vazio silenciosamente.

O Estúdio recebe a cena completa e atualiza referências sem apagar programa.
JavaScript, módulo Pygame, runtime Python distribuído e exemplos externos
precisam de leitores reais, guardas e ensaios. Qualificar nova imagem/perfil e
distribuição quando os contratos compartilhados mudarem; não reutilizar a
qualificação do perfil f11 como prova de capacidades novas.

## Contratos externos consultados

O Tiled representa camadas infinitas por chunks com coordenadas próprias;
JSON/TMX precisam conservar GIDs, propriedades e referências. Validar importação
e ida/volta no Tiled real, incluindo coordenadas negativas. [Formato oficial](https://doc.mapeditor.org/en/stable/reference/json-map-format/).

O parser do Phaser **3.90.0** inicializa uma grade pela largura/altura da camada
antes de incorporar seus chunks. Portanto um mapa esparso muito extenso não
deve simplesmente passar por esse parser. Preparar adaptação de regiões e
medir o consumidor real. [Fonte oficial da versão](https://github.com/phaserjs/phaser/blob/v3.90.0/src/tilemaps/parsers/tiled/ParseTileLayers.js).

O `TileMapLayer` do Godot serializa coordenadas em inteiros assinados de
16 bits. O intervalo proposto cabe nessa restrição; validar o adaptador e
não prometer importação direta de JSON Tiled. [Documentação oficial](https://docs.godotengine.org/en/stable/classes/class_tilemaplayer.html).

## Aceite e ordem

1. Contrato/codec e orçamento, testes vermelhos/verdes antes de integração.
2. Documento, migração, acessores, operações e persistência sem perda; repetir
   leitores anteriores, quota, CAS e recuperação offline da issue 026.
3. Render, objetos, colisões, navegação e minimapa na oficina existente.
4. Cena e consumidores do Estúdio, PNG nativo e quatro destinos externos.
5. Ensaios nativos, heap/buffers/tempo/chunks, publicação gradual e rollback,
   documentação e integração. Não marcar a etapa concluída só com o núcleo.

Executar diretamente com as skills `writing-plans`/`executing-plans`, sem
delegação e sem aprovação intermediária, conforme instruções do usuário.
