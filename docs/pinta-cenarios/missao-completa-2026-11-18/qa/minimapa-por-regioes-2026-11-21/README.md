# Minimapa por regiões — 21/11/2026

Continuação do item 2 dos consumidores visuais. Base `ae2e25ee5bddc33b15440fdb443f458fc90c5101`.
O formato 8 permanece interno; este lote não ativa persistência ou edição pública
de mundos expansíveis. O PR continua em revisão, sem merge ou implantação.

## Resultado e contrato

`tilemapOverview` produz até 256 × 256 cores representativas. Para regiões, visita
os buffers armazenados, sem alocar uma matriz correspondente à extensão lógica.
Ordem das camadas, visibilidade herdada, deslocamentos, recorte lógico e fontes
privadas/compatíveis são considerados. Colisão e arte totalmente transparente não
apagam o terreno da visão geral. Opacidade parcial não é misturada: continua sendo
uma representação aproximada por cores, sem objetos ou animação, não um PNG completo.

Quando várias casas cabem no mesmo pixel, vence a maior posição global linha/coluna
daquela camada. Inverter a ordem dos chunks conserva a saída. Os mapas densos na
resolução original conservam o algoritmo anterior, inclusive suas convenções.
Folha padrão ausente em regiões não é substituída por uma folha sem relação;
o fallback histórico denso permanece disponível.

O componente `MapMinimapPanel` foi reaproveitado sem alterações de classes ou
estilos. Clique, toque, Home/End e centro do viewport usam coordenadas assinadas;
navegar não edita o documento. O indicador conta a capacidade dos buffers
armazenados, incluindo padding dos chunks, em vez da área lógica vazia.

O cache de cores saiu da interface para o núcleo, sem fabricar mapas temporários.
A revisão reproduziu uma regressão ao colocá-lo também na API bruta antiga:
uma folha alterada no mesmo objeto conservava a cor anterior. A API bruta continua
recalculando; a interface usa a variante com cache por identidade imutável.
Ambas compartilham o mesmo algoritmo de composição legado.

## Provas e revisão

- Regressões iniciais: seis testes do núcleo e três do componente falharam antes
  da implementação; a regressão do cache foi reproduzida separadamente.
- Testes focados: 68 aprovados, zero falhas, 286 asserções.
- Suíte do Pinta: 2.442 aprovados, três controles nativos omitidos pela ausência
  de variáveis na suíte comum, zero falhas. Os três foram executados separadamente
  com Pygame real: aprovados, 4.372 asserções. São controles legados, não exportação 8.
- Seis ensaios Chromium, sem retries: três no componente real por regiões e três
  na oficina pública densa; desktop, toque emulado e CPU 4×. Leitura real dos pixels,
  navegação, retângulo visível e conservação das células. O host de QA não habilita
  o documento novo no aplicativo nem acrescenta API de testes ao código de produção.
- Mundo lógico de 100 milhões de casas, duas camadas e dois chunks: canvas
  256 × 256, dois pixels ocupados com as cores exatas, inclusive recurso privado
  conflitante com a galeria. Indicador de 2.048 índices armazenados, não 200 milhões.
- API antiga e dimensões 192 × 128 verificadas na oficina, incluindo cores e
  reabertura após navegação. Desempate entre chunks com ordenação oposta à global
  verificado no núcleo. Revisão de resolução de recursos, limites e efeitos React.
- Typechecks do Pinta e Estúdio, Biome e `git diff --check`: resultados nos recibos.
  A inferência de tipos da união densa/regiões foi corrigida com o parâmetro comum
  de células no type guard, sem cast ou supressão.

Dois erros no ensaio de navegador foram corrigidos antes da execução final: a
cor esperada não correspondia à paleta do projeto e a posição relativa do
Playwright desconsiderava a borda do botão. O ensaio final usa coordenadas
absolutas de mouse/toque e verifica o destino correspondente sem ampliar tolerâncias.
Os logs dessas tentativas estão preservados.

`index.json` relaciona hashes de fontes e recibos comprimidos. Relatórios de
navegador incluem perfil aplicado e capturas. Capacidade de buffers e dimensões
foram verificadas; não houve medição de heap ou qualificação de latência neste lote.

## Continuação

Miniaturas/imagens pixel e vetoriais completas ainda precisam da adaptação do
próximo sublote, com orçamento anterior à alocação. O item 2 e as etapas da missão
continuam abertos. Sem validação em crianças ou outro aparelho físico; os perfis
emulados foram executados nesta máquina. Compatibilidade externa 8, IO físico 3,
autorregras, projeções e ciclo final da Vila permanecem no plano principal.
