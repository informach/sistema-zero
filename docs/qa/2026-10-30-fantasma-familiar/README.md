# Fantasma familiar dos percursos, L10

## Entrega

A trajetória fica separada da V18 e do limite de 65.536 bytes do salvamento. O serviço só
aceita o melhor tempo já confirmado, sob a mesma trava de revisão do save. Há uma linha por
perfil e percurso, com público explícito e exclusão em cascata ao excluir o save. Um recorde
novo torna a trajetória anterior indisponível até a nova gravação. Não há prêmio financeiro.

O diário IndexedDB conserva um envio por percurso, em namespace de público e perfil. A fila
do save é confirmada antes do upload; o GET canônico precisa ter o mesmo recorde. Resposta
perdida conserva a pendência, e uma confirmação antiga não apaga um trajeto mais rápido.
Reabre, retoma a aba, volta à rede ou toca em tentar de novo para retomar. Falta do artefato
não impede correr nem apaga um recorde. Leitura/escrita têm prazo e invalidam retorno tardio.

O resultado de um percurso oferece os trajetos dos irmãos. O BFF confirma o perfil na lista
atual do Auth; o serviço confirma a mesma conta Kids, acesso e permissão de visitas. Os nomes
vêm da lista familiar já autorizada e não entram no artefato nem na tabela. A imagem é padrão,
sem foto, roupas ou aparência do irmão. A comunidade adulta grava seus próprios trajetos, mas
não lê a família Kids. Consentimento social entre adultos permanece em L12.

Na largada, ao retomar a aba e a cada 15 segundos visíveis, o jogo reconfirma a referência.
A leitura tem prazo de 5 segundos. Falha, ausência e recusa retiram a imagem; não há promessa
de revogação instantânea por push. A conferência periódica usa a lista pequena de recordes
da família, sem baixar novamente as amostras. Nenhuma leitura usa cache compartilhado.

## Provas e correções

- Contrato: cinco percursos reais, amostras a 100 ms, último trecho parcial, 5 minutos,
  3001 amostras, 128 KB do artefato e 129 KB do comando. Chaves, coordenadas e giro estritos.
- Postgres descartável e HTTP reais: revisão/recorde/público, quatro uploads concorrentes,
  substituição do melhor, trajetória antiga escondida, limite máximo em JSONB, cascade,
  outra conta, próprio perfil, adulto, suporte, permissão desligada, JSON inválido e bytes
  reais acima do teto sem depender de `Content-Length`. Banco `arquipelago_test_fantasmas_20261030_r1`.
- A primeira prova HTTP revelou que lançar a recusa dentro do parser do Elysia a convertia
  em 400. A rota agora autentica, lê o stream com limite no handler e preserva o 413 correto.
  Os dois negativos e o positivo seguinte ficaram nos logs locais.
- Diário/estado: reabertura, isolamento Kids/adulto, melhor captura, confirmação atrasada,
  resposta perdida, suporte, cancelamento, recusa e resposta de leitura após encerrar.
- BFF/host/gateway: caminhos exatos, percursos conhecidos, limite do corpo, sem cache,
  métodos e rate limit, ausência do perfil no Auth e leitura indisponível sem pedir o artefato.

## Prova visual

O verificador usa o jogo real com modelos reais e a plataforma falsa local. `?fantasma=1`
prepara uma trajetória simulada da Vila pelas âncoras do GLB, com o tempo da massa da Ana.
Essa trajetória não é apresentada como corrida humana. Para completar a corrida que testa
a gravação, o operador usa o controle de posições já existente no medidor, sem alterar o
motor ou o resultado. Não é uma prova de que uma pessoa completou o percurso com os controles.

| Rodada | Resultado e limite |
| --- | --- |
| `r1` | As asserções de seleção, material e pausa passaram, mas a inspeção das capturas mostrou o segundo avatar deformado. Esta rodada não homologou a aparência. |
| `r2` | Após a correção de recursos do avatar: seleção e retirada possível no resultado, silhueta ciano com 13 malhas e opacidade 0,35, posição avançando pelo relógio, esqueleto distinto do personagem e pausa congelada. Computador 1280 × 800 e celular emulado 390 × 844 com menos movimento, sem erro de página ou console. |
| `r3-integrado` | Na base com as cores conquistadas: repetiu os dois tamanhos e conferiu retirar a referência, começar outra corrida e não montar o fantasma. |
| `r4-reinicio-red` | Negativo causal em computador: ao bater o recorde no reinício, a primeira amostra ainda era a chegada anterior, `[7087,636,-5265,0]`. O erro e a captura foram preservados. |
| `r5-reinicio-final` | Na composição com a pausa de pets e móveis: os dois tamanhos passaram, incluindo a leitura do artefato realmente guardado após um novo melhor tempo. A primeira amostra agora coincide com a largada, e pausa, retirada e corrida seguinte sem referência passaram. |
| `r6-composicao-final` | Na base `9af68cb3e`, preservando abertura manual e ritmo básico: os dois tamanhos passaram. A pausa atravessa 16 segundos, incluindo uma revalidação pela lista de recordes, sem retirar a referência válida ou avançar o relógio. Mantém os casos de novo recorde, amostra inicial, esqueleto próprio e retirada. |

