# Precisão da composição com opacidade de camada

A única mudança funcional deste lote é uma condição no caminho direto do
renderizador: ele exige `globalAlpha === 1`. A opacidade composta de grupos,
camadas e contexto entra nessa condição. Quando há opacidade parcial, o desenho
conserva os pixels intermediários canônicos dos chunks, sob o mesmo orçamento.
Uma arte pode ter pixels transparentes e continuar no caminho direto; a condição
é a opacidade de composição da camada, não a transparência da imagem.

## Causa e prova

O ensaio do lote anterior reproduziu o defeito no renderer denso de `8d40b4b1b`:
na escala 1, 36.061 canais RGBA diferiam do caminho canônico, com delta máximo 2.
As variantes indicaram a opacidade de camada: tornar a fonte opaca não resolveu;
tornar as camadas opacas resolveu nos quatro zooms. Copiar ou fazer readback da
folha não resolveu. A guarda retira essa composição não qualificada da otimização,
preservando o caminho completo de desenho, as artes, a ordem e os dados do mapa.

Depois da correção, os quatro hashes canônicos da reprodução anterior continuam
idênticos, e o desenho coincide com eles: zero canais diferentes em 0,25×, 0,5×,
1× e 2×. As seis variantes, 24 casos independentes, também coincidem integralmente.
O resultado se refere ao Chromium ensaiado nesta máquina; não afirma igualdade
numérica universal entre todos os motores gráficos.

O comparador agora exige o cache canônico de 32 MiB como referência também para
as regiões sob pressão. Há oito casos com opacidade parcial e oito com opacidade
total, além dos 24 casos normais, por perfil. As provas da otimização sem canvas
intermediário ficaram nos casos qualificados de opacidade total. A comparação
rigorosa de todos os pixels continua obrigatória; não se substituiu igualdade
por uma tolerância de cor.

## Memória e custo

O teto não mudou. A política existente admite um canvas de trabalho quando um
chunk sozinho excede o orçamento solicitado. `usedBytes` inclui esse canvas;
a descrição contrária do relatório anterior foi corrigida. No laboratório de
peças de 16 px com orçamento artificial de um byte, o fallback mede exatamente
1 MiB, uma única alocação, e `clear` a libera. Os casos diretos qualificados
continuam com zero canvases de chunks e zero bytes desse cache.

Com opacidade parcial pode haver reconstrução de chunks onde antes se usava o
caminho direto. Este lote corrige precisão; não mediu nem qualificou o alvo de
latência. O próximo perfil deverá considerar esse custo. Não se aumentaram o
cache, os limites autorais ou os recursos disponíveis para ocultar o defeito.

## Verificação e revisão

- 96 testes direcionados passaram, com 451 asserções. Os 12 casos de admissão
  de composição reproduziram a falta da guarda antes da correção.
- Suíte completa: 2.431 passaram, três controles nativos ignorados por padrão,
  zero falhas e 28.960 asserções.
- Os três controles de Pygame real/SDL dummy passaram à parte, com 4.372 asserções.
  Eles são regressão dos formatos atuais, não homologação de regiões exportadas.
- Seis ensaios de canvas real passaram sem retries: 120 comparações canônicas
  por regiões, mais 72 com o renderer publicado. Desktop, toque emulado e CPU 4×.
- Doze ensaios da oficina passaram: terrenos com múltiplas folhas, espalhamento,
  cenários prontos, prévia/cancelamento, histórico e salvar/reabrir.
- Tipos completos do Pinta/Estúdio e Biome dos sete arquivos passaram.

O índice preserva testes vermelhos, a primeira rodada após a guarda e as rodadas
finais. A primeira rodada pós-correção já conservava os pixels, mas esperava
incorretamente zero bytes no fallback. Os testes foram alinhados ao getter real,
que inclui o scratch; o orçamento e o código de memória não foram alterados.
Os recibos antes da correção permanecem no lote de renderização por regiões.

O review confirmou uma única guarda funcional, sem mudança de estilo, componente,
contrato público, formato nativo ou dados persistidos. A integração dos demais
consumidores de regiões e o alvo de fluidez continuam no plano; este lote fecha
somente o achado de precisão. Sem merge, deploy, teste com crianças ou aparelhos
físicos adicionais.
