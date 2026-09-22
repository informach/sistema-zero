# Desafio do Primeiro Jogo · Aula final · Seu certificado e próximos passos

## Resumo

- **Estado de entrada:** a introdução e os cinco dias estão concluídos. A criança tem um jogo de nave com movimento, tiros, asteroides, pontos, vidas e telas de começo e fim.
- **Vitória da aula:** emitir e baixar o certificado, conhecer os caminhos para continuar criando e registrar a conclusão do Desafio.
- **Seções propostas:** 2, ambas obrigatórias e nesta ordem: certificado e próximos passos.
- **Clipes propostos:** 1 vídeo novo, com o pitch da Comunidade dos Criadores.
- **Manifesto:** `aulas/desafio-certificado.manifesto.json`, versão 5. A importação conserva o ID do bloco `certificate` existente e os campos de arte e assinatura que o manifesto não declara.

## Triagem dos conceitos

Esta aula não apresenta conceitos novos de programação. A primeira seção celebra um resultado verificável: o certificado é emitido depois das aulas anteriores. A segunda mostra uma possibilidade de continuidade, dirigida à criança e ao responsável. A assinatura é apresentada como escolha da família, sem entrar nos critérios da aula.

## Diagnóstico do desenho atual

O redesenho anterior cobriu a introdução e os cinco dias, mas não mapeou o encerramento que existe em produção. As aulas de certificado e próximos passos ficaram fora dos manifestos e da organização em módulos. Colocar o certificado no Dia 5 misturaria o fluxo especial de emissão à atividade obrigatória do Estúdio. Manter próximos passos como aula posterior faria o certificado sair antes de o curso chegar a 100%.

## Proposta final

### Seção 1. Seu certificado

- **Intenção:** entrega.
- **Na tela:** um balão curto de comemoração e o bloco de certificado já configurado. A criança toca em **Pegar meu certificado** e baixa o PDF; pode guardá-lo ou imprimi-lo com um responsável.
- **Critério:** o registro de emissão do certificado. A emissão conclui esta seção e libera a próxima. Ela não conclui a aula inteira.
- **Limite:** imprimir no papel não é verificável nem exigido. O manifesto declara a frase e o texto do curso; a arte, as assinaturas e o QR já configurados devem ser preservados ou conferidos no admin.

### Seção 2. Próximos passos

- **Intenção:** fechamento.
- **Na tela:** um balão pede para assistir com um responsável. O vídeo apresenta a Comunidade dos Criadores e aponta para a página pública da oferta. Um link curto para essa página fica sob o vídeo.
- **Critério:** assistir a pelo menos **90% do vídeo**. Depois disso, o botão **Concluir aula** fica disponível. Abrir a oferta ou assinar não é critério.
- **Relação comercial:** a família vê os planos e condições na página de oferta; o vídeo não congela preço, prazo ou promessa de acesso imediato a ferramentas que dependem da Jornada do Criador.

## Experiências e demonstrações desta aula

Nenhuma cena nova. Esta é uma aula de conquista e continuidade, sem bancada de programação.

## Vídeos

| Chave | Título | Origem | Duração alvo | O que mostra |
|---|---|---|---|---|
| `video-pitch` | O que vem depois do seu jogo | Novo | 75 a 90 segundos | Jogo pronto, certificado emitido, prévia identificada da Comunidade e página pública da oferta |

O roteiro literal está em `aulas/desafio-certificado.roteiro.md`. O bloco de vídeo fica planejado até a gravação ser vinculada no admin; a aula não deve ser publicada antes disso.

## Continuidade e importação

- **Vem de:** Dia 5, com jogo entregue e conclusão registrada.
- **Encerra:** o Desafio do Primeiro Jogo. O certificado é emitido antes do pitch, mas a aula e o curso só terminam depois do vídeo e do clique em **Concluir aula**.
- **Destino no admin:** o manifesto usa `lessonSlug: certificado`. Abrir a aula de certificado no curso e confirmar esse slug antes de importar. Criar ou mover a aula para o módulo 3 se o destino ainda não existir em staging. A prévia deve preservar o ID do único bloco de certificado existente; se houver mais de um, resolver a ambiguidade antes de importar.
- **Migração:** a antiga aula separada de próximos passos deve ser revisada e despublicada quando o novo percurso for publicado, para não duplicar o pitch ou manter uma aula extra na contagem do curso. Conferir o histórico dos alunos antes de alterar aulas publicadas.
