# Imagens editáveis bbmodel, lote 190

## Implementação e contrato

convertBbmodelImages consome aparência, rasters decodificados e layouts privados
correspondentes do formato free. Cada textura selecionada vira uma imagem nativa
independente, mesmo quando os rasters são aliases do mesmo arquivo. IDs seguem o
índice original; o resultado inclui mapa de vínculos para o futuro materializador.
Não relê arquivos, busca recursos ou modifica os pixels do decoder neutro.

O orçamento conta RGBA8 de cada imagem editável, não apenas o buffer compartilhado.
Quantidade e soma de pixels são conferidas antes da leitura de qualquer amostra.
Também são conferidas todas as correspondências, dimensões e políticas de camadas
e precisão antes da primeira cópia. Limites de fonte/decoder/layout anteriores
permanecem obrigatórios; planos privados adulterados não são um novo formato público.

RGBA8 é copiado exatamente, incluindo RGB sob alpha zero e alpha de baixa cobertura.
RGBA16 é recusado por padrão; round-to-rgba8 precisa ser escolhido e gera relatório
por imagem, usando arredondamento ao nível mais próximo. Não se aplica gamma, ICC,
EXIF, premultiplicação, threshold de transparência, escolha de PBR ou shader.
Isso preserva amostras da fonte, não promete identidade com um canvas gerenciado
por cor ou com os shaders/settings de prévia do Blockbench.

Linhas da cópia própria são invertidas pela primitiva existente do lote 187;
pixels nativos são bottom-up. Até Buffer.subarray permanece intocado, com bytes
de guarda em ambos os lados. O flipbook mantém dimensões, FPS e sequência próprios;
nenhum alias compartilha array editável de pixels ou de quadros. Imagem estática
não recebe campo flipbook vazio nem usa a folha como quadro único indevidamente.

Nomes usam o adaptador nativo comum: fallback/truncamento relatados, sem trim,
normalização Unicode ou corte no meio de um par substituto. Layers têm fonte
única, visibilidade própria e opacidade 1; textura.visible não vira opacidade
da imagem, pois esse flag tem significado de composição de prévia na origem.

Camadas ativas são unsupported nesse caminho de bitmap simples, inclusive lista
vazia. Não se presume que source é uma composição fiel ou atual das camadas.
Descritores inativos são omitidos com contagem, sem ler seus campos nem executá-los.
O suporte a composição/camadas precisa de um caminho próprio e orçamento combinado.

## Fonte e revisão

[Texture](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/texturing/textures.js#L1780)
refaz o canvas com camadas e pode atualizar source; isso não torna qualquer bitmap
selecionado uma prova da composição atual.
[TextureLayer](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/texturing/layers.js#L108)
persiste bitmap próprio, offset, escala, opacidade, visibilidade e blend mode.
Leitura exata via Octocode e cache ignorado; nenhuma implementação GPL foi copiada
ou executada. O compositor nativo ainda não cobre todos esses modos/transforms.

Review percorreu os limites agregados, ownership de bytes/frames, precisão,
ordem de falhas, nomes, omissões e fronteira com materiais. Cada textura retém
edição independente; deduplicação do decoder não se transforma em compartilhamento
mutável. Futuras receitas PBR com novas imagens devem reservar seu custo adicional.
Os relatórios de seleção, recursos e layouts precisam ser preservados na composição
final; o relatório deste estágio não os substitui nem aprova aparência completa.

## Cobertura e evidências

Pipeline real JSON/recursos/PNG/layouts em 4.9, 4.10 e 5.0; aliases com animação
e imagem estática, fonte intocada, leitor de imagem/documento nativo, orientação
conferida com o adaptador Canvas nativo e sampling de cada texel durante três ciclos.
Repetições de frames são mantidas. Sem roundtrip circular como única prova.

Todos os 65.536 valores de canal RGBA16 conferidos com expressão inteira independente;
erro máximo de 128 unidades da fonte, alpha incluído. Bytes de Buffer com guards,
Unicode, seleção, camadas ativas/inativas, todas as identidades antes dos pixels,
limite exato de 32 MiB com oito imagens editáveis e opção/formato desconhecidos.

Novos testes: 11 passes, zero falhas, 65.696 asserts, 675 ms. Tipos e Biome 984
passaram. Focal expandido: 123 passes, zero falhas, 66.903 asserts, cinco arquivos,
2,81 s. Integral: **2.311 passes, zero falhas, 314 arquivos, 8.319.503 asserts,
138,19 s**, exit 0. Vite 1,15 s com chunks idênticos ao lote 189 e aviso Three
>500 kB mantido. Kids exit 0: compilação 5,4 s, tipos 9,3 s, 59 páginas em 648 ms.
Diff check passou com os três avisos CRLF anteriores. Sem novo benchmark,
dependência, UI bbmodel, adoção completa ou ativação pública.
