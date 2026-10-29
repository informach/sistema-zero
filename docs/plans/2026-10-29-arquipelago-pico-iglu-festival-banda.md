# Iglu, festival de inverno e montar a banda no Pico Gelado (fase3-08)

Data: 29/10/2026. Feito numa sessão só (arte no Blender e jogo).

## De onde veio o desenho

A proposta do jogo (Canvas `5eNo1oqsndxmV6MPLxaz1W`, ilha do Pico Gelado) diz: "Floco, o pinguim
músico. O gelo calou a música da montanha." e, para a fase da ilha, "Iglu, chocolate quente,
festival de inverno, montar a banda", com "Lareira, instrumentos" entre o que vai para casa e
"Cristais e notas musicais" como coleção. O catálogo dos objetos da casa já tinha a lareira e os
"Instrumentos da banda" como pedidos do Pico, e o `banda.glb` (arte/objetos) já trazia os
instrumentos em nós soltos.

## Decisões

- **O iglu é para entrar, não um lote do Construir.** A proposta fala em "construir fora de casa
  (iglu no pico)", mas uma segunda obra no salvamento não cabe: o pior caso tinha 48 bytes antes
  desta fase, e uma obra cheia passa de vários kilobytes. O iglu virou um lugar de verdade: oco,
  de pé lá dentro, com o fogareiro (o chocolate quente) e os bancos de gelo (sentar).
- **Chocolate quente no fogareiro, sem os corações do Bento.** É a receita que já existe (1 cacau e
  1 leite). Lá ela vale para todos: é o motivo de entrar no iglu com os ingredientes. O primeiro
  chocolate feito lá traz a lareira como projeto azul. O projeto é a própria marca: nenhum campo
  novo.
- **A banda são três pinguins com instrumentos perdidos.** Os pinguins do `pinguim.glb` (na escala
  dos bichos, 1,8: uns 0,92 m, do tamanho dos instrumentos) esperam no palco. Os instrumentos são
  três dos cinco do `banda.glb`: o xilofone (dentro do iglu, que dá motivo para entrar), o violão
  (na beira do lago congelado) e a bateria (no platô do cume, que a subida e o trenó já levam até
  lá). A parede de gelo não foi usada: não há como subir nela hoje (a escalada é só do tronco).
- **Sem prazo, ordem ou castigo.** Levar é um gesto; o pinguim do instrumento começa a tocar na
  hora; com os três, o festival de inverno começa e fica para sempre.
- **Salvamento V14 com um número de 0 a 7** (`pico.banda`, 19 bytes no pior caso), como os
  corais da V13. Sobram 29 bytes do teto.
- **Duas abas juntam os instrumentos.** Levar ao palco não gasta nada; na conciliação do salvamento
  os bits das duas sessões se somam (`conciliar-salvamento.ts`), como as descobertas do Vale.
- **A conversa do Floco muda com a banda**: antes, onde ficou cada instrumento que falta; depois,
  o festival e o projeto azul.

## Arte (Blender, `arte/ilhas-b/pico.py`)

- Cúpula oca por booleanos exatos (a esfera de fora menos a de dentro, a metade de baixo e o vão
  da porta), juntas por fora, vestíbulo em arco, tapete, fogareiro com a brasa e a panela de
  chocolate, bancos de gelo. O nó `telhado-iglu` esmaece no jogo.
- Colisão: o anel `col-parede-iglu` (24 pedaços, menos os que invadem o corredor da porta) e os
  lados grossos do vestíbulo, o fogareiro e os bancos.
- Âncoras: `iglu-dentro`, `fogareiro`, `instrumento-*`, `banda-*` e `musico-*`.
- O iglu foi para (3,4; 7,6): no lugar antigo, com o tamanho novo, ele encostava na parede de gelo.
- Lá dentro, o fogareiro no fundo, os bancos dos lados perto da porta (virados para o meio) e o
  xilofone no fundo à esquerda. Na primeira arrumação, de pé junto do xilofone o botão era o
  "Sentar no banco" (o verificador do celular pegou); o teste "de pé junto do xilofone, do
  fogareiro ou de um banco" agora confere que, chegando de frente, o botão é o daquele.

## Conferido

- Testes: `tests/banda.test.ts`; o bloco do iglu em `tests/colisores-do-pico.test.ts` (entrar a
  pé, a cabeça nunca acima da cúpula nem do arco, os bancos virados para o meio, o botão certo junto
  de cada coisa, alcance do fogareiro e dos instrumentos, lugares no palco); o contrato em `salvamento-v14.test.ts`; o serviço aceita a V13 e guarda a V14.
- Navegador: `playground/verificar-pico-browser.ts`, computador e celular emulado.

## Fica para depois

- Notas musicais como coleção (a proposta fala nelas): o álbum ainda não tem a seção.
- Os outros dois instrumentos do `banda.glb` (teclado e microfone) ficam só no objeto da casa.
