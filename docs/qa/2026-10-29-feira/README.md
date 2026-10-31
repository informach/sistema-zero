# Feira semanal, conferência local

Em 29/10/2026, o navegador abriu a feira pela âncora real `barraca-6` da Vila Doce.
Chrome com SwiftShader, serviço simulado do playground e armazenamento local descartável.
Não houve chamada nem escrita em staging ou produção.

## Resultados

- `r1-kids-computador`: 1280 × 720, compra confirmada e preservada na reabertura.
- `r1-adulto-celular`: 390 × 844, toque em Usar, mesmo fluxo no tema adulto.
- `r2-kids-celular`: 390 × 844, mesmo fluxo no tema Kids e captura adicional da entrada.
- Em cada execução: nove aparências presentes; forno sem projeto não oferece compra;
  abrir a confirmação e cancelar não cobra; confirmar a geladeira custa 60 das 80 moedas;
  aparência aplicada; recarregar preserva posse e saldo 20 sem oferecer nova cobrança.
- Os três recibos `resultado.json` registram zero erros de página e painel sem extravasamento
  horizontal. Cada processo do playground e navegador foi encerrado pelo verificador.
- Regras de feira/tema: 6 testes, 45 asserções. Colisores da Vila: 10 testes, 339 asserções,
  incluindo busca em grade desde a chegada até a barraca. Tipagem do jogo passou.

## Revisão do teste de acesso

A primeira versão do teste de colisores exigia distância maior que 3,6 m entre as barracas 5
e 6. O GLB mede 2,3326 m. Essa exigência era incorreta: o motor escolhe o interativo mais
próximo e os centros ficam fora do alcance de 1,8 m do vizinho. O teste corrigido confere
essa regra e a rota real sem mudar a arte, os raios ou o algoritmo do jogo.

## Concorrência da galeria

Na revisão, uma compra confirmada durante a leitura da galeria invalidava a resposta antiga,
mas deixava `carregando` ligado. O teste causal reproduziu o defeito. A compra agora encerra
esse estado; o GET antigo não sobrescreve saldo/posse e uma falha posterior permite tentar
novamente. Galeria, feira e tema passaram em conjunto: 20 testes e 255 asserções.

## Reproduzir

No pacote `packages/arquipelago`, compile `playground/verificar-feira-browser.ts` com
`bun build --target=node --external playwright-core`. Execute o arquivo gerado com Node.
`ARQUIPELAGO_PRINTS` escolhe um diretório novo; `ARQUIPELAGO_CELULAR=1` ativa toque e viewport
390 × 844; `ARQUIPELAGO_PUBLICO=adulto` usa o tema adulto. O navegador aceita
`ARQUIPELAGO_CHROMIUM` ou o canal `ARQUIPELAGO_BROWSER_CHANNEL`, padrão Chrome.

Isso não comprova desempenho de GPU real, aparelho físico, migração de inventário ou o
serviço publicado. A migração da propriedade para o Members permanece no lote L04.
