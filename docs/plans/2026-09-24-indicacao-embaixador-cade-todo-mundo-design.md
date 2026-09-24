# Indicação de embaixadores: acesso ao Cadê Todo Mundo?

## Decisão

Os links de embaixador existentes passam a oferecer **Cadê Todo Mundo?** (`cade-todo-mundo`) nos novos resgates em staging. O curso continua bloqueado para quem apenas cria uma conta. A indicação concede acesso sem cobrança somente a esse curso; não libera a assinatura da Comunidade dos Criadores, os outros cursos nem as ferramentas completas.

O nome do curso no catálogo é **Cadê Todo Mundo?**. O curso também poderá ser oferecido em outras campanhas no futuro, mas esta entrega muda apenas o fluxo dos embaixadores. Produção não recebe a mudança até a decisão de publicação.

## Por que conceder o curso diretamente

O resgate atual concede a oferta do Desafio do Primeiro Jogo. Essa oferta inclui itens que não pertencem ao novo presente. O serviço de matrículas já suporta concessão manual de um curso específico; o contrato entre referrals, gateway e members passará a aceitar essa modalidade com o slug `cade-todo-mundo` e a procedência da indicação. Isso preserva a regra de acesso do catálogo sem criar uma oferta artificial, cuja gratuidade também conflitaria com as regras atuais de preço do catálogo.

Não criar agora um motor genérico de campanhas. Palestras e outras ações podem reutilizar, mais tarde, a concessão por curso com suas próprias regras de elegibilidade.

## Fluxo de resgate

1. O link atual `/bolsa/<codigo>` permanece válido. Código inexistente ou desativado continua indistinguível para visitantes; falha temporária de serviço não se apresenta como link inválido.
2. A página consulta a disponibilidade do presente. O curso só fica disponível para resgate quando estiver publicado e acessível. Enquanto estiver em preparação, a página identifica o novo curso, explica a espera e não mostra o formulário. O servidor aplica a mesma restrição **antes** de registrar o resgate ou criar uma conta. Uma falha na consulta de disponibilidade também fecha o resgate com mensagem temporária.
3. Com o curso disponível, o responsável informa nome e e-mail; telefone continua opcional. O fluxo conserva a política atual de um resgate por e-mail e aceita uma conta já existente.
4. O serviço garante a conta, concede somente o curso, registra a origem `scholarship:<redemption-id>` e usa identificador estável para repetição segura. Só depois da concessão marca o resgate como concluído e envia o e-mail. Um novo usuário recebe o caminho para criar a senha; quem já tem conta recebe instrução para entrar.
5. Falha temporária mantém o resgate retomável. Conflito de matrícula aparece para atendimento; o fluxo não finge sucesso. A confirmação e os e-mails nunca prometem acesso antes de ele existir.

O contrato de concessão deve rejeitar curso inexistente ou ainda não publicado, inclusive se o estado mudar entre a consulta inicial e a concessão. Resgates concluídos antes da troca mantêm o Desafio recebido e não são migrados. Resgates pendentes seguem o novo curso na retomada. O bônus atual do embaixador por uma futura assinatura da Comunidade não muda.

## Página e comunicação

A página começa pelo resultado concreto da criança, depois explica quem indicou e o que é o Sistema Zero. Texto-base do topo:

> **Seu filho pode criar um jogo de procurar personagens.**
>
> [Nome do embaixador] indicou sua família para receber acesso ao curso **Cadê Todo Mundo?**, no Sistema Zero, sem pagar por ele. Em aulas guiadas, a criança liga ações aos toques, encontra os personagens e termina o próprio jogo.

Em seguida, a página explica que o Sistema Zero ensina crianças a criar jogos em atividades práticas. Mostra o percurso deste curso — primeiro achado, busca completa e certificado — e os passos do responsável: preencher dados, receber acesso, criar o perfil da criança e começar. O CTA é **Liberar o curso para minha família**. O formulário informa que não pede cartão e que a indicação libera este curso, não a assinatura completa.

A copy deve refletir o curso real: faixa de 8 a 15 anos; projeto inicial preparado; programação guiada de reação ao toque e contagem; continuação em casa; certificado ao concluir. Não prometer Pinta, Estúdio completo, acesso a todos os cursos, resultado escolar, duração rígida ou funcionalidades ainda não publicadas. Remover as promessas antigas de cinco dias, idade a partir de nove anos e Desafio do Primeiro Jogo.

Alinhar a mesma promessa no painel e no texto de compartilhamento do embaixador, na área Kids, no admin, no convite por e-mail, nas boas-vindas e na confirmação do formulário. Para contas existentes, o aviso de novo acesso deve identificar o curso. Manter o envio de convites por e-mail existente; não adicionar disparo frio por WhatsApp. Textos públicos e templates persistidos em staging precisam ser atualizados juntos.

## Verificação e publicação

- Testar link antigo com novo destino, código inválido, curso ausente/rascunho, falha da consulta de disponibilidade e transição automática para curso publicado.
- Testar concessão exclusiva do curso, ausência de itens da oferta anterior, conta nova e existente, repetição idempotente, retomada após falha e conflito de matrícula.
- Revisar páginas, mensagens e templates para remover promessas antigas e verificar acessibilidade e layout responsivo.
- Publicar apenas em staging. O curso ainda não está cadastrado no catálogo de staging e seus vídeos estão em preparação; até que esteja publicado, o resgate ficará fechado. Executar a prova ponta a ponta com um código de embaixador e uma conta de teste após a publicação do curso. Não alegar validação do resgate real antes disso.
