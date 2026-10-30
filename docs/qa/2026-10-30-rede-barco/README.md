# Rede do barco, L10

## Escopo e implementação

Base local `f7bee3d3a`, com os sete cais existentes. A rede conserva central a Recife e
acrescenta as seis ligações entre vizinhas, derivadas dos ângulos do mapa. Jornada continua
decidindo acesso. O painel abre com E ou Usar, permite cancelar e confere novamente as
condições ao escolher. Não há novo prêmio, visita automática ou campo no salvamento.

As âncoras são extraídas dos GLBs em `portos-da-arte.json`. Build e playground recusam
metadados desatualizados. O navegador não baixa seis ilhas apenas para ler os portos.
Nas Nuvens, a transformação inclui a altura da ilha. A rede conserva o limite de uma
ilha completa na memória e monta apenas barcos atracados próximos, com cais pronto.

O arco externo fica a 150 m. A velocidade máxima permanece 12 m/s, reduzida a 2 m/s nos
cais. Os cinco portos novos têm saída de 25 m pela proa; central usa setor 110 e Recife
usa setor -70, mantendo o corredor fora do navio e do labirinto. A manobra começa a 25 m e termina antes dos últimos 10 m. As curvas e orientações
são preparadas e reaproveitadas, sem alocação no passo. Espera a 29 m do centro; após
20 segundos sem destino, retorna. Falha também no retorno mantém o barco em segurança.
As boias abrem só os corredores das ligações disponíveis. A correnteza não muda.

## Provas de navegador

Executadas em Chrome headless local, com SwiftShader, sem login ou banco remoto. O
playground usa a plataforma falsa; jogo, modelos, controle e interface são os reais.

| Rodada | Resultado e limites |
| --- | --- |
| `r1` | Recife e Pico chegaram. O caso seguinte reiniciava o backend falso com o mesmo IDB, criando um conflito correto de salvamento. Negativo e captura preservados; massa isolada depois. |
| `r2` | Recife e Pico chegaram. A reabertura no deque do Vale em celular mostrou o corpo caindo antes da proteção de carga. Negativo preservado. |
| `r3-cais-vale` | Caso causal após corrigir a ordem do primeiro quadro: o personagem pisa no deque e abre os destinos no celular adulto. É um caso, não duas larguras. |
| `r4` | Computador Kids: cancelar, controles durante a viagem, pausa, carga lenta, central a Recife e Recife a Pico. Celular adulto de 390 × 844, com movimento reduzido: Vale a Nuvens e Nuvens a Bosque. Jornada anterior ao Recife não oferece barco, em dois contextos novos. Nenhum erro de página ou console. |
| `r6-canal-recife` | Repetição de computador após preservar o canal do Recife: cancelamento, pausa, carga lenta e viagens a Recife e Pico, com jornada bloqueada isolada. |
| `r5-falha` | O navegador recusou o GLB do Recife. O barco esperou, iniciou retorno e desembarcou na origem central, sem soltar o personagem na água. Erros de recurso intencionalmente recusado ficam separados de erros inesperados. |
| `r7-falha-final` | Repetição da carga recusada depois do ajuste do canal do Recife. Pedido do GLB falhou de verdade; retorno e desembarque na origem passaram, sem erro inesperado. |

Em `r4`, as quatro chegadas terminaram no modo chão, com apoio e uma ilha completa na
memória. A observação de espera teve distância zero entre o avatar e a âncora visual.
Os dois casos de jornada fechada tiveram zero ilhas completas e nenhum barco. As capturas
foram inspecionadas, inclusive painel e desembarque das Nuvens no celular.

As correções são gerais: o carregamento publica a espera antes da física, já na primeira
transição para carregando; os dois cais usam a prontidão do ciclo comum; a orientação
interpola a curva, limita a mistura a 0..1 e escolhe o porto correto para cada manobra.

A primeira suíte completa encontrou o corredor novo perto demais da caixa da área do navio,
embora o casco não colidisse. A aproximação passou a conservar o canal original do Recife,
por identidade do porto. A mesma suíte observou a busca em grade do Bosque em 5,468 segundos,
acima do limite implícito de 5 s. O ensaio off-line manteve toda a grade e passou a ter limite
explícito de 15 s, sem alterar geometria, caminho ou qualquer orçamento de quadros do jogo.

