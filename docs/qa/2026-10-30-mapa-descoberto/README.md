# Mapa das visitas, conferência local

Base `6461f19c0` mais os lotes locais em andamento. Sem commit intermediário, deploy ou
escrita em banco remoto. Remoto conferido novamente e igual à base.

## Resultado

- Contratos: 183 testes, 5.049 asserções, nenhuma falha. Inclui migrações históricas estritas,
  256 combinações de visitas, entrada inválida e teto em bytes.
- Jogo: suíte completa com 1.155 testes aprovados, 133.779 asserções, nenhuma falha. O teste
  condicionado a Postgres foi executado separadamente no banco descartável local e passou
  (1 teste, 3 asserções), sem ocultar o skip da invocação geral.
- HTTP e persistência focados: 63 testes e 241 asserções. O teste do observador acrescentado
  depois passou com os seis casos de exploração e 40 asserções, também incluídos na suíte geral.
- Typecheck dos contratos, jogo e API passou. Biome conferiu os arquivos tocados e diffcheck
  não encontrou erro de whitespace.
- Cenário cheio com todas as 30 espécies de item a 999, obras, rotinas, amizades e as oito
  visitas: 63.076 bytes UTF-8, margem de 2.460 para o teto de 65.536. Isso não redefine os limites
  das versões antigas nem autoriza truncar dados recebidos.

## Navegador

Chrome headless com SwiftShader, servidor Bun em porta aleatória de 127.0.0.1, plataforma falsa
local e contextos separados. Kids e adulto passaram em 1280 × 844 e 390 × 844 com toque emulado.
Sem erro de página e sem chamadas externas. Navegadores e servidores próprios encerrados.

Em cada caso: chegada à ilha central, mapa mostrando oito acessos e uma visita, deslocamento
de QA até a âncora real do Bosque, corpo apoiado na física, segunda visita, mapa e reabertura.
O deslocamento usa a porta de medição já existente; não é uma prova de caminhada completa pela
ponte. O gesto de abrir menu/mapa e fechar usa os botões reais. O serviço falso conserva a
revisão e o JSON, e a reabertura confirma V18 com os bits 1 e 2.

O cartão mede 520 px no computador e 350 px na tela de 390 px, sem transbordamento lateral.
No celular, o conteúdo é rolável e o botão final continua alcançável.

- [Kids no computador](kids-r1/computador-02-visitada.png)
- [Kids no celular](kids-r1/celular-02-visitada.png)
- [Adulto no computador](adulto-r1/computador-02-visitada.png)
- [Adulto no celular](adulto-r1/celular-02-visitada.png)
- [Recibo Kids](kids-r1/resultado.json)
- [Recibo adulto](adulto-r1/resultado.json)

O ensaio isolado do CSS adulto no Chrome confirmou fonte de título Bricolage com fallback
system-ui e corpo Atkinson com fallback system-ui, tamanhos 24 e 16 px. Os prints do playground
não comprovam carregamento das fontes hospedadas pela plataforma.

## Limites e reprodução

No pacote `arquipelago`, compilar `playground/verificar-mapa-browser.ts` com Bun, target Node
e `playwright-core` externo, em `.cache/mapa-browser.mjs`. Executar com Node e
`ARQUIPELAGO_PRINTS` apontando para uma pasta nova. `ARQUIPELAGO_PUBLICO=adulto` troca a comunidade;
`ARQUIPELAGO_CHROMIUM` seleciona um binário, senão usa o Chrome instalado.

Ficam pendentes GPU e celular físicos, host autenticado remoto e as outras entregas de L10.
O mapa mostra a região mais próxima como referência; esse marcador nunca grava uma visita.
