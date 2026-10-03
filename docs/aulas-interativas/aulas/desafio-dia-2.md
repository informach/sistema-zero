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
| Variável | Sim | Na construção do estado | Criar temChave falso e mudar para verdadeiro dentro do encontro | Explicação e montagem juntas na seção 2 | A informação precisa permanecer depois da coleta |
| Falso e verdadeiro | Sim | Ligado à chave | Falso significa sem a chave; verdadeiro, com ela | Ao escolher o valor inicial | Evitar confundir falso com erro do aluno |
| Evento | Sim, mas próximo da ação | No encontro real | Contato personagem/chave dispara ações | Explicar antes de pegar o bloco, na seção 2 | Ligar acontecimento a resposta |
| Retirar um sprite | Não | No jogo | A chave desaparece uma vez por partida | Depois de montar | O bloco tem efeito visível imediato |
| Guardar e mostrar | Sim | Distinguir ações no programa | temChave guarda a coleta; aviso muda o texto visível | Na mesma montagem | A mensagem sozinha não prova que a memória foi alterada |

Não forçar a cena genérica de variável, que ensina somar pontos e mostrar um placar, neste problema de memória booleana. A vitória visível é a coleta com aviso; o uso de temChave para decidir uma resposta será observado na porta do Dia 3. Explicitar essa distinção na autoria e conferir a compreensão no ensaio, sem alegar que o aviso é um medidor da variável.

## Diagnóstico do desenho atual

O review de 03/10 encontrou conceitos na seção somente de vídeo, separados do momento da montagem. A primeira seção agora mostra somente o problema; variável e evento entram junto dos blocos que lhes dão uso.

A definição de evento como “uma instrução” foi corrigida: o encontro é o acontecimento; o bloco programa a resposta. Falso ganhou significado concreto. O aviso foi distinguido da memória.

A verificação aceitava temChave verdadeiro em outro encontro e não cobrava a mensagem. Os casos foram reproduzidos em testes antes da correção.

## Proposta final

### Seção 1. Encostar ainda não é pegar

- **Intenção:** dor observável, cadastrada como `explanation`.
- **Por que existe:** reconhecer a regra que falta antes da ferramenta.
- **Conclui quando:** vídeo assistido conforme o critério da plataforma.
- **Blocos:** `video-d2-contexto`, `ponte-d2-contexto`. Mostrar o personagem atravessando a chave e se afastando sem recolhê-la. Sem fichas, definição abstrata ou demonstração da solução.

**Ponte do Zappy na página (não gravar):** Você viu que o personagem atravessa a chave sem recolhê-la. Clique em Próxima seção para continuar.

### Seção 2. Guarde que a chave foi encontrada

- **Intenção:** construção e entrega (`delivery`).
- **Por que existe:** montar a resposta ao encontro e guardar a coleta.
- **Conclui quando:** vídeo, aprovação dos critérios e envio confirmado do projeto.
- **Blocos:** `video-d2-programar`, `ponte-d2-programar`, Estúdio `projeto` com a cadeia existente.

**Ponte do Zappy na página (não gravar):** Agora programe a coleta da chave no seu jogo. Teste se ela sai do chão e se o aviso muda. Use Verificar esta etapa antes de enviar o projeto.

Montar na ordem: criar temChave falso em Ao iniciar após os controles; encontro personagem/chave em Quando acontecer; dentro dele, destruir chave, alterar temChave para verdadeiro e alterar aviso com texto. Caminhos, encaixes, valores e substituição do número inicial estão no roteiro.

Testar coleta, mudança do aviso, passagem pelo mesmo lugar e reinício por Atualizar. Conferir **Verificar esta etapa → Objetivo da etapa cumprido! → Salvo → Enviar para o professor → Enviar → Concluir aula**.

## Experiências e demonstrações desta aula

Não há cena paralela. A demonstração do problema usa a retomada real do Dia 1. A concretização ocorre no projeto que a criança monta. A verificação estrutural exige declaração falsa e ações dentro do encontro com a chave; o texto do aviso pode usar palavras próprias. O teste jogado confere se a mensagem faz sentido.

## Vídeos

| Chave | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
| --- | --- | --- | --- | --- |
| `video-d2-contexto` | O encontro ainda não recolhe a chave | Retomada do Dia 1 | 20 a 30 s | Regravar |
| `video-d2-programar` | Conceitos no momento do uso, montagem, teste e envio | Roteiro atual | Cerca de 5 min, com tempo para os encaixes | Regravar |

## Continuidade

Preservar as seções, vídeos e chave do Estúdio. Manter a aposentadoria histórica de `video-d2-teste`.

A aula entrega movimento, borda e coleta; não programa a porta. Valores: temChave começa falso e vira verdadeiro na coleta; aviso recebe a mensagem; ganhou continua falso. O Dia 3 retoma prioritariamente o envio da criança. Não substituir mídia existente por plannedVideo sem reconciliação no admin.
