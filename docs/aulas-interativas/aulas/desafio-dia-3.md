# A Chave do Farol · Dia 3 · A luz do farol

## Resumo

- Estado de entrada: projeto enviado no Dia 2, com movimento, borda e coleta.
- Vitória do dia: a porta confere a chave; sem ela, mostra o motivo; com ela, acende a luz e aciona a chegada do barco. A criança aprende a publicar seu jogo.
- Seções na entrada deste review: 3 · Seções finais: 3.
- Clipes na entrada deste review: 3 · Clipes finais: 3.

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
| --- | --- | --- | --- | --- | --- |
| Condição | Sim | Na experiência da porta | Testar sem chave e com chave | Explicação e experiência juntas, antes da montagem | Comparar duas respostas para a mesma pergunta |
| Se, então e senão | Sim | No projeto | Consultar temChave e montar as duas respostas | Depois da experiência | Conectar a relação observada aos blocos |
| Persistência da coleta | Sim | No percurso até o farol | Pegar a chave, afastar-se do lugar e chegar ao farol | Teste final | A informação continua guardada depois que a chave sai do chão |
| Ativar consequência preparada | Não exige cena | No barco chegando | Alterar ganhou para verdadeiro | Dentro de então | Reconhecer o que foi preparado e o que a criança programa |
| Troca de imagem e avisos | Não | No jogo | Conferir luz, mensagem e barco nos dois caminhos | Depois da montagem | Ver se cada resposta ficou no ramo certo |
| Publicar | Interface ligada a uma entrega | No Mural | Fluxo mínimo até confirmação | Após enviar ao professor | Disponibilizar a criação sem refazer o projeto |

## Diagnóstico do desenho atual

O review reproduziu aprovação de uma decisão sem aviso em então ou sem ramo senão. Os critérios agora vinculam a condição ao encontro personagem/farol e verificam as ações no ramo correspondente. As mensagens são exigidas como texto, sem cobrar cópia literal da frase.

O encaixe do texto de vitória estava implícito na narração. Agora são nomeados ramo então, campo de aviso e substituição do número inicial. Os testes finais incluem os dois avisos e a permanência de temChave depois de se afastar da coleta.

A fala de ponte do Zappy repetia os comandos da experiência. Agora conecta a coleta à decisão; a instrução dentro da experiência conserva os botões e a ordem dos testes.

## Proposta final

### Seção 1. O que a porta precisa?

- **Intenção:** exploração (`exploration`).
- **Por que existe:** concretizar a relação da condição antes de programar.
- **Conclui quando:** vídeo e as duas tentativas reais na experiência.
- **Blocos:** `video-d3-condicao`, `ponte-d3-condicao`, `experiencia-porta`.

Abrir com o estado atual: a chave já pode ser recolhida, mas a porta ainda não responde. Explicar condição brevemente. Orientar os testes sem realizá-los pela criança.

### Seção 2. Faça a porta conferir a chave

- **Intenção:** construção e entrega (`delivery`).
- **Por que existe:** programar a relação observada no jogo da criança.
- **Conclui quando:** vídeo, critérios aprovados e envio confirmado.
- **Blocos:** `video-d3-decisao`, `ponte-d3-decisao`, Estúdio `projeto`.

Criar evento separado personagem/farol. Dentro dele, Se valor da variável temChave. Em então: ganhou verdadeiro, imagem farol-aceso e aviso de chegada. Usar **+ senão**, não + senão se; em senão, aviso de falta da chave.

Testar partidas reiniciadas por Atualizar: sem chave e com chave. Conferir mensagens, imagem e barco. Terminar em **Verificar esta etapa → Objetivo da etapa cumprido! → Salvo → Enviar para o professor → Enviar → Próxima seção**.

### Seção 3. Publique seu jogo

- **Intenção:** encerramento com publicação (`closing`).
- **Por que existe:** mostrar o jogo a outras pessoas.
- **Conclui quando:** vídeo; a publicação é a tarefa ensinada, sem requisito técnico novo de publicação.
- **Blocos:** `video-d3-fecho`, `ajuda-publicar` e o mesmo `projeto` pela workspaceKey.

**Compartilhar → manter título/resumo → Gerar capa → conferir → Publicar → Seu jogo está no Mural! → Fechar → Concluir aula**. O envio anterior libera Compartilhar. Personalizar, copiar link e resolver problemas ficam no tutorial direto `plataforma-publicar-no-mural`, com retorno à aula.

## Experiências e demonstrações desta aula

- **Cena:** `lighthouse-key`, O que a porta precisa?
- **Situação:** existente e pertinente à condição; sem cena nova.
- **Elenco/cenário:** farol, personagem e chave, com `cenario: farol`.
- **Metas:** `locked-without-key` e `opened-with-key`.
- **Instrução:** Testar a porta sem chave; Levar a chave; Testar a porta outra vez.
- **Observação:** trocar o estado da chave sozinho não conclui. Sem palpite obrigatório ou pergunta final redundante; semPerguntaFinal fica no bloco interativo.

## Vídeos

| Chave | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
| --- | --- | --- | --- | --- |
| `video-d3-condicao` | Contexto e comandos, sem revelar respostas | Cena existente | 35 a 45 s | Regravar |
| `video-d3-decisao` | Montagem dos ramos, testes e envio | Roteiro atual | 5 a 6 min, sem acelerar encaixes | Regravar |
| `video-d3-fecho` | Publicar e esperar confirmação | Mesmo projeto enviado | 45 a 60 s, incluindo espera | Regravar |

## Continuidade

Preservar `condicao`, `decisao`, `fecho`, chave `projeto` e cadeia. Só o Estúdio do Dia 3 tem showcase habilitado, com título e resumo do Farol. Não criar uma cópia para publicar.

Valores: temChave é consultado, ganhou vira verdadeiro apenas na resposta com chave, farol recebe farol-aceso e aviso muda conforme o ramo. O barco preparado não é atribuído à autoria da criança.

A oferta vigente já inclui Mural completo durante os 30 dias e modo visitante depois; o review não altera direitos ou prazos. A publicação não bloqueia o certificado por expiração do Mural. Conferir conta elegível na gravação e reconciliar mídia/progresso antes de aplicar no admin.
