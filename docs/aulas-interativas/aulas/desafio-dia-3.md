# A Chave do Farol · Dia 3 · A luz do farol

## Resultado e diagnóstico

A criança programa a porta para conferir `temChave`, testa as duas respostas e publica seu projeto no Mural. O Dia 2 já fornece movimento e coleta. O cenário, a arte e o movimento do barco são preparados; a autoria da criança está nas regras que conectam essas partes.

A versão anterior escondia os comandos da experiência na intenção de não antecipar resultados, omitia a verificação antes do envio e terminava apenas com uma recapitulação. A revisão dá instrução completa, preserva a descoberta e termina com a publicação real.

## Seções finais

| Seção | Vídeo | Atividade e conclusão |
| --- | --- | --- |
| O que a porta precisa? | `video-d3-condicao` | Experiência `lighthouse-key`: vídeo e duas tentativas reais. |
| Faça a porta conferir a chave | `video-d3-decisao` | Estúdio `projeto`: vídeo, critérios e envio confirmado. |
| Publique seu jogo | `video-d3-fecho` | Mesmo Estúdio, pela mesma `workspaceKey`; conclusão técnica pelo vídeo. |

## Conceito e experiência

Abrir com o estado atual: a chave já pode ser recolhida, mas a porta ainda não responde. **Condição** é uma pergunta que o jogo confere para escolher o que fazer.

Orientar **Testar a porta** sem chave, **Levar a chave** e **Testar a porta** novamente. Não clicar pela criança nem revelar os resultados antecipadamente. A cena exige ambas as tentativas; trocar a chave sozinho não conclui. Sem palpite nem pergunta final redundante (`semPerguntaFinal` no bloco interativo).

## Montagem e verificação

Criar outro evento em **Quando acontecer**, separado da coleta: encontro de `personagem` com `farol`. Dentro dele, **Se valor da variável temChave**.

- Em **então**: `ganhou = verdadeiro`, imagem do sprite `farol` para `farol-aceso` e aviso **Você acendeu o farol! Olhe o barco chegando.**
- Usar **+ senão**, não **+ senão se**. Em **senão**: aviso **A porta não abriu. Falta a chave.**

O roteiro mostra a paleta, a condição substituída, cada encaixe e os campos. `ganhou` já existe e aciona o comportamento preparado do barco. Testar sem chave e com chave em partidas reiniciadas por **Atualizar**.

Depois: **Verificar esta etapa → Objetivo da etapa cumprido! → Salvo → Enviar para o professor → Enviar → Próxima seção**. Corrigir e repetir os testes quando necessário.

## Publicação

O Estúdio do Dia 3 recebe `showcase.enabled: true`, título e resumo próprios da aventura. Os Dias 1 e 2 não recebem essa configuração. A seção `fecho` referencia o mesmo `projeto` da seção `decisao`; não criar cópia, segunda cadeia ou projeto pronto para publicar.

Fluxo ensinado: **Compartilhar → manter título/resumo → Gerar capa → conferir → Publicar → Seu jogo está no Mural! → Fechar → Concluir aula**. O envio anterior libera o compartilhamento. Personalizar, copiar link e resolver problemas ficam no tutorial `/como-fazer/plataforma-publicar-no-mural`, na mesma aba com retorno à aula.

Publicar é a tarefa proposta, mas não vira um requisito técnico novo de conclusão. A oferta vigente de 30 dias já dá Mural completo durante o acesso e modo visitante depois; esta edição não altera permissões nem amplia prazos. Conferir a publicação com uma conta elegível antes de gravar.

## Continuidade e produção

Preservar seções `condicao`, `decisao`, `fecho`, chave `projeto`, cadeia e experiência existente. Regravar os três vídeos; o antigo fechamento não ensina a nova tarefa. O encerramento da fala é **Concluir aula**, sem apresentação comercial ou teaser do certificado.
