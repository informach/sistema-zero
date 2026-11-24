# Lote 3.5 — Pincel de objetos

17/11/2026 · staging · revisão local da parte 3.5. O lote 3 continua aberto: conjuntos, eficiência, retratos e Testar permanecem na sequência.

## Implementação

A ferramenta Espalhar ocupa a mesma aba Objetos, com atalho E, painel lateral e gaveta existentes. A escolha vem do catálogo ou dos objetos selecionados e aceita até oito modelos ou variações. Escolher não coloca uma peça nem grava uma revisão. O painel oferece raio, densidade por 100 m², afastamento, prevenção de sobreposição, giro, faixa de tamanho, semente, limite por traço, pasta e camada de destino. A semente avança explicitamente após uma aplicação aceita.

Cada protótipo conserva proporções por eixo, giro inicial, espelho, colisão, propriedades, cor e textura com repetição física. Suas referências ficam disponíveis durante o uso do pincel mesmo depois de apagar a peça de referência. Definições equivalentes são reutilizadas; conflitos recebem aliases sem sobrescrever o cenário. Uma seleção de árvores com giros diferentes não esgota a paleta com oito cópias da mesma variante.

A distribuição é determinística: grade irregular ancorada no mundo e PRNG inteiro com semente, sem relógio ou aleatoriedade global. Discos sobrepostos não multiplicam a densidade. Acrescentar uma área ao traço conserva as amostras já aceitas. Índices de proximidade conferem afastamento e, opcionalmente, volumes existentes e novos, inclusive objetos ocultos ou bloqueados. Terreno ausente, fundos e furos não se tornam chão; alturas não carregadas não viram zero.

O traço contém até 512 pontos e produz até 2.000 objetos. Cada geração possui teto de 100.000 tentativas e dois milhões de consultas de ocupação. Permanecem os limites globais de 20.000 objetos, 8 MiB e 500 comandos. Saturação é informada, sem laços ilimitados ou inserção automática na Faísca.

## Gesto, recursos e histórico

O motor reutiliza `CapturedPaintInput`, `paintPointerPath` e `SceneBrushCursor` do Molda. A prévia usa os modelos carregados e a mesma construção de instâncias da aplicação. Compartilha conteúdo original e possui seus materiais e representações temporários. A atualização ocorre no frame solicitado; não cria revisões por movimento do ponteiro.

Soltar aplica definições novas e um comando `objetos.espalhar` na fila existente, em uma ação de histórico. A receita acompanha as amostras aceitas, com IDs fornecidos pelo chamador. O replay confere estrutura, limites, área, chão, referências, distância e cadeados, mas não sorteia novamente nem precisa ler arquivos de altura no servidor. A cabeça do documento é conferida antes da aplicação. A seleção recebe os IDs novos.

Escape, segundo dedo, perda de foco/captura, troca de configuração, documento ou ferramenta e desmontagem descartam o traço. A órbita não recebe os eventos do gesto capturado. Configuração inválida pausa o pincel e conserva as referências carregadas; falhas de arquivo impedem aplicar uma prévia parcial e oferecem nova tentativa. Fotografar oculta temporários e restaura sua visibilidade em `finally`.

Não há nova tabela, armazenamento paralelo ou sistema independente de gestos. Modelos e texturas continuam sujeitos às autorizações e confirmação de conteúdo existentes.

## Revisão e correções

- Um teste reproduziu a criação de formas equivalentes em definições diferentes ao repetir a preparação da paleta. A comparação agora reutiliza definições equivalentes independentemente do ID atribuído por um alias. O teste falhou antes e passou depois da correção.
- A preparação da paleta é só leitura; definições e peças originais permanecem intactas. Fontes incompletas e mais de oito variações são recusadas integralmente.
- Uma resposta assíncrona da biblioteca não pode colocar objetos depois de mudar de intenção entre colocação normal e pincel.
- A revisão conferiu descarte de materiais próprios antes dos modelos canônicos, aplicação sobre revisão alterada, ausência de gravação no hover, limites e igualdade entre prévia e resultado autoral.

## Verificação

| Recorte | Resultado local |
| --- | --- |
| Núcleo | 137 testes, 3.819 asserções |
| Motor | 43 testes, 618 asserções |
| Oficina e hosts | 53 testes, 355 asserções |
| Molda: captura, caminho de ponteiro, cursor e área | 33 testes, 454 asserções |
| Members: serviço, histórico e HTTP | 42 testes, 160 asserções |
| Postgres descartável em 55439 | 23 testes, 179 asserções |

Chrome: 1.440 claro/escuro, 1.024 claro e 390 escuro. Conferidos seleção como protótipo, escolha de GLB real pela gaveta, parâmetros e destino, prévia sem gravar, aplicação em uma revisão, proporções/espelho/cor, undo/redo, reentrada, cancelamento por Escape, foco e segundo toque. Outro ensaio usou GLB real, textura física, forma e alturas Uint16 com recorte; conferiu mistura, contato das bases, fotografia durante o gesto, troca externa de revisão, toque nativo emulado, falha e recuperação de modelo. Sem erros de página nesses ensaios.

Três ciclos com 27, 27 e 26 objetos voltaram ao mesmo patamar de quatro geometrias e três texturas, sem objetos, após retirar prévia e resultado. Os números pertencem à fixture; não aprovam desempenho em dispositivos físicos nem em uma Faísca completa. Regressões de seleção por área, clipboard e acabamentos por objeto também passaram.

Tipagem aprovada no núcleo, motor, oficina e Members. O build da oficina passou e conserva o aviso de chunk acima de 500 kB.

## Evidências e reprodução

- [Painel claro](evidencias/lote3-espalhamento/light-1440-painel.png), [painel móvel](evidencias/lote3-espalhamento/dark-390-painel.png), [prévia](evidencias/lote3-espalhamento/light-1440-previa.png), [aplicação](evidencias/lote3-espalhamento/light-1440-aplicado.png).
- [GLB escolhido pela biblioteca](evidencias/lote3-espalhamento/dark-390-biblioteca.png), [mistura sobre alturas reais](evidencias/lote3-espalhamento/acervo-aplicado.png).
- [Vídeo da oficina](evidencias/lote3-espalhamento/espalhamento.webm), [resultado da interface](evidencias/lote3-espalhamento/resultado.json), [recursos e acervo](evidencias/lote3-espalhamento/acervo.json).
- Scripts: `node packages/molda-cenarios/playground/oficina/verificar-espalhamento.mjs <saida>` e `verificar-espalhamento-acervo.mjs <saida>`, com a oficina em 4541 e o acervo local. Nenhum GLB privado foi adicionado ao Git.

Esta é uma ferramenta de autoria explícita, sem mudança automática de cenário ou aprovação artística. O lote 3 e a entrega global permanecem abertos; implantação e validação de staging ficam para o encerramento global solicitado.
