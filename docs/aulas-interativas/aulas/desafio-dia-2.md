# A Chave do Farol · Dia 2 · A chave muda a aventura

## Resumo

- Estado de entrada: projeto enviado no Dia 1, com quatro direções e bordas. A retomada preparada só serve quando não há envio anterior.
- Vitória do dia: a chave sai do chão, temChave guarda verdadeiro e uma mensagem informa a coleta.
- Seções na entrada deste review: 2 · Seções finais: 2.
- Clipes na entrada deste review: 2 · Clipes finais: 2.

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
| --- | --- | --- | --- | --- | --- |
| Falta da coleta | Não | No próprio jogo | Personagem passa pela chave e se afasta; ela continua no chão | Antes da montagem, seção 1 | Problema real, sem simular defeito |
| Variável | Sim | No mostrador da experiência e depois na construção | Comparar a coleta com a regra de guardar desligada e ligada | Antes da montagem | Separar aparência, aviso e informação guardada |
| Falso e verdadeiro | Sim | No mostrador temChave | Falso: coleta ainda não guardada; verdadeiro: guardada | Na experiência e no valor inicial | Evitar confundir falso com erro do aluno |
| Evento | Sim, mas próximo da ação | No encontro real | Contato personagem/chave dispara ações | Explicar antes de pegar o bloco, na seção 2 | Ligar acontecimento a resposta |
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
- **Blocos:** `video-d2-contexto`, `ponte-d2-contexto`, novo `experiencia-memoria`. A gravação aponta os controles sem executar a experiência pela criança.

**Ponte do Zappy na página (não gravar):** Compare o que some da tela com o que fica guardado no jogo. A experiência mostra a informação temChave durante cada tentativa.

### Seção 2. Guarde que a chave foi encontrada

- **Intenção:** construção e entrega (`delivery`).
- **Por que existe:** montar a resposta ao encontro e guardar a coleta.
- **Conclui quando:** vídeo, aprovação dos critérios e envio confirmado do projeto.
- **Blocos:** `video-d2-programar`, `ponte-d2-programar`, Estúdio `projeto` com a cadeia existente.

**Ponte do Zappy na página (não gravar):** Programe a coleta: tirar a chave do chão, guardar a informação e mostrar o aviso. Teste seu jogo e use Verificar esta etapa antes de enviar.

Montar na ordem: criar temChave falso em Ao iniciar após os controles; encontro personagem/chave em Quando acontecer; dentro dele, destruir chave, alterar temChave para verdadeiro e alterar aviso com texto. Caminhos, encaixes, valores e substituição do número inicial estão no roteiro.

Testar coleta, mudança do aviso, passagem pelo mesmo lugar e reinício por Atualizar. Depois de funcionar, oferecer a mudança opcional só do texto de aviso; conservar o sentido de coleta e destino. Quem mantém o exemplo usa Atualizar antes de coletar novamente. Conferir **Verificar esta etapa → Objetivo da etapa cumprido! → Salvo → Enviar para o professor → Enviar → Concluir aula**.

## Experiências e demonstrações desta aula

Cena `collect-and-remember`, cenário Farol: Guardar a coleta, Encostar na chave, Afastar e Recomeçar a partida. Quatro metas: coletar sem memória, coletar com memória, conservar a informação ao afastar e reiniciar depois da coleta guardada. O reinício mantém a regra escolhida e as descobertas, mas recoloca a chave e temChave falso. O controle da regra fica indisponível depois da coleta, com motivo visível, até reiniciar. Sem palpite ou pergunta final obrigatórios.

A verificação da construção é cumulativa: conserva os três critérios de movimento e confere cinco da coleta. O texto do aviso pode usar palavras próprias; o teste jogado confere seu sentido.

## Vídeos

| Chave | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
| --- | --- | --- | --- | --- |
| `video-d2-contexto` | Contexto e comandos da comparação de memória | Retomada e nova experiência | 50 a 75 s | Regravar |
| `video-d2-programar` | Retomada da experiência, montagem, aviso próprio, teste e envio | Roteiro revisado | 5 a 6 min, com tempo para os encaixes | Regravar |

## Continuidade

Preservar as seções, vídeos e chave do Estúdio. Manter a aposentadoria histórica de `video-d2-teste`.

A aula entrega movimento, borda e coleta; não programa a porta. Valores: temChave começa falso e vira verdadeiro na coleta; aviso recebe a mensagem; ganhou continua falso. O Dia 3 retoma prioritariamente o envio da criança. Não substituir mídia existente por plannedVideo sem reconciliação no admin.
