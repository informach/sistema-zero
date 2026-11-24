# Mundo PNG compartilhado pelo Python — 22/11/2026

Base `51b57e7df`. `pythonRegionWorld.ts` compõe os leitores de PNG, JSON e cena
em um registro privado de mundo. O mesmo registro alimentará os três adaptadores
2D; este lote ainda não seleciona novos formatos no produto ou no motor publicado.

`preparar_imagem` confere o envelope PNG 5 com a tabela gerada a partir do Core,
incluindo controles Unicode de IDs e os refinamentos de mapas ligados. Seus
descritores são imutáveis; a decodificação tem uma única tentativa. O gerador
continua recusando vocabulário de esquema/regex que o Python não conhece.

`ler_mundo_png` captura a raiz, todos os destinos e todos os PNGs de recursos.
Confere nomes, IDs, escala, ausência de mundo aninhado e geometria dos recursos
antes de alocar índices. Só devolve o registro depois de decodificar todos os
mapas. Uma recusa não modifica outro mundo já admitido.

## Orçamentos e fidelidade

- Até 16 mapas, 16 MiB de texto UTF-8 agregado, 4 MiB de índices e 4 MiB de
  caracteres de PNGs ligados; nenhum saldo é ampliado pelo leitor.
- Capa e recursos compartilham o teto de 16.777.216 pixels. Uma URL repetida
  conta uma vez; recursos contam pelo maior custo entre origem e escala.
  Geometria inteira de peças e arredondamento positivo seguem o JavaScript.
- A admissão Core da cena usa `JSON.stringify`, cujo tamanho pode diferir do
  JSON de entrada. O medidor Python reproduz escapes Unicode/UTF-16, números
  binary64, zero negativo e projeção de não finitos sem gerar outra string
  gigante. Ele não implementa JCS nem ordena propriedades.
- Os 26 limites numéricos publicados no apêndice B do
  [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785.html#appendix-B) e 4.096
  padrões binários determinísticos integram a regressão. A sondagem arquivada
  amplia o diferencial para 100.026 padrões; isso não é prova exaustiva de todos
  os valores binary64.

## Provas e revisão

A Vila e a Cabana usam PNGs reais da fixture autoral, múltiplas folhas, conjuntos,
objetos e propriedades. Todos os metadados, células ocupadas, hashes e dimensões
dos recursos são comparados com o leitor JavaScript. Zerar a entrada mutável
depois da carga não modifica o mundo capturado.

Os testes exercitam os limites agregados reais de índices, quantidade de mapas,
JSON canônico de cena e texto UTF-8 do mundo, com aceitação exata e recusa ao
exceder. A instrumentação envolve `array.array` real: cabeçalhos, recursos ou
orçamentos inválidos recusam sem criar buffers de células; há controles positivos.
Payload inválido no último mapa não publica os anteriores. IDs com controles,
formatos futuros, duplicatas, escala divergente e mundo aninhado são recusados.

Os testes de cabeçalhos de pixels e descritores usam também entradas
adversariais; esses casos não são provas de IDAT/pixels válidos. O perfil PNG
confere estrutura/CRC e texto. Decodificação gráfica e superfícies pertencem
aos adaptadores de cada motor, com validação própria e troca atômica.

Os recibos e hashes estão em `index.json`. Os testes de navegador exercitam as
fronteiras JavaScript e integração existentes; não executam este novo módulo
Python no runtime do Estúdio. Nenhum teste neste lote qualifica outro aparelho
físico, uma sessão com crianças ou uma nova versão de motor externo.

- Core completo: 3.253 testes, 211.097 asserções, 205 arquivos, 35,81 s.
- Pinta completo: 2.804 testes, 37.472 asserções, 263 arquivos, 257,96 s,
  incluindo os quatro controles Pygame reais já existentes. A suíte completa
  rodou sem outros testes desta sessão; o tempo não é um benchmark do editor.
- Focados Python: 28 testes/95 asserções em quatro arquivos; focados Core:
  19 testes/125 asserções em três arquivos. Todos sem omissões ou falhas.
- Sondagem numérica: 100.026 padrões binary64, nenhuma divergência.
- Navegador: quatro controles regionais em desktop/CPU 4× e 12 percursos
  Pinta–Estúdio aprovados, sem retry, omissão ou falha. Esses percursos usam
  os consumidores existentes; não homologam o futuro adaptador Python regional.
- Tipos Core/Pinta e do gerador Studio aprovados; tipos completos do Studio
  pertencem ao lote `75fd6db9d`, sem mudança em fontes Studio neste lote.
  Lint dos 11 fontes, whitespace e geradores oficiais aprovados.

O índice contém 20 recibos comprimidos e os hashes dos 11 fontes do lote.

## Alcance

Nativo 8, físico 3, cena 4 e PNG 5 continuam privados. Não foram alterados
catálogos de blocos, áreas, recibos de exemplos ou versão única do motor Python.
Não houve mudança visual, alteração funcional 3D, implantação ou merge em staging.
Os próximos lotes integram o núcleo de jogo comum e os adaptadores Pygame-ce,
Pygame Zero e Raylib 2D; sucesso deste leitor não conclui esses fluxos.
