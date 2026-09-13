# Desafio do Primeiro Jogo — aulas interativas v6

A introdução e os cinco dias foram refeitos a partir dos seis roteiros originais da pasta `desafio-primeiro-jogo/entregas/videos`. Este pacote reúne **78 seções, 61 clipes planejados, 17 demonstrações, 6 experimentações, 32 construções no Estúdio, 5 entregas e 12 perguntas de quiz**.

Os originais permanecem intactos. A pasta contém roteiros, referências e capturas; os arquivos de vídeo gravados não foram fornecidos nela. Os recortes usam âncoras de fala, com tempos ainda não preenchidos. Os arquivos em `arquivo-3-dias` documentam uma versão antiga; a revisão segue a sequência atual de cinco dias.

## Comece por uma aula

| Aula | Resultado | Seções | Clipes | Demonstrações | Experimentos |
| --- | --- | ---: | ---: | ---: | ---: |
| [Introdução](introducao/roteiro.md) | Encontrar a aula, os materiais, o salvamento e a ajuda | 7 | 6 | 4 | 0 |
| [Dia 1](dia-1/roteiro.md) | Nave visível, controlada pelas setas e contida na tela | 16 | 12 | 3 | 2 |
| [Dia 2](dia-2/roteiro.md) | Tiros alinhados à nave, com movimento, limpeza e som | 12 | 9 | 2 | 1 |
| [Dia 3](dia-3/roteiro.md) | Asteroides que chegam e podem ser destruídos | 13 | 10 | 3 | 1 |
| [Dia 4](dia-4/roteiro.md) | Pontos, três vidas e proteção temporária | 13 | 10 | 2 | 1 |
| [Dia 5](dia-5/roteiro.md) | Quatro telas, condições, reinício, entrega e compartilhamento | 17 | 14 | 3 | 1 |

Cada pasta tem `roteiro.md`, `manifesto.json` e `montagem.json`. Os dias também têm `configuracao-estudio.json`, com campos para revisar no bloco de Estúdio existente. Esse último arquivo é referência de configuração, **não** um manifesto nem um projeto inicial substituto.

## O que a criança faz

O começo da aula mostra o resultado que ela vai conseguir naquele dia. Depois, o percurso alterna conforme a necessidade do conceito:

- **Observar:** um clipe curto mostra o que acontece. A criança pode pausar e rever. Não há controles de parâmetros ou conversão em experimento.
- **Experimentar:** uma atividade separada compara duas situações definidas. A criança controla o avanço, registra ambas e responde a uma pergunta sobre a relação observada. Ao concluir, os controles param e os resultados ficam para consulta.
- **Fazer no Estúdio:** vídeo do gesto e orientação curta acompanham o mesmo projeto da aula. A criança monta, testa e usa a conferência da etapa. Assistir ao vídeo não substitui o encaixe correto.
- **Entregar e fechar:** testa o resultado, envia a construção, vê o fechamento e responde às duas perguntas finais. No Dia 5, o Compartilhar fica disponível após a entrega, quando configurado.

As construções têm critérios de blocos ativos, valores e relações: por exemplo, ler o centro x da nave no campo x do tiro, somar pontos dentro da colisão correta e proteger o nascimento dos asteroides com a condição `jogando`. O retorno informa o objetivo pendente. O professor continua verificando o comportamento do jogo, o som e a legibilidade.

As cores da nave, do tiro e das telas são escolhas dentro da tarefa. Velocidades, tamanhos de referência e meta permanecem nos valores ensinados. Não há desafio extra nem exploração livre exigida para avançar.

O Dia 1 tem mais seções porque ensina a usar o Estúdio. Os padrões conhecidos ficam juntos nos dias seguintes: mover, retirar e desenhar um grupo formam uma construção. O Dia 5 preserva sua identidade de aula, mas divide a reorganização em passos; uma pausa depois de proteger motor, relógio e disparo permite retomar as telas sem perder o trabalho. As durações dos roteiros são estimativas de percurso, não minutagens medidas nem limites para a criança.

## Por que estas seis experimentações

| Dia | Comparação | O que permanece igual | O que a criança precisa perceber |
| --- | --- | --- | --- |
| 1 | y 110 / y 410 | x 400 e tamanho da nave | y cresce para baixo |
| 1 | Sem limpar / limpar por quadro | Uma nave e três posições | Limpar remove a imagem anterior, não o objeto |
| 2 | vy −9 / vy +9 | Origem, vx e total de quadros | O sinal define a direção vertical |
| 3 | Intervalo 20 / 40 | Total de 120 quadros e velocidade de queda | Intervalo menor produz mais nascimentos |
| 4 | Proteção 0 / 45 quadros | Três vidas e três contatos nos quadros 1, 6 e 11 | Novos danos podem ser ignorados temporariamente |
| 5 | inicio / jogando | Três chamadas do mesmo relógio protegido | A condição decide se a criação acontece |

Os arquivos HTML estão em [interacoes](interacoes). São modelos didáticos isolados, não uma execução do projeto da criança. O ritmo é manual, sem animação automática, som obrigatório ou tremor. Botões têm foco de teclado, rótulos e alvos grandes; contagens e explicações não dependem só de cor. O estado é restaurado antes de habilitar os controles, e a altura se adapta ao conteúdo.

O `LearningHtml` existente isola a atividade em iframe sem acesso à página ou rede. A participação é estado informado pelo cliente e a resposta externa é corrigida no servidor. Isso não equivale ao replay de comandos das experiências nativas de Corre Dino e não deve ser apresentado como prova inviolável de todas as ações.