O problema era do componente compartilhado: duas instâncias montavam o mesmo osso raiz do
cache e a cor de uma peça alterava o material original. As regressões de Three reproduziram
as duas falhas antes da correção. `avatar/instance.ts` agora separa ossos, texturas de esqueleto,
materiais tintáveis e morphs. Geometria continua compartilhada. Skin e material de apresentação
têm dono explícito. As regressões também conferem descarte sem atingir original ou outra cópia.

O desenho é montado apenas durante a corrida correspondente e não possui corpo do Rapier.
Ao terminar ou retirar a referência, seus recursos próprios são liberados. Não muda o passo
de 1/60 s, a colisão, as estrelas ou a movimentação do personagem.

A correção do reinício não adiciona um atraso ao jogo. O gravador começa no primeiro quadro
ativo do cronômetro, depois do corte e do teleporte. A massa do navegador espera doze segundos
na primeira corrida para criar deliberadamente um recorde mais lento, e exige que a segunda
o supere antes de conferir a amostra inicial do arquivo. O serviço falso também persiste as
trajetórias em seu próprio armazenamento de playground; a produção continua usando a API.

## Reproduzir

No pacote do jogo:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=8192'
bun test
bun run typecheck
bun run check
bun run build
bun build playground/verificar-fantasma-browser.ts --target=node --external playwright-core --outfile .cache/verificar-fantasma-browser.mjs
$env:ARQUIPELAGO_PRINTS='CAMINHO_ABSOLUTO_PARA_PASTA_INEDITA'
node .cache/verificar-fantasma-browser.mjs
```

O operador aceita `ARQUIPELAGO_CHROMIUM`, usa SwiftShader, porta local dinâmica, contextos
seriais e prazo terminal. Fecha o navegador e o servidor ao terminar. O ambiente Windows
exigiu normalizar separadores no teste de exports do pacote avatar-quarto; o teste não foi
removido nem enfraquecido.

Nos contratos, serviço e avatar: `bun test`, `bun run typecheck` e `bun run check`. A prova
de banco exige `ARQUIPELAGO_FANTASMAS_TEST_DATABASE_URL` apontando para localhost e banco
descartável `arquipelago_test*`. Não usar URL de staging ou produção.

## Verificação dos pacotes

Na base local `9af68cb3e`, a composição preserva descarte animado, cores conquistadas, pausa
do quarto, leitura manual e ritmo básico. As suites dos outros cinco pacotes foram executadas
na base `297e95fd1`; esses pacotes não mudaram entre as duas bases. O jogo foi executado de novo
depois da conciliação. A conferência periódica dos metadados tem regressão própria de estado.

| Pacote | Testes aprovados | Ignorados | Tipagem e check |
| --- | ---: | ---: | --- |
| avatar-quarto | 4 | 0 | aprovados |
| arquipelago-contracts | 200 | 0 | aprovados |
| arquipelago-api | 252 | 93 | aprovados |
| api-gateway | 314 | 2 | aprovados |
| arquipelago | 1308 | 0 | aprovados |
| member-shell | 2005 | 0 | aprovados |

Os cinco testes novos de Postgres e HTTP foram executados. Os 93 ignorados da API pertencem
a outras bases locais não ligadas nesta tentativa; os dois do gateway exigem Redis real.
O cartão dos responsáveis também passou nos seus oito testes. Não foi executada a suíte
inteira dos apps Next nesta rodada. O build do jogo gerou 140 arquivos, 35,86 MB, versão
`20261030112103`. A conferência de JSON preservou os dados das capturas anteriores.
O check da API terminou com um aviso preexistente de optional chaining em
`repositorio-sessoes-tempo.ts`; o member-shell terminou com cinco informações. Nenhum erro.

## Limites e próximos aceites

As provas de permissão revogada são de rota real com banco local e de estado. Não substituem
o fluxo autenticado completo Auth, gateway, BFF e jogo hospedado com dois perfis reais, que
permanece em L14. O navegador usa a família falsa. Não foram escritas bases remotas, alterados
GLBs ou geradores, importado conteúdo ou implantados serviços. FPS de aparelhos físicos e
memória em sessões longas não são inferidos de SwiftShader. O lint global do repositório tem
pendências de outras frentes; os checks desta entrega têm o escopo dos pacotes e arquivos tocados.
