# Especificação do roteiro de gravação

> Contrato para escrever o roteiro de cada aula redesenhada: **o texto que a pessoa lê na frente do
> microfone**, com o que está na tela em cada momento.
>
> Destilado de `cursos/MOLDE-ROTEIRO-AULA.md`, de `cursos/REGRA-COMO-CHAMAR-O-ALUNO.md` e das
> decisões de produto de 19 e 20/09/2026. Onde o molde antigo diverge, esta especificação vence, e
> as divergências estão marcadas.

## 1. O que é, e o que não é

O manifesto guarda um **briefing** de cada clipe: título, o que mostrar, uma fala de referência e a
duração alvo. Isso orienta, mas não é o que se lê no microfone.

O roteiro é o texto final. Cada clipe do manifesto vira um trecho de roteiro feito de **pares**,
**sempre nesta ordem e sempre 1 para 1**:

- `**Na tela:**` é nota de produção, escrita para quem grava. Imperativo, com o caminho completo da
  paleta e os valores concretos.
- `**Narração:**` é a fala literal, entre aspas retas, tratando quem assiste por "você". Negrito
  marca a palavra que o narrador enfatiza.

Confira a paridade contando os dois antes de entregar.

### Os dois ficam em parágrafos separados

Quem grava lê o roteiro de relance, com o microfone aberto. Se a nota de produção e a fala correrem
no mesmo parágrafo, o olho não acha onde a fala começa e o narrador lê a instrução em voz alta.

Por isso o par se escreve assim, **com linha em branco entre os dois** e a fala em citação:

```markdown
**Na tela:** enquadrar só a caixa do **Ao iniciar**, vazia.

**Narração:**
> "A primeira se chama **Ao iniciar**. Tudo o que estiver dentro dela acontece uma vez só, bem no
> comecinho, quando o jogo liga."
```

O `>` marca a fala linha a linha, então ela fica destacada tanto no arquivo cru quanto na tela. A
nota de produção fica em texto normal, sem citação. Entre um par e o próximo, uma linha em branco.

### Fecho quando a criação acontece em outra ferramenta

Nas seções de **O Jogo do Meu Jeito** com `externalTool` e conclusão apenas pelo vídeo, o último
clipe termina com uma pausa para a pessoa trabalhar e, ao voltar, uma **autoconferência visual**.
Mostrar o resultado de referência, pedir que ela olhe o próprio desenho ou jogo e nomear um ou dois
sinais observáveis. O sinal deve ser funcional ou de legibilidade; formato, cores e detalhes que a
aula deixou livres continuam livres.

Escrever a pergunta no par `Na tela` / `Narração` do roteiro. Se houver um erro comum, dar um
caminho de correção pequeno. O vídeo visto registra o avanço na aula, mas a plataforma não inspeciona
automaticamente o trabalho feito no Pinta ou no Estúdio completo. A entrega pela galeria, quando
pedida, é a evidência que o professor pode abrir depois.

## 2. A regra número um: caminho completo, sempre

**Nunca pressuponha que a pessoa sabe onde o bloco está.** Toda vez que a narração mandar pegar um
bloco, ela diz o caminho inteiro, de uma vez:

> "Na categoria **Jogo 2D**, abre **Tempo**, e dentro dela **Quadros e intervalos**. Pega o bloco
> **A cada quadro do jogo**."

A paleta de hoje tem quatro degraus: categoria, subcategoria, seção e bloco. A fonte de verdade é
`REFERENCIA-BLOCOS-JOGO-2D.json` nesta pasta, com os 285 tipos extraídos do código. **Não escreva
caminho de memória, consulte.** Cada tipo traz:

| Chave | O que é, e para que serve na fala |
|---|---|
| `familia` e `secao` | os dois degraus do meio do caminho |
| `rotulo` | a primeira linha do bloco, literal |
| `linhas` | **todas** as linhas dele. Trinta blocos têm mais de uma, e a segunda costuma ser o campo que a aula ensina: o `Para cada sprite do grupo … que colidir com o sprite …` traz `chamar o sprite de …` na linha 2 |
| `campos` | cada campo com o **padrão de fábrica**, que é o que sustenta a fala em todo campo, inclusive nos que não mudam |
| `opcoes` | a lista do menu **na ordem da tela**, para dizer a posição ("o quinto da lista, a barra de espaço") em vez de só o desenho |

Onde `opcoes` é nulo, o menu não tem lista fixa no código: a fala então avisa que o item não vem
escolhido e manda procurar pelo nome, nunca inventa uma posição.

Regras que vêm junto:

