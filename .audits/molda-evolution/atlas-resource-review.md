# Lote 18: vida útil e uploads do atlas

## Baseline e perfil

Recurso extraído do fluxo anterior de `MoldaViewport.applyModel`, inicialmente sem
alterar o algoritmo. Fixture válida: 128 esferas, 15360 triângulos, pele 32²,
atlas512; tamanho derivado pela mesma régua do editor e roundtrip nativo exato.
Mesma máquina/runtime do lote 17. Baseline de 8 warmups/40 amostras:
p50/p95/p99 2,950/5,838/6,525ms. Perfil de 2000 amostras: 2,226/3,756/5,210ms.
Alocação em `rasterAtlas` aparece nos cinco maiores custos próprios (9,6%); maior
custo continua sendo rasterizar pixels. Impacto 3 × confiança 5 / esforço 2 = 7,5.

A primeira fixture de pele32 em peça pequena era inválida: sanitize a reamostrava.
O relatório de diff do assert consumiu memória até falha do Bun. Essa tentativa e
a primeira medição imediatamente posterior foram descartadas. O assert agora
compara igualdade sem imprimir o documento inteiro, e verifica as dimensões antes.
Não são evidências de consumo de memória do produto; o benchmark não tinha iniciado.

## Alavanca e prova

Reutilizar pixels/DataTexture quando dimensões não mudam. `rasterAtlas` aceita
destino derivado exclusivo de comprimento exato; limpa bytes antes de escrever,
incluindo regiões desocupadas. Buffers de documento não são usados como destino.
Material só recebe novo mapa ao trocar textura; o recurso gerencia layout, fallback
e estado anterior sem conhecer cena, controles, React ou estado de sessão.

- Ordem de raster, faces, swatches e padding: preservada.
- Desempate/packing: mesmos algoritmos e ordem.
- Float/RNG: raster RGBA8 idêntico, sem mudança de cálculo ou aleatoriedade.
- Golden fixo de pixels: `4040964971c1669e5e1b9af3356ea4a288f14fac03d5b9894111b1090e1be31d`.
- Após: 8 warmups/40 amostras 2,213/2,789/3,704ms; perfil de 2000 amostras
  2,171/3,004/3,700ms. Ganho principal garantido por teste é manter identidade de
  textura/buffer; não extrapolar dispersão de microbenchmark para FPS.

## Revisão dos uploads

Dois testes vermelhos antes da correção: `markAll` seguido de `markRows` perdia o
pedido completo; e filas cresciam com cada traço sem upload. `AtlasTexture` mantém
full-pending até `DataTexture.onUpdate` confirmar upload. Parciais agrupam uma faixa
por linha (nunca cruzar linhas: Three 0.184 envia height=1). Confirmação limpa a
propriedade das faixas; fechar ignora escritas tardias e descarta uma vez.

Verificada implementação instalada de Three `WebGLTextures.updateTexture` e
documentação de atualização de buffers. Testes acionam a fronteira `onUpdate`, não
simulam um driver nem provam upload WebGL real. Cobertura inclui pintura após paleta,
atlas excedido/recuperado, dimensões, bytes vazios, pixel0/cor base, descarte e fila.

684 testes Molda passaram, typecheck/Biome/Vite passaram. Nenhum formato novo,
dependência, commit, deploy ou migração. Rollback deve reverter somente extração/
reuso correspondentes; manter a correção de full-pending e o WIP anterior do usuário.