## O que o professor prepara

1. Abra o rascunho da aula correta no admin. Na introdução, não é necessário Estúdio. Nos dias 1–5, confira o **primeiro bloco de Estúdio**, que o manifesto referencia por `existing.kind = studio` e `index = 0`. Ele é incorporado à aula, sem entrega pela galeria externa.
2. Preserve esse bloco e o projeto inicial. No Dia 1, prepare um projeto vazio com a extensão Jogo 2D instalada. Não coloque os projetos finais de QA como ponto de partida do aluno.
3. Configure o mesmo `chain` nos cinco dias. Se a cadeia já existe, preserve seu nome em todas as aulas; `desafio-primeiro-jogo` nos arquivos de configuração é a sugestão para uma cadeia nova. A aula seguinte recupera a última entrega do próprio aluno, quando não há rascunho local. A conferência deve ser feita com dois dias consecutivos, em um perfil de teste.
4. Use `iniciante-2d`, modo `blocks`, `allowLevelReveal: false` e disponibilize os blocos indicados em cada `configuracao-estudio.json`. O `allowBlocks` acrescenta os blocos necessários à paleta do nível; não é uma trava que impede toda edição fora da proposta. As instruções e os critérios mantêm o foco.
5. Somente no Dia 5, habilite a vitrine pelo `showcase.enabled`. Preserve título, resumo e capa já autorados quando adequados. O botão Compartilhar depende da entrega; não há critério inventado de publicação no manifesto. O professor confere a publicação e o link quando a criança optar por compartilhar.
6. Use **Importar roteiro com seções**, selecione `manifesto.json`, confira o destino e a prévia e aplique no rascunho. Os slugs são referências de autoria; use o vínculo com a aula aberta se o slug publicado for diferente. `retireBlockKeys` substitui instruções da versão anterior sem trocar a identidade do Estúdio.
7. Produza e vincule os clipes pendentes, confira os critérios no preview e faça a revisão visual do jogo antes de publicar as aulas. O conteúdo publicado não foi alterado por este trabalho.

O professor acompanha onde a criança parou, quais critérios faltam, as respostas e a entrega. A intervenção deve voltar à mesma relação que está sendo ensinada: grupo errado, bloco fora da condição, leitura trocada por número fixo ou ordem de desenho. Não pedir uma nova criação para corrigir um encaixe.

## Montagem dos vídeos gravados

`montagem.json` identifica o arquivo original, a seção de origem, a primeira e a última fala do trecho, a narração original selecionada, a edição necessária, a imagem e a fala complementar. `inSeconds` e `outSeconds` permanecem `null` até conferir o vídeo.

Uma nova seção não significa uma aula inteira para regravar. Reaproveite os gestos corretos, corte a enumeração antiga de passos e grave as pontes que mudam a explicação. Não concatene o trecho integral com todo o complemento: as instruções de edição indicam substituições e encurtamentos. Demonstrações conceituais devem durar apenas o necessário para enxergar a relação; as comparações HTML já incluem texto e pergunta, e não precisam de outro vídeo obrigatório para explicar cada clique.

Correções que exigem atenção na edição:

- **Introdução:** os antigos três modos não representam a página por seções. Mostrar divisória na tela larga e Ver exemplo/Criar na compacta. Não orientar duas instâncias da mesma aula editando o projeto. O parágrafo de Carreira foi escrito depois da gravação, segundo aviso do próprio original.
- **Dia 1:** x 400 é o canto esquerdo da caixa da nave de largura 54; seu centro x é 427. Preservar os números gravados e corrigir a explicação de centralização. Retirar testes livres de velocidade e a garantia de um bug de confirmação de campo sem reproduzi-lo na interface atual.
- **Dia 2:** centro x e topo y da caixa definem a origem do tiro; não prometer coincidência exata com a ponta visual da nave.
- **Dia 3:** x sorteado pode repetir; o kit varia o tamanho real das pedras ao redor da base 40. A frequência de nascimento não altera vy.
- **Dia 4:** depois da segunda perda de vida, sobra 1, não 2. A pedra que bate já foi removida; a proteção atende outros contatos próximos.
- **Dia 5:** acrescentar `Se jogando` no evento Espaço. Reiniciar volta a `inicio`, exigindo outro Enter para jogar. Na ordem original, se vitória e derrota coincidirem no mesmo quadro, a condição posterior leva a `fim`.

Avatar, quarto, moedas e ranking foram reservados para ambientação opcional, sem virarem tarefas obrigatórias antes do jogo. O destino de cada parte do original está no roteiro e no mapa de montagem de sua aula.

## Verificação e ensaio local

[Relatório da revisão](../qa/desafio-v6-revisao.md) e [resultado do validador](../qa/desafio-v6-verificacao.json). A revisão inclui fontes, contratos, importação, projetos executados no motor e navegador. Aulas ainda dependem da edição dos vídeos e da preparação do rascunho no admin.

Na raiz do repositório:

```powershell
bun docs/aulas-interativas/qa/gerar-desafio-v6.ts 'CAMINHO_DOS_ROTEIROS'
bun docs/aulas-interativas/qa/validar-desafio-v6.ts 'CAMINHO_DOS_ROTEIROS'
bun packages/community-kids/tests/visual/serve-desafio-preview.ts
```

O ensaio abre em `http://127.0.0.1:4323/`, com seletor das seis experiências e remontagem do estado guardado. `?spacing` usa o componente real de seções e o CSS atual, com conteúdo de exemplo para conferir o espaçamento. Essa página é uma ferramenta local de QA, não parte do percurso infantil.