- **Pegar bloco é gesto ininterrupto.** O caminho completo sai de uma vez, sem explicação no meio.
  O conceito vem antes ou depois do gesto, nunca durante.
- **Rótulo literal do bloco, nunca parafraseado.**
- **Âncora em todo encaixe.** Nunca "dentro do Ao iniciar"; sempre "dentro do Ao iniciar, logo
  acima do Criar dinossauro". Quando o lugar é entre dois blocos, nomeie os dois. "Logo abaixo de
  X" sozinho é inserção disfarçada de anexo, e a pessoa encaixa no fim por instinto.
- **Fala em todo campo, inclusive nos que não mudam.** "O tamanho já vem 44, deixa assim."
- **Campo de valor não tem buraco vazio.** Bloco de valor se arrasta por cima do que já está ali.
- **Menu de escolha nunca vem pronto no item certo.** Diga a posição na lista ("o terceiro da
  lista"), não só o desenho. Obrigatório quando o erro é silencioso.
- **Mover bloco é ARRASTAR, nunca copiar**, com a consequência dita: dois jogos rodando ao mesmo
  tempo.

## 3. Não existe botão de play

"Roda o jogo" é instrução proibida: manda procurar um botão que não existe. As três ações reais:

- **"olha o seu jogo"** para efeito automático
- **"clica na área do jogo e aperta X"** para efeito que depende de ação
- **"recarrega a página"** para voltar ao começo

⚠️ **Divergência do molde antigo, e ela importa.** O molde traz "olha o seu jogo **aí embaixo**", e
o campo "Ambiente real: vídeo em cima, estúdio embaixo". Isso nasceu no layout antigo. **Hoje a
ferramenta fica ao lado acima de 1080 px de largura e embaixo abaixo disso**, então qualquer fala
que diga onde ela está fica errada em metade dos aparelhos. Tire a direção: "olha o seu jogo".

Posição **dentro** do Estúdio ou do Pinta é estável e pode ser dita: "na coluna da esquerda, onde
ficam os bloquinhos", "a Prévia, na coluna da direita".

## 4. Como falar

- **Linguagem falada, não escrita.** Proibido "o objetivo de hoje é este". Vira "no fim da aula de
  hoje o seu dino vai saltar toda vez que você mandar".
- **Analogias do cotidiano, não de adulto.** O livrinho de folhear para o quadro, a janela do carro
  para o cenário que rola, o termômetro para os negativos, o saquinho de papelzinho para o sorteio,
  a lousa mágica para limpar a tela, "se estiver chovendo, leva o guarda-chuva" para o bloco Se.
- **Nunca chame quem assiste de criança.** A turma vai dos 8 aos 15 e o pré-adolescente recusa o
  rótulo. Use **criador**, que é a palavra da casa: "os outros criadores", "alguém daqui", "a
  Comunidade". Para o responsável, "o seu filho".
- **Linguagem literal.** Muita gente da turma lê ao pé da letra: nada de idiomatismo nem metáfora
  sem marca. Comparação anunciada ("é tipo", "é como") pode e funciona bem.
- **"o jogador"** para a ação de jogar, **"você"** para falar com quem assiste.
- **Travessão zero.** Exclamação pontual, 3 a 5 por aula, só nos picos.
- **Sem vocabulário de outro jogo.** Nada de nave e asteroide num curso de dino.
- **Acentuação pt-BR correta.**
- **Vigiar o vício de sublinhar tudo.** "Guarda essa" e "os criadores usam o tempo todo" perdem
  força quando aparecem em toda aula.

## 5. O vocabulário travado

Use os termos canônicos: **relógio** (timer), **faxina** (culling), **medidor**, **camadas**,
**estados do jogo**, **sorteio**, **apelido**, **embrulhar no Se**, **quadros de invencibilidade**,
**HUD**, **área de colisão**, **caixa de colisão**, **retorno pro jogador**.

⚠️ Rótulos que mudaram e que o material antigo ainda usa: `Ir para a tela` hoje é **`Mudar o estado
do jogo para`**; `a tela atual é` hoje é **`o estado do jogo é __ ?`**; `Tocar som de pulo` **não
existe mais** e virou **`Tocar efeito`** com a opção `pulo`.

As áreas do projeto se chamam **Ao iniciar**, **Quando acontecer**, **Enquanto estiver rodando** e
**Meus moldes**.

## 6. Estrutura do arquivo

Um arquivo por aula, em `aulas/{slug}.roteiro.md`, ao lado do relatório e do manifesto.

```markdown
# Roteiro de gravação · {Curso} · {Aula} · {Título}

## Especificações
- **Formato:** gravação da tela do Estúdio com narração por cima
- **Duração:** {faixa}, narração pura de cerca de N palavras a **137 palavras por minuto**, que é o
  ritmo real medido em gravação
- **Calibração:** o que a pessoa já traz e o que é novo de verdade nesta aula
- **Conceitos nomeados:** os termos do dicionário que esta aula batiza
- **Dor desta aula:** o problema que roda antes da ferramenta, e se ele reproduz de verdade
- **Vitória do dia:** o que fica novo na tela quando a aula termina
- **Valores:** padrões de fábrica, o que muda e o que fica
- **Campos livres:** os que ficam a gosto, com o canônico e a faixa oferecida
- **Nota de produção:** o que conferir na gravação, o que precisa de zoom
- **O que NÃO entra, e por quê**

## Seção {N}. {Título da seção, igual ao do manifesto}

### Clipe `{chave do bloco}` · {Título do vídeo}
**Duração alvo:** {faixa} · **Palavras:** {contagem}

**Na tela:** {…}

**Narração:**
> "{…}"

**Na tela:** {…}

**Narração:**
> "{…}"
```

Só as seções que têm clipe entram. Seção sem vídeo não vira trecho de roteiro.

## 7. Padrões de narração que funcionam

**A abertura da aula anuncia os passos numerados e emenda no primeiro**, sem meta-aviso:

> "A aula de hoje é curtinha e tem quatro passos. Um: montar o medidor. Dois: provocar o problema,
> pra ele aparecer rápido. Três: a faxina, que é o conserto. E quatro: testar dois ritmos e devolver
> o relógio. Vamos pro primeiro."

**Cada parte ancora onde estamos.** "Passo 2 feito. Bora pro terceiro."

**O fecho recapitula os passos vencidos, nomeia as palavras novas e engancha a aula seguinte.**

⚠️ **Não existe mais exercício de "pausa e tenta".** Decisão de 01/08/2026: nenhuma aula manda
descobrir sozinho, montar sozinho ou pausar para resolver. Sumiram "descubra sozinho", "monte você
mesmo", "é a sua vez" e a linha de reticências separando desafio de gabarito. Quem exercita são os
desafios da Comunidade.

O que continua, porque é conteúdo e não cobrança: **demonstração por extremos**, levando o número
para os dois lados com a narração observando logo depois de cada troca ("põe 2 e olha a tela… agora
põe 9"), um extremo por vez.

## 8. De onde vem a matéria-prima

Para cada aula, na ordem:

1. **`aulas/{slug}.manifesto.json`** — a estrutura final. Cada bloco com `plannedVideo` é um clipe a
   roteirizar, e o texto dele traz título, o que mostrar, a fala de referência, a duração alvo e a
   origem.
2. **`aulas/{slug}.md`** — o relatório, com a intenção de cada seção e o porquê de cada decisão.
3. **O roteiro gravado original**, em `cursos/{curso}/roteiros/` ou nas entregas de vídeo do
   Desafio. **Reaproveite a fala que funciona**: analogias boas, frases que já estão gravadas e
   continuam certas. O campo `Origem:` de cada `plannedVideo` diz qual trecho é o de partida.
4. **`REFERENCIA-BLOCOS-JOGO-2D.json`** — para todo caminho e todo rótulo.

⚠️ **Onde a fala original contradiz a plataforma de hoje, a plataforma vence.** Boa parte dos
clipes tem, no campo `Origem:`, a nota do que precisa ser corrigido na fala herdada.

## 9. Conferência antes de entregar

- `Na tela` e `Narração` pareados 1 para 1, contados.
- Linha em branco entre a nota de produção e a fala, e a fala inteira em citação (`>`).
- Todo bloco citado com caminho completo de quatro degraus, conferido no JSON de referência.
- Todo encaixe com âncora nomeando o vizinho.
- Nenhuma fala dizendo onde a ferramenta está.
- Nenhum "roda o jogo".
- Nenhuma ocorrência da palavra criança falando de quem assiste.
- Travessão zero.
- A contagem de palavras bate com a duração alvo a 137 palavras por minuto.

## 10. O trio da aula anda junto

O roteiro é um dos **três arquivos** da aula, ao lado da proposta (`aulas/{slug}.md`) e do manifesto
(`aulas/{slug}.manifesto.json`). **Mudou num, muda nos três.** Tirar um bloco do manifesto sem tirar
o clipe do roteiro deixa a gravação com um trecho órfão; corrigir a fala sem corrigir a proposta faz
o próximo leitor reabrir a decisão já tomada. A lista do que obriga varredura está na seção 9 de
`ESPEC-MANIFESTO.md`.
