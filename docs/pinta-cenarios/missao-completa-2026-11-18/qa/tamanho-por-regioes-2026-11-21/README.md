# Tamanho do mundo e confirmação da edição — 21/11/2026

Base: `85f8dc4a718886da3f888464108ca91e79bc9549`. Formato 8 continua interno;
não há promoção do store, IO 3 ou escritor de nuvem neste lote.

## Documento e ferramentas existentes

`growTilemap` amplia os limites regionais sem mudar posições globais, camadas,
buffers, portas ou caminhos. Crescer à esquerda/cima muda a origem lógica. O
ramo denso conserva a regra anterior de deslocar o conteúdo dentro da grade.

`resizeAsset` compartilha `resizeRegionMap` para o documento regional: a âncora
define a nova origem, a expansão compartilha todos os buffers e o recorte só
retira células fora dos limites. Objetos e suas relações continuam guardados nas
coordenadas globais, inclusive fora da área visível. Ampliar novamente pode
revelar esses objetos; recuperar peças recortadas exige desfazer. Não converter
objetos em novas coordenadas locais nem apagar portas por ficarem fora da tela.
Tamanho inválido ou limites globais excedidos recusam a operação.

Recorte é manutenção do documento, limitada aos 2.048 chunks/4 MiB já admitidos;
não varre o mundo vazio nem aumenta o teto do pincel. A admissão agregada precede
os payloads. Chunks internos e bordas já vazias continuam compartilhados; bordas
alteradas são copiadas uma vez e chunks esvaziados saem. No documento cheio de
32 camadas, reduzir 256² para 255² compartilha 1.568 chunks e copia 480. A prova
confere células das bordas, original imutável e reabertura pelo codec nativo.
O histórico comum restaura as peças recortadas, sem criar outro histórico.

A curadoria detecta transformações também nos chunks; a ferramenta já usada
pelo mapa não fica escondida por depender de `.some()` num array denso.

## Correção pública do diálogo

O diálogo de tamanho fechava e o topo anunciava sucesso mesmo quando a edição
era recusada pelo store. Agora o callback retorna aceitação; recusa mantém o
diálogo e usa o Toast existente. O topo compara a revisão usada no cálculo com
a atual antes de gravar, além da admissão já existente no store. As classes,
componentes visuais e estilos permanecem iguais.

Dois defeitos foram reproduzidos com os componentes anteriores, mantendo seis
controles positivos. Um deles usa o `EditorScreen` real e uma atualização do host
dentro de um lote React, antes do próximo render; o comando antigo sobrescrevia
a arte adotada. A versão corrigida conserva nome, pixels e histórico. Esse é um
ensaio de React em Bun, não uma reprodução anunciada em aparelho físico.

## Navegador e revisão dos próprios ensaios

No Chromium, a atualização do host na captura do clique foi processada pelo
React antes do handler, nas duas versões. Ela é um controle positivo: o tamanho
muda usando os pixels novos, que sobrevivem a undo/redo e à reabertura do banco.
Não contar esse percurso como reprodução do defeito de renderização agrupada.
A recusa pelo limite real de aula reproduz o fechamento indevido no componente
anterior, e fica aberta com mensagem na versão atual.

A primeira execução teve seis falhas de expectativa: três tratavam a atualização
correta como recusa obrigatória; outras três comparavam o caminho histórico sem
`tileSize` com o efeito que só existe quando esse argumento é passado. Os recibos
iniciais foram mantidos. O controle de adoção passou a exigir a arte nova intacta,
e a comparação de mapas usa o argumento real da interface. Não se aumentou timeout
nem se relaxou a conservação de pixels ou documentos.

Matriz final: nove ensaios do editor atual, seis controles históricos positivos,
três falhas históricas esperadas e três provas do núcleo regional, nos perfis
desktop, toque emulado e CPU 4×, sem retries. Os 64 resultados densos são comparados
integralmente em cada perfil (192 comparações JSON). As páginas de QA usam o
`EditorScreen` e IndexedDB reais, com moldura de laboratório; não são prova visual
da oficina. O percurso separado usa a oficina completa com seu CSS, exporta o
backup e confere centralização dos pixels depois de reabrir.

Suíte completa: 2.638 aprovados, três controles Pygame omitidos pela configuração
local, zero falhas; 30.217 asserções em 237 arquivos, 172,96 s. Logs, fontes e hashes
ficam em `index.json`. Não há novas provas em motores externos, aparelhos físicos
adicionais, heap ou SLA global. Persistência, contratos de execução/exportação e
ativação pública de regiões permanecem no plano.