As rodadas `r6-canal-recife` e `r7-falha-final` conferem o código final do canal. As outras
rotas de `r4` não mudaram com esse ajuste. A tipagem final exigiu anotações explícitas no
operador e a comparação da quantidade de erros, evitando que a asserção de lista vazia
estreitasse o tipo para `never[]`. Não houve alteração nos cenários ou critérios do navegador.

## Testes de regras e física

`rede-do-barco.test.ts` cobre a origem dos metadados, sete ligações bidirecionais, jornada,
trajetos contra pontes e rodas de outras ilhas, pausa, giros, espera e retorno dos dois cais.
`rede-do-barco-colisao.test.ts` monta os colisores dos GLBs reais, inclusive navio e labirinto,
e percorre cada ligação nos dois sentidos com malha real do casco e cápsula no Rapier.
Uma obstrução conhecida comprova que a sonda detecta colisão. A caixa global do modelo
não substitui sua malha, pois inclui espaço vazio. O sensor da malha é preparado uma vez,
sem reconstruir e reenviar vértices a cada consulta. São ensaios, não novas colisões no jogo.

O teste de reabertura em `ilhas-completas.test.ts` confere a proteção antes da física e
até a entrada do colisor. A prioridade da carga é -2; a física usa -1, a animação do barco
-0,5 e o desenho do personagem 0. O limite dos deques foi verificado no lote anterior.

## Verificação final

- `bun test`: 1.283 testes passaram, zero falhas, 147 arquivos, 141,90 segundos. Inclui o
  lote de primeiros passos com Zappy que entrou na base local durante esta implementação.
- `bun run typecheck`, com heap de 8 GB: passou após corrigir a tipagem do operador.
- `bun run check`: 577 arquivos, sem erros. Dois relatórios JSON da arte recebida tinham
  formatação divergente; foram apenas formatados. A comparação dos objetos antes e depois
  provou igualdade dos dados. Nenhum gerador, modelo ou coordenada foi alterado.
- `bun run build`: passou, 140 arquivos e 35,79 MB, incluindo assets e mapas de fonte.
- Revisão: acesso pela jornada, foco e toque, curvas bidirecionais, espera e retorno,
  carregamento antes da física, metadados determinísticos e liberação dos cais conferidos.

As primeiras tentativas de tipagem e lint foram preservadas nos logs locais. Elas não
representam falhas de execução do jogo nem foram apresentadas como verificações aprovadas.
Uma checagem adicional da raiz encontrou erros e avisos fora do pacote do jogo. Este lote
não certifica o lint do monorepositório; o lint aprovado acima é o do pacote Arquipélago.

## Reproduzir

No pacote do jogo, com Bun, Node e Chrome disponíveis:

```powershell
bun scripts/gerar-portos.ts
bun test
$env:NODE_OPTIONS='--max-old-space-size=8192'
bun run typecheck
bun run check
bun run build
bun build playground/verificar-rede-barco-browser.ts --target=node --external playwright-core --outfile .cache/verificar-rede-barco-browser.mjs
$env:ARQUIPELAGO_PRINTS='CAMINHO_ABSOLUTO_PARA_PASTA_NOVA'
node .cache/verificar-rede-barco-browser.mjs
```

O operador exige uma pasta inédita e fecha seus contextos, navegador e servidor local.
`ARQUIPELAGO_CHROMIUM` permite escolher o executável. Para o caso de carga recusada,
usar outra pasta e `ARQUIPELAGO_CENARIO=falha`. O caso focado do deque usa
`ARQUIPELAGO_CENARIO=cais`, `ARQUIPELAGO_TIPO=celular` e `ARQUIPELAGO_PORTO=vale-dos-dinos`.
O nome antigo `verificar-barco-browser.ts` delega ao operador atual.

## Limites da entrega

Não é prova de 30 FPS em celular físico nem de 60 FPS em GPU real. O navegador executou
quatro ligações normais e uma com falha; as sete ligações nos dois sentidos foram cobertas
por regras e Rapier. Não representa implantação ou validação autenticada da plataforma.
O fantasma familiar e os demais lotes da entrega integral continuam separados.
