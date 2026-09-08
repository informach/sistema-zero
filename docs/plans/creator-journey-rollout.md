# Implantação e avaliação da Carreira do Criador

Esta é a sequência operacional da implementação em
[2026-09-07-creator-journey-evolution.md](2026-09-07-creator-journey-evolution.md).
As fases organizam a construção do código em etapas consecutivas. O conjunto completo
é validado em staging e promovido para produção somente após aprovação do responsável
pelo produto. Navegação, trabalhos e prática seguem as regras normais de acesso e carreira.

## Dependências e ordem

1. Conferir a posição do journal nos bancos existentes e aplicar as migrations
   geradas pelos comandos de migração de cada serviço: Hub
   `0011_creator_showcase_delivery` e `0012_showcase_delivery_owner`; Members
   `0076_creator_practice` e `0077_pensa_molda_destination`. Elas são aditivas.
   A `0077` deve confirmar a transação antes de código gravar o novo enum.
   O caminho histórico completo de Members em banco vazio tem uma incompatibilidade
   anterior entre `0029`/`0030`; não foi alterado nesta entrega. Não usar o ambiente
   sintético dos testes como prova de que o catálogo real foi migrado.
2. Subir Members e Hub/worker, depois o gateway com as rotas explícitas de prática
   e consulta de propagação. Subir Kids, shell compartilhado e admin do mesmo conjunto.
   Members precisa aceitar `molda` antes de qualquer host gerar esses cartões.
3. Conferir uma publicação de teste: thread e pendência na mesma transação,
   confirmação em Members, avanço somente com os dois marcos. Interromper e reiniciar
   o worker; a mesma entrega deve ser recuperada sem duplicar XP, carreira ou thread.
4. Validar a oficina completa em staging com contas e perfis de teste.
   Validar desktop, celular, teclado, redução de movimento e troca entre irmãos.
   Repetir a troca de perfil com duas abas de prática abertas: a aba antiga deve
   receber 409 e pedir atualização, sem iniciar uma sessão para o outro perfil.
   No Molda, reabrir a mesma criação duas vezes pelo guia e sair pelo menu com
   marcações pendentes; o rascunho deve voltar apenas no mesmo perfil/versão.
5. Validar a prática e revisar seu conteúdo em staging. Depois da aprovação do
   responsável pelo produto, promover o conjunto validado para produção.

## Validação e promoção

O deploy disponibiliza a navegação em cinco grupos e a prática. Os trabalhos aparecem
conforme as ferramentas liberadas pela conta e pela carreira. Novas sessões de prática
exigem acesso ao curso, aula concluída e quiz aprovado. Os dados continuam isolados por perfil.

Staging é o ambiente de validação do conjunto. A promoção para produção é uma decisão
explícita do responsável pelo produto após essa avaliação. Uma eventual reversão de
versão deve preservar tabelas, pendências, concessões, rascunhos, histórico e planos.

Uma versão anterior que desconheça `destination=molda` não deve voltar a servir
planos que já contenham esse destino. Preferir corrigir adiante ou manter o leitor
compatível enquanto se interrompe a geração. Um rollback de banco removendo esse
enum não é parte deste plano.

## Inventário e medição

Mapa de implementação: `core/career` concentra os contratos; Members é autoridade
de acesso, marcos, concessões, planos e prática; Hub publica e entrega o marco;
member-shell autentica os BFFs e resolve as capacidades da IA; Kids apresenta a
jornada; admin preserva a possibilidade de publicar e abre entregas contextualizadas.

As consultas [Members](creator-journey-members-audit.sql) e
[Hub](creator-journey-hub-audit.sql) são somente leitura e retornam agregados.
Executar com a conexão do serviço correto e `ON_ERROR_STOP=1`, guardando resultados
com data e ambiente. O inventário de posições aponta ausência/duplicação e existência
de atividade de publicação; a navegação até essa atividade ainda exige o cenário
de aceitação abaixo. A contagem de marcos inclui bônus/legado: não é a contagem de
níveis qualificados, calculada pela política de carreira.

Durante a validação em staging, registrar:

- Quais cenários, perfis de teste e dispositivos foram avaliados.
- Quantos conseguem identificar e executar o próximo passo sem ajuda.
- Pendências de publicação, idade da fila e casos em que uma conclusão não vira conquista.
- Quantos retomam a criação correta, quantos encontram conflito de versão e como o resolvem.
- Na prática: início, conclusão, motivo de abandono e se a explicação ajuda a corrigir
  a ideia. Acertos ou minutos isolados não comprovam aprendizagem.
