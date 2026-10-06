# A Chave do Farol · Dia 2 · A chave muda a aventura

## Resumo

- Estado de entrada: projeto enviado no Dia 1, com quatro direções e bordas. A retomada preparada só serve quando não há envio anterior.
- Vitória do dia: a chave sai do chão, temChave guarda verdadeiro e uma mensagem informa a coleta.
- Seções na entrada deste review: 2 · Seções finais: 4 (05/10/2026: uma ideia por seção).
- Clipes na entrada deste review: 2 · Clipes finais: 4.

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
| --- | --- | --- | --- | --- | --- |
| Falta da coleta | Não | No próprio jogo | Personagem passa pela chave e se afasta; ela continua no chão | Antes da montagem, seção 1 | Problema real, sem simular defeito |
| Variável | Sim | No mostrador da experiência e depois na construção | Comparar a coleta com a regra de guardar desligada e ligada | Antes da montagem | Separar aparência, aviso e informação guardada |
| Falso e verdadeiro | Sim | No mostrador temChave | Falso: coleta ainda não guardada; verdadeiro: guardada | Na experiência e no valor inicial | Evitar confundir falso com erro do aluno |
| Evento | Sim, mas próximo da ação | No encontro real | Contato personagem/chave dispara ações | Explicar fazendo, na experiência da seção 1; lembrar na seção 2 antes de pegar o bloco | Ligar acontecimento a resposta |
| Retirar um sprite | Não | No jogo | A chave desaparece uma vez por partida | Depois de montar | O bloco tem efeito visível imediato |
| Guardar e mostrar | Sim | Mesmo sumiço e aviso, memória diferente | Comparar as duas regras, afastar e reiniciar | Experiência; retomada na construção | A mensagem sozinha não prova que a memória foi alterada |

A nova cena `collect-and-remember` concretiza a memória booleana deste jogo. A retirada da chave e o aviso são iguais nos dois modos; só a informação guardada muda. A cena de contagem de Cadê Todo Mundo continua específica à contagem. O uso da memória para decidir a resposta será retomado no Dia 3.

## Diagnóstico do desenho atual

O review de 03/10 encontrou conceitos na seção somente de vídeo, separados do momento da montagem. A revisão de 04/10 acrescenta ação nessa primeira seção: comparar, afastar e reiniciar, acompanhando temChave. A definição de variável aparece no mostrador; evento é explicado ao montar o encontro.

A definição de evento como “uma instrução” foi corrigida: o encontro é o acontecimento; o bloco programa a resposta. Falso ganhou significado concreto. O aviso foi distinguido da memória.

A verificação aceitava temChave verdadeiro em outro encontro e não cobrava a mensagem. Os casos foram reproduzidos em testes antes da correção.

## Proposta final

### Seção 1. O jogo guardou a chave?

- **Intenção:** exploração (`exploration`).
- **Por que existe:** distinguir recolher, avisar e guardar antes de programar.
- **Conclui quando:** vídeo e quatro descobertas reais na experiência.
- **Blocos:** `video-d2-contexto`, `ponte-d2-contexto`, novo `experiencia-memoria`. O vídeo é uma demonstração: o narrador faz cada gesto na primeira pessoa e explica; só no fim passa a vez, e a pessoa repete os testes na experiência, que cobra as metas.

**Ponte do Zappy na página (não gravar):** Agora compare o que some da tela com o que fica guardado em temChave.

### Seção 2. Recolha a chave

- **Intenção:** aplicação (`application`), com verificação e sem envio.
- **Por que existe:** programar o evento (o encontro) e a primeira resposta visível: a chave sai do chão.
- **Conclui quando:** vídeo e aprovação dos três critérios de movimento mais a retirada dentro do encontro.
- **Blocos:** `video-d2-recolher`, `ponte-d2-recolher`; Estúdio pela `workspaceKey: projeto`.

**Ponte do Zappy na página (não gravar):** Programe o encontro com a chave e faça a chave sair do chão. Teste e clique em Verificar esta etapa.

