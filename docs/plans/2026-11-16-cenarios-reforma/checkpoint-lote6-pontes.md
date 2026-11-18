# Lote 6.2 — Pontes de catálogo e contato real dos pilares

18/11/2026 · continuidade de `0f43bd41c` na staging. **Lote 6 continua aberto.**

## Implementação e revisão

Os pilares deixaram de aproximar o tabuleiro arqueado pelos cantos. A consulta regional reutiliza o BVH da física para obter as faces reais do modelo, incluindo sua transformação, `drawRange` e vigas inferiores. O núcleo recorta a base pelas células reais do chão e calcula o envelope inferior do tabuleiro sobre a área do pilar. As tampas e os espelhos entre alturas distintas fecham o próprio sólido do apoio. Nenhum GLB é modificado e não se acrescenta piso invisível à ponte.

Onde há juntas entre tábuas, a madeira do próprio pilar fecha sua face superior na menor altura de contato. A área efetivamente apoiada é informada separadamente, com aviso sobre as aberturas. Sem qualquer superfície de contato, ou sem chão sob toda a base, o pilar não é criado; o aviso pede revisão da implantação. Erros de geometria e de orçamento não são convertidos silenciosamente em ausência de apoio.

O afastamento lateral opcional, em metros, permite posicionar as duas linhas sob o piso útil em vez de depender da largura total dos guarda-corpos. A validação impede linhas sobrepostas ou fora da largura declarada. O valor segue o mesmo documento, JSONB e histórico: não cria armazenamento paralelo. Também foi corrigido o arredondamento que podia acrescentar um par de pilares na última cabeceira.

Há limites antes das operações custosas: 20 mil triângulos consultados por região, 500 mil comparações de faces, 2 mil triângulos de tampa, 2 milhões de visitas de extrusão, 4 milhões de comparações de transições e 600 mil vértices por estrutura. A preparação do prisma e das tampas é reaproveitada durante a montagem; cópias são liberadas, preservando os recursos compartilhados do catálogo.

## Falha compartilhada encontrada e corrigida

O ensaio revelou que o recorte de uma aresta quase coincidente podia aceitar um vértice pela tolerância e interpolar pela distância original. Com ambos os extremos do mesmo lado, isso extrapolava o segmento e gerava faces invertidas ou alturas incorretas. O teste mínimo reproduziu o problema antes da correção.

Classificação e interpolação agora usam a mesma fronteira, com tolerância proporcional à normal do plano. A regressão confere os limites dos vértices e UVs em três escalas equivalentes de plano. Na malha final dos pilares, lascas com altura inferior a um micrômetro são eliminadas pela degeneração geométrica, sem excluir faces pela inclinação. Isso conserva paredes verticais e apoios reais.

## Ensaio com modelos reais

| Modelo | Largura no ensaio | Resultado |
|---|---:|---|
| Adventure Land `ponte_04_pacote` · `8d256d9aefcc…` | 2,60 m | Ida/volta apoiadas; afastamento lateral de 0,30 m |
| Reino `pontilhao_tabuas` · `5f24d8c293fe…` | 2,60 m | Ida/volta apoiadas |
| Temple `ponte_arco_madeira` · `5c72fbc606c6…` | 1,90 m | Ida/volta apoiadas |

As medidas úteis das cabeceiras são conferidas por amostragem do modelo no **ensaio**, sem heurística de nomes no motor. Cada ponte conserva quatro pilares internos com contato real. As 3.192 amostras das tampas incluem aberturas entre tábuas registradas separadamente; nas áreas com contato, o maior erro em relação à face inferior consultada foi inferior a 0,001 mm. O controlador usado mede 1,17 m, sem alteração de passo, velocidade ou colisão.

A ponte Temple em 2,60 m apresentou degraus de aproximadamente 28 cm, acima do passo do avatar. A versão de 1,90 m foi testada como alternativa proporcional, sem deformar o GLB. Isso demonstra a necessidade de conferir modelo e escala; não aprova essa ponte ou largura para a composição artística da Faísca.

Três ciclos de reconstrução mantiveram 10 geometrias, 11 texturas, 10 chamadas de desenho e 11.023 triângulos no laboratório. Não houve erros de navegador. São contagens de uma cena de teste no Chrome desktop, sem homologação de aparelhos físicos.

[Vista diurna](evidencias/lote6-pontes/pontes-dia.png) · [Vista noturna](evidencias/lote6-pontes/pontes-noite.png) · [Resultados e configurações](evidencias/lote6-pontes/resultado.json).

## Verificação

| Verificação | Resultado |
|---|---|
| Núcleo | 274 testes / 10.203 asserções, sem falhas |
| Motor | 117 testes / 3.740 asserções, sem falhas |
| Oficina | 96 testes / 610 asserções, sem falhas |
| Members: serviço, histórico e HTTP | 51 testes / 244 asserções, sem falhas |
| Postgres real: persistência e undo/redo | 40 testes / 358 asserções, sem falhas; afastamento lateral preservado |
| Tipagem núcleo, motor e oficina | aprovada |
| Biome e build da oficina | aprovados; permanece o aviso de chunk acima de 500 kB |
| Workers compilados | terreno, PNG 16 e água aprovados |
| Seis variantes no Palco | sem erros; catálogo, vão, travessia e ciclos conferidos |
| Interface de água | quatro layouts, histórico, rio, represa, cachoeira e retomada sem erros |
| Faísca completa com Cute Characters | altura 1,17004 m; casa–praça 12,63 m, praça–horta 19,38 m, horta–ponte 43,28 m; ida/volta e Farol em Y=9,613 m, sem erros |

## Pendências e próxima frente

Continuar exclusivamente no **lote 6**. Conferir o fechamento de 6.2 para estrada/cercas/muros em relevo e seus apoios; depois executar pontos, worker e autoria (6.3), interface Caminhos (6.4) e revisão do lote (6.5). Esta entrega não conclui a aba Caminhos, a composição artística da Faísca ou os lotes seguintes. Full review, CI, implantação e validação remota continuam no encerramento global.
