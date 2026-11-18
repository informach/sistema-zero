# Lote 4 — Terreno: implementação e revisão

18/11/2026. Branch `staging`. Continuação dos checkpoints `214671daa` (contratos e persistência) e `cc5b4f9ac` (malha e material). Este relatório fecha o lote 4 no escopo local, após implementação, testes e revisão. Implantação e validação remotas ficam no encerramento global, conforme a orientação da coordenação.

## O que pode ser usado na oficina

A aba **Terreno** está ligada ao mesmo palco, controlador, biblioteca e histórico dos objetos. O rail reúne elevar, abaixar, aplainar, suavizar, pintar e abrir buracos; o painel também oferece nivelar, platô, rampa entre duas alturas originais, ruído, erosão, morro, cratera e fechar buracos. Os controles mostram unidades e apenas parâmetros que a ferramenta utiliza. Alt ajuda a orbitar; Escape, perda de foco, cancelamento do ponteiro e segundo toque cancelam a prévia.

Um arraste modifica campos transitórios, com amostras espaçadas em metros. A malha atualiza as peças atingidas e suas vizinhas para normais. Soltar produz uma alteração autoral; não há gravação de documento ou rede por quadro. A consulta de edição encontra o campo sob uma abertura para permitir fechá-la, enquanto seleção normal, câmera e cápsula continuam sem piso nesse lugar.

O painel inclui:

- Modelos plano, ilha, colinas e vale, com altura/semente e confirmação antes de substituir o relevo.
- Até oito camadas nomeadas, cor, texturas do acervo existente e repetição em metros. Adicionar e retirar camadas conserva a soma dos pesos em 255. A pintura automática oferece regras ordenadas por altura e inclinação, com transições configuráveis.
- Tamanho, resolução, origem, mínimo, máximo e fundo. A confirmação informa corte de cobertura e limitação de alturas; a reamostragem preserva coordenadas de mundo, pintura e cobertura conservadora dos buracos.
- PNG de alturas 8/16 bits na entrada, com preto/branco mapeáveis. A saída é PNG cinza de 16 bits. Usa o codec do núcleo, sem conversão de precisão por Canvas. Exportar conserva o documento.
- Buracos pintados e recortes importados independentes. Retirar os recortes exige uma ação e confirmação próprias; fechar com o pincel não apaga esses dados.

Receitas, reamostragem, alteração de camadas, pintura automática e PNG são processados em worker. Cancelar encerra o worker, inclusive seu processamento, e não apenas ignora a resposta. Os campos enviados são cópias transferíveis; a fonte publicada permanece intacta. Grades máximas continuam exigentes em memória: somente as alturas de trabalho de 4097² amostras Float64 ocupam aproximadamente 128 MiB. Isso não constitui comprovação de desempenho nessas dimensões em aparelhos físicos.

## Autoria, recursos e apoios

Os recursos são codificados por peça/hash. O palco confere e prepara os bytes antes da cabeça otimista. A fila existente envia e confirma o conteúdo antes do comando, conserva os bytes para nova tentativa e repete a mesma identidade da operação após resposta perdida. Erro de envio mantém a edição na oficina para nova tentativa; erro ou cancelamento antes da fila retira a prévia. Uma cabeça diferente impede aplicar preparação atrasada. Testar e retratos ficam indisponíveis durante gesto/preparação/envio.

O terreno nativo declara cobertura integral da grade, permitindo colocar objetos em um plano sem peças de altura. Terrenos importados conservam o domínio por peças. O amostrador de objetos também consulta a presença de piso carregada, evitando buracos dentro da área do pincel.

Objetos apoiados usam a mesma fonte de altura do relevo atualizado. As raízes dos conjuntos passaram a admitir o vínculo explícito com o terreno, além da posição livre. Novas colocações no chão recebem esse vínculo; cópias antigas sem vínculo continuam livres e podem ser alteradas pelo controle **Acompanhar terreno**. A expansão, a alça e a pilha sobre a raiz usam a altura carregada, preservando relações internas. Copiar ou guardar a composição captura a posição visível. Separar uma raiz apoiada exige a posição atual resolvida e continua sendo uma ação com desfazer. Nenhum vínculo de objeto ou água é inventado para a raiz.

Não houve novo inventário, outro editor de personagens, alteração dos controles do avatar ou reconstrução da geografia da Faísca.

## Problemas encontrados e corrigidos na revisão