O projeto do Dia 1 ainda não tem a área **Quando acontecer**: o Estúdio só cria as áreas que têm blocos. A fala ensina a pegá-la em **Áreas do projeto** e soltar num espaço vazio, e só depois o encontro vai para dentro dela. O critério `recolher` exige o encontro nessa área.

### Seção 3. Guarde que a chave foi encontrada

- **Intenção:** aplicação (`application`), com verificação e sem envio.
- **Por que existe:** aplicar a memória vista na experiência: temChave começa em falso e vira verdadeiro no encontro.
- **Conclui quando:** vídeo e aprovação de sete critérios: movimento, retirada, temChave em falso e verdadeiro no encontro, depois da retirada.
- **Blocos:** `video-d2-guardar`, `ponte-d2-guardar`; Estúdio pela `workspaceKey: projeto`.

**Ponte do Zappy na página (não gravar):** Crie temChave começando em falso e mude para verdadeiro no encontro com a chave. Depois clique em Verificar esta etapa.

A mudança de temChave não aparece no jogo. A fala diz isso com honestidade: quem usa a informação é a porta, no Dia 3, e por enquanto quem confere é a verificação.

### Seção 4. Avise quem está jogando

- **Intenção:** construção e entrega (`delivery`).
- **Por que existe:** mostrar a mensagem da coleta, testar a coleta inteira e entregar o dia.
- **Conclui quando:** vídeo, aprovação dos oito critérios e envio confirmado do projeto.
- **Blocos:** `video-d2-programar`, `ponte-d2-programar` e o Estúdio `projeto` com a cadeia existente.

**Ponte do Zappy na página (não gravar):** Mostre um aviso quando a chave for encontrada. Teste a coleta e clique em Verificar esta etapa antes de enviar para o professor.

Testar coleta, mudança do aviso e reinício por Atualizar. O texto do aviso com as palavras da criança fica para o mexa e veja do Dia 3. Conferir **Verificar esta etapa → Objetivo da etapa cumprido! → Salvo → Enviar para o professor → Enviar → Concluir aula**.

## Experiências e demonstrações desta aula

Cena `collect-and-remember`, cenário Farol: Guardar a coleta, Encostar na chave, Afastar e Recomeçar a partida. Quatro metas: coletar sem memória, coletar com memória, conservar a informação ao afastar e reiniciar depois da coleta guardada. O reinício mantém a regra escolhida e as descobertas, mas recoloca a chave e temChave falso. O controle da regra fica indisponível depois da coleta, com motivo visível, até reiniciar. Sem palpite ou pergunta final obrigatórios.

A verificação é cumulativa em cada montagem: a seção 2 confere o movimento e a retirada; a seção 3 acrescenta temChave; a entrega confere os oito critérios. O texto do aviso pode usar palavras próprias; o teste jogado confere seu sentido.

## Vídeos

| Chave | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
| --- | --- | --- | --- | --- |
| `video-d2-contexto` | Demonstração explicada da memória | Retomada e nova experiência | 80 a 100 s | Regravar |
| `video-d2-recolher` | Encontro com a chave, retirada, teste e verificação | Projeto do Dia 1 | 2 a 3 min | Gravar |
| `video-d2-guardar` | temChave em falso e verdadeiro no encontro, verificação | Mesmo projeto | 2 a 3 min | Gravar |
| `video-d2-programar` | Aviso, teste, aviso próprio e envio | Mesmo projeto | 2 a 3 min | Regravar |

## Continuidade

Preservar as seções `contexto` e `programar-chave` (agora a entrega do aviso), os vídeos existentes e a chave do Estúdio. As seções `recolher` e `guardar` são novas. Manter a aposentadoria histórica de `video-d2-teste`.

A aula entrega movimento, borda e coleta; não programa a porta. Valores: temChave começa falso e vira verdadeiro na coleta; aviso recebe a mensagem; ganhou continua falso. O Dia 3 retoma prioritariamente o envio da criança. Não substituir mídia existente por plannedVideo sem reconciliação no admin.
