# Briefing para analisar e preparar um curso

> **Comece pelas [Diretrizes Pedagógicas](DIRETRIZES-PEDAGOGICAS.md).** Esse é o ponto único de consulta das regras e decisões para todos os cursos. Leia-o inteiro antes de analisar uma aula. O briefing organiza o trabalho; não mantém uma segunda versão das regras.

## 1. O que levantar antes de escrever

Leia a organização do curso em `modulos-*.md` e o trio da aula em `aulas/`: proposta, manifesto e roteiro. Encontre o gerador em `qa/` e o caderno em `recursos/`. Confira no código as paletas, rótulos, valores, ações e critérios que a aula usa. As referências exportadas são apoio, não substituem essa conferência.

Registre o ponto de entrada, o que já vem preparado, o que será construído, ferramentas disponíveis, conquistas, experiências, distribuição dos quizzes e conclusão. Decisões específicas ficam na proposta do curso; regras comuns ficam nas Diretrizes. Não partir do pressuposto de que todo curso terá o tamanho ou a sequência do Cadê Todo Mundo.

O acervo `docs/aulas-interativas-legado/` é inventário histórico. As divisões automáticas antigas, tours e moldes repetidos não são referência didática vigente. O jogo de nave pertence a Nave Contra Asteroides; o Desafio atual é A Chave do Farol. Não misturar os projetos.

Para adaptar uma aula existente, conservar projeto do aluno, identificadores, mídias e conquistas. Mudanças locais de autoria não comprovam atualização no Admin ou publicação.

## 2. Triagem: seis perguntas por conceito

Não existe molde. As respostas variam de aula para aula e de conceito para conceito. Para **cada
conceito** que a aula ensina, responda e justifique:

1. Esse conceito é abstrato a ponto de precisar virar concreto, ou a explicação já basta?
2. Se precisa, existe uma relação que a criança consegue manipular numa experimentação?
3. O que o vídeo precisa explicar antes ou enquanto a experiência torna concreto?
4. A concretização vem antes ou depois da explicação?
5. Ela vem antes ou depois de a criança montar aquilo no Estúdio?
6. Isso é uma seção ou mais de uma?

Muitos conceitos respondem "não precisa de nada". Vocabulário (a palavra sprite), operação de
interface (confirmar um campo, clicar na área do jogo) e qualquer coisa que a criança testa
imediatamente no próprio jogo dela (as setas moverem a nave, a borda segurar) **não ganham cena**.
Gastar cena com isso é o que produziu o excesso de seções do v6.


## 3. Entrega da análise por aula

Um arquivo markdown por aula, em `aulas/{curso}-{aula}.md`, com esta estrutura exata:

```markdown
# {Curso} · {Aula} · {Título proposto}

## Resumo
- Estado de entrada: {o que o projeto da criança já tem quando a aula começa}
- Vitória do dia: {o que fica novo na tela dela}
- Seções hoje: {N} · Seções propostas: {M}
- Clipes hoje: {N} · Clipes propostos: {M}

## Triagem dos conceitos
| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
(uma linha por conceito, incluindo os que NÃO ganham nada, com a justificativa)

## Diagnóstico do desenho atual
(o que está errado hoje, item a item, com a seção citada pelo título)

## Proposta final

### Seção 1. {título voltado para a criança}
- **Intenção:** apresentação | conceito | construção | dor | entrega | fechamento
- **Por que existe:** {uma frase}
- **Conclui quando:** {critério}
- **Blocos:**
  1. `{tipo}` — {conteúdo integral ou resumo fiel do que o bloco traz}
  2. ...

(repetir para todas as seções)

## Experiências e demonstrações desta aula
Para cada uma:
- **Cena:** `{id}` — {título}
- **Situação:** já existe e serve | já existe e precisa de ajuste | precisa ser criada
- **Se precisa de ajuste:** qual ajuste, e por quê
- **Se é nova:** especificação completa (ver seção 9)
- **Elenco/cenário:** {cast e cenario a usar}
- **Metas cobradas nesta aula:** {ids das metas}

## Vídeos
| Chave | O que mostra | Origem | Duração alvo | Reaproveita gravação? |

## Continuidade
- O que esta aula assume da anterior
- O que esta aula entrega para a seguinte
- Valores canônicos que saem daqui
```


A revisão pode conservar seções já corretas. Registrar também as falas do Zappy, inclusive a abertura de quiz sem vídeo, e as diferenças justificadas em relação ao formato de referência. Conferir a proposta com o gerador, manifesto, roteiro e caderno.

## 4. Quando uma cena nova for necessária

Quando propor uma cena que não existe, entregue:

- **Id sugerido** (kebab-case, em inglês, no padrão do catálogo atual)
- **Título** visível para a criança, em português
- **O conceito abstrato** que ela torna concreto, em uma frase
- **Tipo:** experimentação; se for apenas processo a observar, use um vídeo em vez de criar cena
- **O que a criança manipula** (os controles exatos, com faixas de valor quando houver)
- **Como o palco começa**
- **Metas** (id, rótulo que aparece quando cai, pedido que a faixa mostra)
- **Pistas**, uma por vez, em ordem crescente de entrega
- **Palpite, se houver:** qual crença útil ele testa, pergunta conceitual e alternativas; a
  criança pode manipular mesmo sem responder
- **Pergunta final, se houver:** qual interpretação nova ela pede e por que não repete o palpite
- **Frase de sucesso**
- **Vídeo de apoio:** tarefa concreta, explicação curta necessária e ações suficientes para
  executar todos os testes, sem fazer a experiência pela criança nem antecipar os resultados
- **Quais outros cursos e aulas também usariam essa cena**, porque cena que serve um lugar só é cara


## 5. Referências por tarefa

| Preciso fazer | Consultar |
| --- | --- |
| Saber a regra pedagógica e quando adaptá-la | [Diretrizes Pedagógicas](DIRETRIZES-PEDAGOGICAS.md) |
| Escrever a fala e preparar a gravação | [ESPEC-ROTEIRO](ESPEC-ROTEIRO.md) |
| Configurar blocos, chaves, seções e conclusão | [ESPEC-MANIFESTO](ESPEC-MANIFESTO.md) |
| Escolher uma experiência que já existe | `CATALOGO-CENAS.json`, conferindo o código |
| Conferir interface e nomes dos blocos | `REFERENCIA-PLATAFORMA.md`, `REFERENCIA-BLOCOS-JOGO-2D.json` e código |
| Planejar a progressão técnica dos jogos | [Orientação dos cursos de jogos](../orientacao-cursos-jogos.md) |
| Conferir e entregar | Checklist das Diretrizes e testes do curso em `qa/` |
