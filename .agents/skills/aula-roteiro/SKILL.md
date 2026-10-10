---
name: aula-roteiro
description: Escreve e revisa roteiros infantis do Sistema Zero, com tarefa direta, montagem completa e linguagem simples. Use para criar ou adaptar aulas e suas orientações de gravação.
---

# Roteiros de aula do Sistema Zero

Direção revisada em 27/09/2026 após o ensaio de Cadê Todo Mundo? com duas crianças.
A criança precisa saber o que fazer agora. Uma fala acolhedora pode ser direta e completa.

## Fontes atuais

- Leia docs/aulas-interativas/DIRETRIZES-PEDAGOGICAS.md inteiro antes de criar, revisar ou
  adaptar qualquer curso. Ele é a referência única e prevalece sobre esta lista.
- Leia docs/aulas-interativas/BRIEFING.md e ESPEC-ROTEIRO.md.
- Para uma aula existente, leia o trio de proposta, manifesto e roteiro em
  docs/aulas-interativas/aulas/. Confira se há gerador em docs/aulas-interativas/qa/.
- Confira rótulos e comportamento no código. REFERENCIA-PLATAFORMA.md e
  REFERENCIA-BLOCOS-JOGO-2D.json são apoio.
- Cadê Todo Mundo? é a primeira aplicação desta revisão. Não copie a voz dos roteiros
  antigos por hábito. As instruções explícitas do usuário prevalecem.

O formato atual é **{slug}.roteiro.md**, junto de **{slug}.md** e
**{slug}.manifesto.json**. Não encaminhar este trabalho a roteiro.yaml ou a um pipeline
studio-aulas sem comprovar que esse formato existe e foi solicitado.

## Como escrever

1. Comece pela tarefa: "Jogue esta versão pronta", "Toque no arbusto", "Faça o jogo contar".
2. Mantenha o passo a passo completo: caminho da paleta, bloco, encaixe, campo, valor e teste.
   Não peça para adivinhar uma peça nem use "faça como eu fiz" no lugar da instrução.
3. Explique a palavra nova brevemente quando ela for necessária. Analogias são opcionais.
4. O vídeo da experiência é uma demonstração: o narrador faz os testes na primeira pessoa e só
   no fim passa a vez (DIRETRIZES). As instruções da própria experiência dizem à criança como
   executar os testes, sem contar todos os resultados. Pistas não escondem passos obrigatórios.
5. Termine com a ação real, com o rótulo da tela: Próxima parte, envio com confirmação ou
   Concluir fase.
6. Escreva como se falasse com uma pessoa: "você", verbos simples, sem travessões.
   Não repetir elogios, perguntas retóricas, agenda ou promessas da próxima aula.
7. Comemore o que a pessoa fez e o resultado, sem exagerar sua autoria. O preparo do cenário,
   dos desenhos e das regras iniciais fica nas notas da equipe; não vira ressalva na comemoração
   nem no caderno. Cite um elemento existente só quando seu papel ajuda a executar a ação.

## Aula e Como Fazer

O roteiro conserva a montagem do jogo, os comandos da experiência e os encaminhamentos
necessários para concluir. Pausar, rever, ampliar, alternar abas, usar o leitor do caderno,
baixar materiais e publicar ficam em docs/como-fazer/como-fazer.json.

Mover um tutorial não significa deixar a criança sem instrução. Confira o destino na
biblioteca e acrescente o que estiver faltando. Não exigir a leitura de todos os tutoriais
antes de jogar. Não colocar tour da interface nas notas de gravação do vídeo da aula.

## Entrega e conferência

- Separar cada **Na tela:** da fala com linha em branco; fala em citação. Quando houver avatar,
  identificar **Professora/Professor**, **Debinha (avatar)** ou **Dedé (avatar)** e marcar entrada
  e saída conforme ESPEC-ROTEIRO.md e AVATARES-NOS-VIDEOS.md. Zappy é fala da página, não do vídeo.
- Distribuir participações nos trechos longos e depois dos testes, sem interromper gestos ou impor
  uma cota por vídeo. Para mostrar entendimento, a criança traz um exemplo ou uma consequência;
  não repete a definição. Reações breves de surpresa e comemoração também cabem. “Agora sim!”
  responde depois de “Funcionou?”, com o resultado da demonstração visível.
- Preservar seções, experiências e critérios que funcionam quando a revisão é de linguagem.
- Atualizar proposta, roteiro, manifesto e gerador juntos. Manter identificadores, projetos,
  mídia anexada e progresso. O molde local plannedVideo não substitui um vídeo publicado.
- Rodar os validadores de manifesto, roteiro e tutoriais para os arquivos alterados.
  Usar os testes existentes do curso quando houver manifesto gerado.
- Ler todas as falas em voz alta e conferir tarefa, passos, teste e saída.
- Distinguir gravação informada, edição e publicação. Em vídeos já gravados, preservar a fala e
  indicar pontos de inserção; só sinalizar gravação complementar se houver lacuna concreta.
  Não declarar que a compreensão infantil foi validada só porque os arquivos passaram em testes.

Esta é a cópia versionada da skill local .agents/skills/aula-roteiro/SKILL.md.
Ao alterar a skill local, atualizar esta cópia para manter as diretrizes disponíveis no projeto.