1. Soltar no mesmo pixel consultava a própria altura elevada e repetia o carimbo. O teste capturou 6 m em vez de 1,5 m. O gesto agora reconhece a posição de tela e consulta a superfície publicada durante o arraste, sem realimentar a prévia.
2. A finalização podia limpar a cache antes de a cabeça otimista chegar ao palco. O ensaio com leitura do servidor deliberadamente indisponível comprovou a corrida. A cache preparada permanece até a leitura da nova base; cancelamento limpa os recursos sem dono.
3. Pintar uma região de fundo podia importar a altura da peça vizinha. Peças visuais de pintura/máscara e peças com relevo próprio têm registros separados; há teste específico.
4. A validação de medidas considerava referências antigas antes de reamostrar, impedindo cortar uma grade. A nova forma é validada com referências limpas, que são reconstruídas pelo conteúdo.
5. Reamostrar terreno importado sem camadas tentava gravar pintura inexistente. Esse caminho conserva a ausência de solo; pintar pede primeiro a definição das camadas.
6. Raízes dos conjuntos só tinham coordenadas absolutas. O vínculo explícito agora é respeitado na prévia, expansão, alça, ocupação do pincel, captura, duplicação e separação. O teste vermelho/verde verifica também o conjunto livre e a pilha sobre a raiz. A prévia de mover usa a posição transitória, sem ser presa pelo apoio anterior.
7. Cancelamento ou preparação atrasada podia sobreviver à troca de contexto. Abort, identidade do documento e finalização idempotente protegem os caminhos de reentrada e desmontagem.

## Evidências e verificações

[Oficina clara](evidencias/lote4-terreno/oficina-claro.png), [escura](evidencias/lote4-terreno/oficina-escuro.png), [1024 px](evidencias/lote4-terreno/oficina-1024.png), [painel em 390 px](evidencias/lote4-terreno/oficina-390.png), [palco em 390 px](evidencias/lote4-terreno/palco-390.png), [prévia](evidencias/lote4-terreno/escultura-previa.png), [escultura guardada](evidencias/lote4-terreno/escultura-guardada.png) e [vídeo dos fluxos da oficina](evidencias/lote4-terreno/terreno-oficina.mp4).

| Verificação local | Resultado |
|---|---|
| Núcleo completo | 172 testes / 8.275 asserções |
| Motor completo | 83 testes / 2.675 asserções |
| Oficina e hosts completos | 75 testes / 494 asserções |
| Members: serviço, histórico e HTTP | 50 testes / 236 asserções |
| BFF: rotas, endereços e conteúdo | 37 testes / 197 asserções |
| Postgres real descartável, migrations até 0162 | 36 testes / 327 asserções |
| Tipagem núcleo, motor, oficina, Members e member-shell | Aprovada |
| Build e Biome dos arquivos alterados | Aprovados |

Chrome claro/escuro, 1440/1366/1024/390 px: receitas, ferramentas básicas e avançadas, textura real importada no acervo de ensaio, pintura manual/automática, abrir/fechar buracos, PNG, medidas, histórico e reabertura. O ensaio recusa PNG corrompido sem alterar o documento, retoma falha de upload e interrompe a geração de uma grade de 2048² por cancelamento do worker. [Resultados da oficina](evidencias/lote4-terreno/oficina.json).

O gesto salva 1,5 m como 1,499351 m após quantização, em uma revisão; undo retorna a zero e redo à mesma altura. Quatro formas de cancelamento mantêm revisão/autoria e contagens estáveis de 4 geometrias/4 texturas. A preparação sobre cabeça substituída é recusada. [Resultados da escultura](evidencias/lote4-terreno/escultura.json).

Materiais com 1, 4 e 8 camadas compilaram na GPU. Três ciclos por variante mantiveram 3 geometrias/5 texturas no solo e 4/3 no plano. A imagem é compartilhada entre camadas. [Renderer](evidencias/lote4-terreno/renderer.json), [comparação diurna/noturna](checkpoint-lote4-malha-material.md).

Regressões de conjuntos reais em quatro larguras passaram: alternar o vínculo, selecionar, mover, girar, tamanho uniforme, duplicar, separar/desfazer e reabrir. Gestos de conjuntos e espalhamento de objetos também passaram. O Postgres preservou o vínculo durante publicação de uma revisão do conjunto em múltiplas cabeças.

A Faísca convertida foi percorrida com o Cute Characters nativo de aproximadamente 1,17 m: Morada–praça ≈12,70 m, praça–horta ≈19,74 m, percurso da ponte com aproximações ≈46,57 m e patamar do Farol em Y≈9,56 m. Sem erros e com o documento preservado. [Percursos](evidencias/lote4-terreno/faisca-percursos.json). O lote não reorganiza a composição artística da Faísca.

O build mantém o aviso de chunk: motor ≈837 kB / 224 kB gzip; worker de terreno ≈103 kB. O aviso não foi suprimido. As provas são locais e de toque emulado; não representam homologação em celulares/Chromebooks físicos, aprovação artística ou validação de implantação.

## Continuidade

O próximo lote exclusivo é **5 — Água**, sobre esta base de terreno. Caminhos, jogo/luz/céu, exportações, agentes, limpeza, composição final da Faísca e full review continuam na sequência do plano. Implantação e validação da staging fecham o trabalho global; o acesso geral aos membros permanece condicionado à decisão da coordenação.
