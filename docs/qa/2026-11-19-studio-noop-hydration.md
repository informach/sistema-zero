# Execução inicial coerente com os blocos salvos

## Evidência e causa

O diagnóstico `44638854435`, anterior à correção, concluiu no Linux:
96/100 casos passaram; três Duelo de Heróis Profissional e um Desvie em
tela estreita ficaram pendentes numa tecla. Editor e jogo continuavam
respondendo à leitura CDP. Os dois controles diagnósticos passaram.

Uma leitura adicional da fonte real, separada do hash CSP, identificou
no Patrulha a inserção isolada de `// Gerado pelo Sistema Zero Studio`.
Ela acrescentava 48 caracteres ao documento com JavaScript em base64.
O teste no navegador reproduziu a segunda navegação nas duas larguras.

No Duelo básico havia também mudança das identidades de execução: o código
inicial usava chaves de fallback para eventos e cooldowns; o Blockly depois
atribuía IDs aos blocos e a regeneração substituía essas chaves. Um teste
headless com Blockly real reproduziu a diferença antes da correção.

## Alteração

- `BlocklyPanel` conserva a presença/ausência do cabeçalho ao hidratar
  blocos de scripts externos. Uma edição real continua usando o cabeçalho
  padrão. Placements inline e o contrato de código da Ponte permanecem
  nos seus caminhos existentes. O cache de source map usa o mesmo cabeçalho
  escolhido, preservando as linhas do programa executado.
- A galeria usa o atribuidor de IDs estáveis existente **antes** de montar
  blocos e arquivos de um projeto novo. O template não é alterado; IDs
  existentes e metadados são conservados. Projetos salvos não recebem
  novos IDs por essa alteração no construtor da galeria.
- O atribuidor também cobre a área opcional de moldes, antes omitida.
  O teste demonstra o ID existente conservado, corpo identificado e
  entrada não modificada. Não há outro mecanismo de IDs ou formato novo.

Não foram modificados blocos, campos, cores, menus, sandbox, CSP, cotas,
timeouts de execução ou interações dos cursos. O observador transforma
somente suas strings de diagnóstico; nunca remove CSP do documento real.

## Verificação local

| Verificação | Resultado |
|---|---|
| IDs, 185 exemplos reais, geração, source maps e modos | 240 testes, 6.013 asserções, seis arquivos |
| Navegador Chromium completo | Seis casos aprovados em 1,4 min incluindo build |
| Recortes iniciais das duas aulas protegidas | Dois aprovados, sem atualizar referências |
| Orçamento do bundle inicial | Uma aprovação, 53 asserções |
| Controles do observador | Três aprovações |
| TypeScript completo local e recorte E2E | Sem erros |

Os seis casos incluem as interações nativas de Patrulha e Duelo, abertura
de Desvie e Duelo nas larguras 390/1280, uma única execução durante a
hidratação sem mudança e substituição completa após escolha real de fonte
no 2D. O programa novo precisa desenhar pixels não transparentes. A troca
entre Blocos/Ponte tem seu próprio ciclo de prévia e ocorre antes da janela
específica que observa o carregamento da nova fonte.

O teste observa dois segundos após o primeiro frame para verificar a
**ausência** de navegação espontânea, cobrindo o debounce de 800 ms existente.
Essa janela não altera prazos do produto nem mascara espera por prontidão.
O teste anterior, que dependia da recarga desnecessária para obter dois
documentos, foi substituído por abertura sem recarga **e** alteração real
de recurso. A contagem de casos aumentou de dois para quatro.

## Limites e auditoria adicional

Uma inspeção de fontes dos 185 exemplos encontrou 150 round-trips byte a
byte iguais e 35 com diferenças a classificar: 34 incluem ordenação de
declarações CSS, 21 incluem HTML/atributos e um inclui metadados gerados no
JavaScript do Folio. A inspeção reaplica `htmlShell`, como o painel real.
Isso não prova 35 regressões funcionais nem autoriza ignorar as diferenças;
é uma frente de revisão restante. A proteção existente de declarações CSS
dependentes de ordem precisa ser preservada.

Seis casos locais não encerram o achado intermitente em todos os navegadores
e projetos. O ensaio ampliado continua com cem casos por sistema, em dois
shards de cinquenta: `--list` confirmou 50/50. O limite do job continua em
25 minutos; os prazos de cada teste, ações nativas e retries zero não mudam.
O particionamento evita que instalação fria mais cem casos cancelem o job
Windows antes de sua conclusão.

A missão global permanece aberta, inclusive montagem inicial incremental,
ativação do isolamento, Members real, ferramentas profissionais e jogos
extensos. Não há nova medição de FPS, aparelhos físicos ou vazamento de memória.