- Relatos dos responsáveis sobre clareza do progresso e perguntas recorrentes ao professor.

Não há baseline real calculado: o banco de desenvolvimento disponível não contém
`members.courses`. Os testes usam conteúdo sintético. Não foi realizada pesquisa com
crianças, enviada mensagem real ou gerada nota de aprendizagem a partir destes testes.

## Aceitação antes da expansão

| Cenário | Resultado obrigatório |
| --- | --- |
| Faísca com posse de todas as ferramentas | Criação nas aulas; Estúdio livre/Pinta ainda dependem da carreira |
| Conclusão sem publicação / publicação antes da conclusão | Nenhuma promoção prematura; próxima ação explica o marco que falta |
| Curso-base e demais posições | Base primeiro; posições restantes sem nova ordem artificial |
| Bônus e curso sem blocos inéditos | Sem promoção por bônus; nenhum bloco antigo removido; sem falsa celebração de ganho |
| Aula nova após conquista | Selo e blocos conquistados permanecem; aulas novas podem ser estudadas |
| Última atividade de publicação na autoria | Remoção, conversão ou despublicação impedida, inclusive em alterações concorrentes |
| Hub ou Members temporariamente fora | Jogo recebido permanece; fila recupera; erro de consulta não vira convite de compra |
| Irmãos da mesma conta | Mesma posse; planos, progresso, prática e criações separados |
| Pensa em cada capacidade | Tarefas usam blocos conquistados; Molda exige 3D e disponibilidade; plano permanece quando bloqueado |
| Volta Molda → Pensa | Editor precisa guardar/fechar; vínculo mantém ID real da criação e IDs do plano |
| Local, nuvem e conflito | Abrir ID correto; conservar trabalho local; resolver conflito explicitamente |
| Prática e histórico | Sessão retomável mesmo após edição do conteúdo; sem XP/moedas/conclusão de curso |
| Aula concluída | Progresso vem da resposta do servidor; publicação indicada quando necessária |
| Responsáveis / aluno | Área dos pais exige sessão da conta e verificação de responsável |
| Recado sobre entrega | Professor abre exatamente perfil, curso, aula e bloco daquela conversa; rascunho preservado |
| Mobile / teclado / movimento reduzido | Cinco destinos legíveis; foco recuperável; controles alcançáveis; sem animação necessária à compreensão |
| Adulto e admin | Retomada e feedback com o tema próprio, sem aplicar a estética Kids |

Os testes automatizados cobrem regras e vários fluxos de componentes; a inspeção
visual e o percurso completo entre serviços permanecem pendentes porque o navegador
conectado não está disponível. Falhas de isolamento, perda de trabalho ou regressão
de concessões exigem correção antes da promoção para produção.

## Laboratório de matemática: proposta editorial

Proposta editorial para oito atividades, ainda sem rota nem liberação. Elas usam
contextos de criação, mantêm histórico separado e não contam para a carreira.
Cada atividade precisa de exemplos resolvidos, feedback por alternativa e revisão
pedagógica antes de virar conteúdo do produto.

| Atividade | Situação e habilidade | Exemplo de conferência |
| --- | --- | --- |
| Coordenadas | Deslocar um personagem em uma grade | De (2,3), mover (+4,-1) chega a (6,2) |
| Escala | Redimensionar uma imagem mantendo proporção | 48×32 em escala 1,5 vira 72×48 |
| Tempo e velocidade | Relacionar distância, duração e velocidade constante | 120 pixels a 30 pixels/s levam 4 s |
| Ângulos | Compor rotações no cenário | Quatro giros de 90° completam uma volta |
| Probabilidade | Comparar chances em sorteio uniforme | 3 resultados favoráveis entre 12 dão 25% |
| Porcentagens | Ajustar atributos de um personagem | Aumentar 80 em 15% resulta em 92 |
| Sequências | Encontrar uma regra de progressão | 5, 8, 11, 14: próximo termo 17 |
| Área e orçamento de peças | Cobrir um cenário sem exceder o inventário | Grade 8×6 usa 48 peças unitárias |

Critério de decisão: os alunos entendem a prática, conseguem usar o feedback e
continuam distinguindo estudo, criação e carreira; a equipe consegue manter o
conteúdo. Só então decidir incluir conhecimentos extras. Educação financeira fica
para uma proposta posterior, apropriada à idade e revisada pela equipe pedagógica.
