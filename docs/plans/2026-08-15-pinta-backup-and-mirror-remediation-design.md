# Correções do backup e guia do Espelho no Pinta

**Data:** 15/08/2026  
**Status:** aprovado

## Contexto

O Pinta passou a exportar e restaurar tanto a galeria inteira quanto um desenho isolado. O full
review encontrou quatro riscos nesse fluxo: o leitor de ZIP retém entradas ignoradas, a restauração
de mapa e peças pode terminar pela metade, escritor e leitor repetem o nome da entrada canônica, e
o descompactador entrou no carregamento inicial. A interface também precisa comunicar o restauro em
andamento e separar as áreas de toque dos seletores vetoriais.

O editor de pixel possui dois alternadores de simetria. A criança enxerga o resultado refletido, mas
não enxerga o eixo usado pelo pincel.

## Decisões

### ZIP restaurável

O leitor consulta o diretório central do ZIP por acesso aleatório ao `File`. Ele lê somente o fim do
arquivo, o diretório, o cabeçalho local e os bytes comprimidos de `galeria.pinta.json`. Entradas de
imagem, SVG e texto não são descompactadas nem acumuladas.

O formato aceita ZIP comum de disco único e rejeita criptografia, ZIP64, cabeçalhos inconsistentes,
entradas duplicadas e diretórios fora dos limites. O limite de 32 MB vale para o JSON descompactado.
O `fflate` carrega sob demanda e processa somente a entrada escolhida.

Escritor, leitor e testes importam o nome da entrada de um módulo neutro. Um teste percorre o fluxo
real `zipGallery → readPintaBackupFile`.

### Mapa portátil

Um arquivo portátil de mapa contém o mapa e seu tileset. A restauração reconhece esse par como uma
unidade atômica: preflight de quota e nomes, novos IDs, religação do `tilesetId` e uma única escrita
transacional. Se qualquer etapa falhar, nenhum dos dois entra.

O importador genérico também descarta um mapa cuja referência não aponta para um tileset presente
na galeria nem para um tileset válido do mesmo lote. Assim, arquivos antigos ou corrompidos não
criam mapas órfãos.

### Seletores de preenchimento e contorno

Cada canal mantém uma área interativa própria de 44 × 44 px, sem sobreposição. As placas internas
continuam sobrepostas e ignoram eventos de ponteiro. O canal ativo controla apenas a ordem visual.
Os dois botões recebem foco visível completo.

### Estado do restauro

Enquanto o arquivo é lido e persistido, o botão fica desabilitado, recebe `aria-busy` e mostra
“Trazendo de volta…”. O texto volta ao normal ao concluir ou falhar.

### Guia do Espelho

O canvas desenha a guia depois da grade e antes da seleção. A guia usa duas passadas tracejadas para
manter contraste sobre qualquer cor e conserva espessura legível em todos os níveis de zoom.

- “Espelho lado a lado” mostra o eixo vertical em `largura ÷ 2`.
- “Espelho de cima e de baixo” mostra o eixo horizontal em `altura ÷ 2`.
- Com os dois alternadores ativos, aparecem os dois eixos.

A guia existe apenas na renderização do editor. Ela não altera bitmap, histórico, salvamento nem
exportação.

## Testes

Os testes devem provar:

1. um ZIP com uma entrada ignorada grande lê somente as faixas necessárias;
2. ZIP inválido, duplicado, criptografado, ZIP64 e acima do limite são recusados;
3. o ZIP produzido por `zipGallery` volta pelo leitor real;
4. mapa e peças entram juntos ou não entram;
5. mapa sem tileset disponível é descartado;
6. os botões vetoriais possuem áreas de toque independentes e foco visível;
7. o estado de restauro expõe texto e semântica de ocupado;
8. cada alternador do Espelho mostra somente seu eixo, e ambos mostram os dois;
9. desligar os alternadores remove a guia sem modificar o desenho.

## Fora do escopo

Esta entrega não muda o formato `pinta-gallery` v1, o limite total da galeria, a aparência da grade,
o algoritmo de simetria, os arquivos de exportação do Estúdio nem a ordem dos demais controles.
