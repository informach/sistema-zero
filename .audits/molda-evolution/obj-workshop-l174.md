# OBJ na oficina interna, lote 174

## Fluxo e arquitetura

Diálogo da oficina agora escolhe GLB/glTF ou OBJ/MTL, por radio group nativo e
painéis lazy separados. Troca de formato desmonta/revoga a sessão anterior;
arquivos, preparação e aceite não atravessam a troca. glTF mantém inspeção e
escolha explícita de cena. OBJ separa escolha de arquivos de Preparar prévia;
não inicia conversão ao selecionar uma pasta. Resultado faltante permite adicionar
companions, preservando caminhos e buffers da própria sessão, sem busca por basename.

Leitura local compartilhada em `localImportBundle`, com adapters de paths/erros
e entradas por formato. Preflight de toda seleção precede IO, incluindo duplicatas,
32 MiB por arquivo/64 MiB no conjunto e até 1.025 arquivos com principal. Aborto
após await descarta leitura nativa tardia. Tamanho declarado deve corresponder ao
ArrayBuffer recebido; SAB é recusado. Buffers previous só são aceitos por contrato
como dados já pertencentes à sessão, não como entrada externa arbitrária.

`useSceneImportSession` centraliza ownership por instância de editor, criação,
revisão e geração; revoga antes do abort e confere reentrância. Assinatura de
conteúdo, blur/hidden, cancelamento, troca de editor e unmount invalidam trabalho.
Thumb/save sem revisão de conteúdo não invalidam a prévia. Adapters initial/cancelled
são estáveis para não reiniciar efeitos a cada render. Callbacks antigos não podem
atuar sobre outra instância mesmo com o mesmo id.

`useSceneImportConfirmation` compartilha aceite atual e guarda de pose mais recente,
confere ownership após callback do host e destaca a sessão antes do commit. Um
commit, um undo; nada é salvo/adotado durante leitura ou prévia. glTF usa os mesmos
helpers, com os testes originais preservados. Falhas de guarda booleanas e mudança
reentrante do host não adotam conteúdo antigo.

Textos neutros, props/estilos de importação, preview isolado, arquivos originais e
relatório são compartilhados. O renderer real de prévia usa domínio/player/viewport
existentes, sem store de edição; testes substituem só a porta GPU. Um helper de
fixture foi extraído dos testes glTF sem mudar seus cenários.

## Aparência e revisão

OBJ sugere Kd linear, cor sRGB, canais de dados lineares, alpha de cor multiplicado,
normal Y positivo e faces dos dois lados. São escolhas explícitas mostradas no
painel, não inferências por nome/extensão. Conflitos/omissões/aproximações mantêm
reject até escolha; objetos vazios são preservados por padrão. Todo normalizador
é usado novamente ao alterar opções. Básicos visíveis; leitura de cores e
compatibilidade progressiva em disclosures, com alvos mínimos de 44 px.

Todos os controles de políticas passam pelo hook real: bibliotecas, duplicatas,
missing material, propriedades/opções/roles repetidos, d/Tr, mapas omitidos,
bump/normal, map_Ns, map_Tr, brilho Blender, iluminação PBR, máscara nearest e
objetos vazios. Mudança revoga review/consentimento; nova prévia exige novo aceite.
Não há tentativa automática que silenciosamente omita mapas ou normalize valores.

Dicionário exaustivo de avisos OBJ em português simples, agrupados por código;
detalhes técnicos exibem até 50 ocorrências, sem executar markup. Download exige
clique e conserva o relatório completo. Originais são baixados por arquivo a partir
dos bytes escolhidos, sem sobrescrever o dispositivo. Crédito/licença/metadados
não ficam arquivados no documento; aviso permanece antes do aceite.

## Achado numérico da revisão e correção

Diagnóstico real reproduziu OBJ com dois pontos sem faces em ±1e308: conversão
aceitava os dois vértices, mas ViewportCamera.frame produzia posição/far/projeção
não finitos. O gate anterior conferia apenas buffers dos triângulos desenhados.
Pontos mantidos também são editáveis pelos overlays Float32; não bastava que
continuassem válidos como Float64 autoral.

OBJ agora confere Math.fround finito ao montar CADA ponto retido, incluindo pool
sem uso, linhas e faces não desenhadas, antes de rasters. Recusa unsupported com
path do ponto, sem clamp, rescale, descarte ou mutação dos bytes. A expectativa
antiga native.geometry para triângulo fora de Float32 foi atualizada para o path
mais específico, pois o novo gate dispara antes. O domínio nativo Float64 e seu
reader não foram estreitados; pontos muito pequenos continuam preservados, com
diagnóstico de colapso de precisão quando necessário.

Câmera agora prepara as duas projeções e o enquadramento em candidatos antes de
atualizar instâncias vivas. Valores de desenho, limites, aspecto, near/far/zoom,
matrizes e projeção inversa são conferidos; frame/setView/resize inválidos não
corrompem câmera anterior. Preserva identidade de câmeras/target para OrbitControls,
orientação livre e zoom no resize. Não reescala o documento e não promete que
qualquer caixa representável em Float32 caiba numa câmera representável: projeções
maiores continuam recusadas, preservando o estado anterior.

Três regressões falharam antes da correção: gate antes de bytes e atomicidade de
frame/resize. Após correção, um teste antigo falhou só pelo path antecipado acima.
Focal final: 37 passes, zero falhas, 962 asserts, seis arquivos, 5,39 s. Inclui
worker real recusando pontos/linhas/faces numéricas extremas com originais intactos.

## Evidências finais

Antes do achado numérico: 23 passes/236 asserts para leitura/hooks glTF+OBJ e
painel glTF; oito passes/112 asserts para painéis reais; 92 passes/2.379 asserts
para diálogo glTF+Workshop; focal ampliado 137 passes, 3.357 asserts, dez arquivos,
37,98 s. Após a correção numérica, tipos e Biome (933 arquivos) passaram novamente.
Suíte integral: **2.124 passes, zero falhas, 293 arquivos, 8.237.097 asserts,
147,20 s**. Vite passou em 1,34 s, incluindo worker OBJ de 157,01 kB e worker
glTF de 181,86 kB. Painéis separados: OBJ 42,91 kB, glTF 26,25 kB; sessão comum
12,74 kB. Houve reorganização de chunks (inclusive Button/index), portanto esses
tamanhos individuais não demonstram redução de payload nem ganho de desempenho.
Chunk Three segue em 579,29 kB com aviso >500 kB.

Build Kids terminou com exit 0: compilação 9,0 s, tipos 13,7 s e 59 páginas em
724 ms. Diff check passou, apenas avisos prévios de CRLF em CLAUDEs de outros
pacotes. Revisão confirmou que os candidatos de câmera são criados ao enquadrar,
mudar vista ou realmente redimensionar, não a cada render. Não há benchmark
pareado que autorize alegar melhoria de CPU/RAM neste lote.

Sem dependência nova, ativação pública, upload ou homologação GPU/toque/crianças.
Browser continua indisponível conforme registro anterior; não foi reiniciado ou
substituído por outra automação. Formato público 1 mantido. Nenhuma das nove fases
está sendo marcada concluída a partir destes testes.
