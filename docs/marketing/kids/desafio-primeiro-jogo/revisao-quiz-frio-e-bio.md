# Revisão do quiz para tráfego frio e posicionamento da bio (03/10/2026)

Versão do quiz: `desafio-farol-v3`. Aplica o comando `lt-quiz` (`.claude/commands/lt-quiz.md`):
justificar cada pergunta e o uso da resposta, preservando o `FunnelQuiz` e as validações.

## O que motivou a revisão

Pedido da dona (03/10/2026): o quiz serve para qualificar e aquecer o lead, então nenhuma tela
antes do resultado pode apresentar o produto. Na v2 a abertura já mostrava o Farol e citava o
Desafio, uma pergunta trazia preço e condições, e a tela de quem não tem computador levava à
oferta antes do resultado. Na v3:

- A entrada fala da família e do que ela observa (`quiz/entry-copy.ts`), sem nome de produto,
  preço, prazo, imagem do Farol ou link para a oferta. O título é "Encontre um jeito de seu filho
  aprender com o que já gosta".
- O Desafio aparece pela primeira vez no RESULTADO, como "uma primeira experiência dentro da
  plataforma da Comunidade dos Criadores": a família conhece o jeito de aprender antes de decidir
  sobre a continuidade (`quiz/result.ts`, campo `presentation`). Pagamento único, 30 dias e a
  continuidade opcional seguem claros na ponte para a oferta.
- `interesse_no_projeto` virou `abertura_criacao`: a pergunta mede abertura para o TIPO de
  atividade, não aceitação de um produto que a família ainda não conhece. Sessões v2 ficam
  históricas (a troca de versão inicia um lead novo).
- A régua automática mora em `tests/browser/desafio-quiz-frio.ts`: em todas as telas do quiz, nos
  seis caminhos, nenhum texto, título, descrição, imagem ou link cita o produto, e a tela não pode
  estar vazia.

## Cada pergunta e o uso da resposta

| Pergunta | Por que existe | Como a resposta é usada |
| --- | --- | --- |
| `idade` | A experiência foi pensada para 9 a 14 anos; fora disso a família merece saber antes de investir tempo. | Fora da faixa encerra o quiz com uma orientação honesta (`activeSteps` só mostra a idade). Dentro da faixa, segue. |
| `equipamento` | A atividade acontece no computador; celular e tablet não bastam. Cedo no quiz para não frustrar depois. | `sem_computador` vira condição não atendida e tela de orientação; `a_conferir` e `compartilhado` viram observações no resultado. |
| `interesses` | Parte do que a família JÁ observa (jogar, desenhar, inventar histórias, querer criar), sem pedir que ela imagine o produto. | Personaliza a ideia de conversa do resultado (ex.: quem "já falou que queria criar um jogo" recebe um convite que parte disso). |
| `experiencia` | Ajusta o ponto de partida: quem nunca tentou e quem já monta jogos sozinho precisam de recados diferentes. | `interrompida` e `guiada` mudam o texto do começo; `independente` vira ponto a conferir (o nível pode ser básico demais). |
| `motivos` | O que o ADULTO valoriza (tempo de tela, primeiro jogo, expressão visual, iniciação tecnológica). Não é inferência sobre a criança. | Define o perfil principal da recomendação; até duas escolhas, com `exploracao` e `outra_procura` exclusivos. |
| `prioridade` | Só aparece quando há dois motivos: desempata sem forçar. | `iguais` mantém os dois motivos no resultado ("compartilhado"); senão, o escolhido conduz. |
| `duvida` | Antecipa a objeção que a família traz (participação, companhia, ajuda, rotina, valor). | Escolhe o bloco de resposta à dúvida no resultado (`DOUBTS`). |
| `formato` | Aulas gravadas com ajuda por mensagem não servem a quem precisa de professor ao vivo; dizer isso antes evita compra errada. | `exige_ao_vivo` vira condição não atendida; `prefere_ao_vivo` e `a_conferir` viram explicação do formato no resultado. |
| `abertura_criacao` | Mede se a família quer conhecer uma atividade guiada de programação de jogos, sem apresentar o Farol. | `outra_atividade` abre a pergunta seguinte e um resultado que explica as diferenças; `conversar` sugere a conversa antes de escolher; `conhecer` segue para a recomendação. |
| `desencontro` | Só para quem procura outra atividade: entender o que falta (desenho, Roblox/Minecraft, projeto avançado). | Escreve no resultado o que o Desafio NÃO oferece; quem procura desenho é levado à oferta de expressão visual da Comunidade. |

Nenhuma resposta é usada para prometer resultado, inferir vontade da criança a partir do desejo do
adulto ou traduzir perfis antigos em motivos novos (restrições do plano
`docs/superpowers/plans/2026-10-03-desafio-funil-farol.md`).

## Posicionamento da bio (raiz do funil)

Pedido da dona no mesmo dia: a headline e a subheadline da página principal estavam vagas ("Seu
filho aprende criando jogos. Aulas, experiências, ferramentas e ajuda na mesma plataforma.", uma
lista de itens). A proposta implementada pela sessão do Codex, **ainda sem a aprovação dela**:

- **Título:** "Tempo de tela para seu filho *aprender a criar.*"
- **Subtítulo:** "Na Comunidade dos Criadores, seu filho aprende a programar jogos e criar
  personagens. A explicação fica ao lado da atividade: ele acompanha, experimenta e pode pedir
  ajuda ali mesmo, dentro do tempo de tela que vocês já permitem."
- **Description (SEO):** "Programação de jogos e criação de personagens para 9 a 14 anos, com
  explicação e prática juntas, dentro do tempo de tela que sua família já permite."

O posicionamento troca a lista de recursos por uma ideia só (o tempo de tela que a família já
permite vira tempo de aprender a criar) e diz o MECANISMO (explicação ao lado da atividade, ajuda
na hora). Os links e marcadores de métricas da página não mudaram.
