# Renderização dos chunks autorais por regiões

`tiles/chunks.ts` agora consome o leitor comum de células densas ou por regiões.
Cache, desenho direto sob pressão, animações e consulta de chunks aceitam os
limites assinados do mundo. O leitor é criado uma vez por camada/pintura e
compartilhado com o cache; não se reconstrói o mundo lógico. A chave do cache
inclui a origem, evitando reutilizar uma visão com limites diferentes.

O recorte esparso intersecta o viewport com os chunks armazenados, em ordem
global de linha/coluna. Um mundo de 10.000 × 10.000 com dois chunks não produz
288.300 entradas de consulta como na reprodução anterior: visita os dois.
Offsets, visibilidade e opacidade herdados, tilesets por camada, transformações
e seleção de quadros continuam no mesmo caminho. O cache mantém o teto de
32 MiB; quando o orçamento é menor que um chunk, permanece a política anterior
de um único canvas de trabalho, cujo tamanho não entra em `usedBytes`.

`mapCellBounds` concentra os limites lógicos usados pelo renderizador. O arquivo
de chunks saiu da lista de acesso cru: ele passou a consultar o leitor comum,
mantendo as guardas de índice e transformação no desenho. A varredura continua
recusando novos acessos crus não revisados.

## Comparador e revisão

A referência densa mantém o mesmo alinhamento global dos chunks. Para uma
origem -65/-66, recebe preenchimento vazio antes das células, e a câmera
compensa uma translação múltipla de 32. Transladar arbitrariamente a grade
de rasterização também mudava suas bordas com offsets fracionários, produzindo
uma comparação entre disposições de chunks diferentes. A primeira rodada
registrou essa diferença; a referência corrigida conserva a grade global do
contrato, sem mudar o desenho do produto para satisfazer o teste.

Os 24 casos normais comparam cache denso/esparso com 32 MiB; os oito de pressão
comparam ambos com o mesmo orçamento de um byte. Essa é uma prova da troca de
armazenamento sob o mesmo modo de desenho. **Não é uma prova de igualdade entre
o caminho direto e o cache canônico em todas as composições.**

## Achado separado: precisão da opacidade

No Chromium desta máquina, a comparação entre cache canônico e caminho direto
encontrou 36.061 canais RGBA diferentes, com diferença máxima de dois níveis,
na escala 1 com opacidade de camada. A reprodução com o código anterior
`8d40b4b1bf9d64b7d74ff6ac5a78642358e03ded`, usando só mapas densos, confirmou o
mesmo resultado. Portanto, não foi introduzido pelas regiões.

Variantes separaram a opacidade da arte e a da camada: tornar a fonte opaca
não eliminou a diferença; tornar as camadas opacas eliminou-a nos quatro zooms.
Copiar ou fazer readback da folha não a eliminou. Esses ensaios indicam uma
diferença de quantização da composição com alpha entre os caminhos deste backend.
Não se generaliza o resultado para outros navegadores/dispositivos.

Esse achado será corrigido no lote imediatamente seguinte, com uma guarda de
composição e provas próprias, preservando o caminho rápido nas condições
qualificadas. A existência desse ponto impede considerar a renderização integral
ou a missão encerradas. Recibos antigos, imagens, variantes e a configuração com
o renderizador histórico estão preservados no índice.

## Verificação deste lote

- 84 testes direcionados passaram, com 395 asserções, incluindo origens alinhadas
  e parciais, flags, animações, pressão, limites, visibilidade e snapshots.
- Suíte completa: 2.419 passaram, três controles nativos ignorados por padrão,
  zero falhas e 28.902 asserções.
- Três controles com Pygame real/SDL dummy passaram à parte, com 4.372 asserções.
  São regressão dos exportadores atuais; não homologam exportação de regiões.
- Seis ensaios de canvas real passaram: 96 imagens comparadas entre formatos,
  mais 72 comparadas com o renderizador publicado. Desktop, toque emulado e CPU
  4×, sem retries. O relatório registra a versão real do Chromium.
- Doze ensaios da oficina passaram nos mesmos perfis: terrenos, múltiplas folhas,
  espalhamento de peças/objetos, modelos prontos, cancelamento, histórico e reabertura.
- Tipos completos do Pinta/Estúdio e Biome dos nove arquivos passaram.

A reprodução inicial com diff de todos os pixels foi interrompida por excesso
de saída e repetida integralmente com a primeira divergência; ambas estão no
índice. Outras rodadas registram uma expectativa de caminho direto cujo fixture
não tinha destinos inteiros em todos os zooms e a investigação da opacidade.

## Integração ainda necessária

Nenhum estilo ou componente da oficina foi alterado. O documento 8 continua
interno, e a página de comparação é somente QA. Miniaturas, minimapa, câmera,
demais ferramentas, IO 3 e os contratos externos ainda precisam ser adaptados.
Não houve medição/qualificação dos alvos de latência neste lote, ativação de
formato público, merge, deploy ou teste com crianças/outros aparelhos físicos.
