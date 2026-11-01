---
name: aula-roteiro
description: Escreve e revisa aulas comuns aos públicos infantojuvenil e adulto do Sistema Zero, com instrução completa, roteiro de produção e fala pronta para ElevenLabs v4.
---

# Roteiros de aula do Sistema Zero

Direção comum de 21/10/2026: simplicidade para uma criança compreender, tratamento respeitoso para adolescentes e adultos. Uma fonte editorial e uma gravação integral da professora.

## Antes de escrever

- Leia `docs/aulas-interativas-tecnico/DIRETRIZES-PEDAGOGICAS.md` inteiro, `DIRETRIZES-VOZ-ELEVENLABS.md` e `ESPEC-ROTEIRO.md` (a seção 9 ensina o **Na tela** da gravação automática), além de `DESCOBERTA-GUIADA.md`. Instruções do usuário prevalecem.
- Leia proposta, manifesto e roteiro em `docs/aulas-interativas/<posto>/<curso>/`. Confira o gerador em `docs/aulas-interativas-tecnico/qa/`; Nave, Dino e Meu Jeito têm fonte `.conteudo.json`, Cadê e Farol têm a fala no roteiro de produção.
- Confira nomes de controles e comportamento no código. Não existe tradução adulta separada nem pasta editorial kids/adulto.

## Como escrever

1. Situe a tarefa e convide para uma ação concreta. Use jogar, curso, aula, parte e Passo a passo do projeto.
2. Preserve todos os passos: destino visível antes da peça, caminho da paleta, bloco literal, encaixe, campo, valor, teste e correção.
3. Explique a palavra nova quando necessária. Escolha analogias comuns às idades, humor moderado e conversa com você, a gente e eu na demonstração. Traga o exemplo para quem assiste: “Sabe quando alguém faz cócegas em você e você não consegue parar de rir?”. Evite descrições distantes ou fabricadas como “vem aquela risada”; leia em voz alta e varie as construções sem repetir uma fórmula em todas as aulas. Evite voz de bebê, diminutivos de rotina e elogios excessivos. Preserve ilustrações já produzidas que expliquem bem para todos: mascote e humor visual, por si, não exigem uma troca de analogia. No Cadê, reaproveitar as cócegas/risada e o placar de futebol.
4. No vídeo conceitual, explicar a ideia com situação concreta e convidar a uma investigação. A experiência sugere comparações por falas do Zappy determinadas pelo estado. Os controles ficam livres desde o começo; os objetivos contam em qualquer ordem e a exploração continua depois de concluir. Texto, voz e botão principal acompanham a mesma etapa; as demais ações têm aparência de botão secundário. A montagem do Estúdio conserva todos os passos. O quiz de previsão apresenta cena, escolha, resultado e correção imediata, com nova tentativa e validação no servidor. Ler DESCOBERTA-GUIADA.md; esta direção de 25/10/2026 atualiza a antiga demonstração completa dos testes no vídeo.
5. Termine na ação real: Próxima parte, envio com confirmação ou Concluir aula. Consulta ao material e Como Fazer continuam opcionais.
6. Escreva o **Na tela** depois da fala, frase por frase, como manda a seção 9 de `ESPEC-ROTEIRO.md`. Cada frase começa citando um trecho exato da fala desta parte e termina com os gestos entre colchetes: `No "Olha aqui, quando eu toco num esconderijo", tocar num esconderijo [achar arbusto].` A citação vai de onde a mão sai até a palavra da ação: a mão pode chegar antes, mas o clique, o toque ou o arrasto só vem depois que a voz diz a palavra (`No "Agora vamos testar no seu jogo, toque num esconderijo"`). Um gesto por citação quando a fala nomeia cada clique (abrir o campo e escolher, clicar no 50 e trocar por 0). Amplie o bloco antes de demonstrar (`[ampliar jogo]`, `[ampliar experiência]`, `[expandir estúdio]`) e volte ao tamanho da aula numa frase anterior à saída (`[voltar à aula]`, `[reduzir estúdio]`), com o clique em **Próxima parte** ou **Concluir aula** na sua própria citação: `No "Quando terminar, clique em Próxima"`. Evite citar só um nome próprio, que a transcrição pode ouvir diferente. Um trecho que a edição troca por outra imagem leva `[na edição: o que entra]`. Quando a fala mudar, refaça o **Na tela** a partir da fala nova.
7. Mantenha o master contínuo e completo. Pensamentos citados podem ter sua frase exata substituída por Dedé ou Debinha no kids; preparação e retomada da professora permanecem. Não chamar personagens pelo nome no master.

## Entrega

- `{slug}.roteiro.md`: produção com o **Na tela** (o que aparece e os gestos da gravação automática, presos a trechos da fala), chave do clipe e bloco **Fala para ElevenLabs:**. Intervenções em tabela com ID, personagem, frase exata, ocorrência e âncoras.
- `{slug}.elevenlabs.txt`: aula inteira da professora, só falas, tags e pausas; sem cabeçalhos, notas, Markdown ou nomes de falantes. Toda frase tem direção aplicável; use ajustes locais quando a intenção mudar. Manter energia e variação de intenção adequadas a cada momento, inclusive dentro do parágrafo; não usar voz calma e uniforme como padrão. Não espalhe tags entre todas as palavras por rotina.
- TXT de cada personagem presente e `.edicao.json`: derivados do roteiro pelo exportador. A fala do personagem tem de ser idêntica à frase substituída. Na edição kids, silenciar somente esse intervalo da professora.
- `[long pause]` entre partes; alvo de cerca de três segundos conferido na edição. Sem SSML `<break>`. Audicionar a voz selecionada antes do lote.
- Atualizar fonte, proposta, roteiro, manifesto e PDF juntos. Preservar IDs, projetos, critérios, mídia e progresso. `plannedVideo` não é vídeo publicado.

## Conferência

Execute os geradores afetados, `qa/gerar-falas-elevenlabs.ts --check`, `qa/validar-manifestos.ts`, `validar-roteiros.py` (que também confere as citações do **Na tela**), testes do curso e validadores Como Fazer. Os comandos completos estão no README técnico. Renderize e revise o PDF após alterações. Leia o master continuamente e confira cada troca kids. Perguntas devem soar faladas: evite fórmulas como “Uma dúvida possível é” e “Você pode pensar assim”. Retire reações redundantes sem omitir dúvidas ou passos.

Tutoriais de interface ficam em `docs/como-fazer/como-fazer.json` e `docs/como-fazer-adulto/como-fazer.json`, com rótulos comuns. Não retirar passos da aula sem garantir o destino.

Registre separadamente texto, derivados, PDF, voz gerada, voz escutada, edição e publicação. Testes não comprovam compreensão: ainda é necessário ensaio com iniciantes das idades atendidas. As duas cópias desta skill são `.agents/skills/aula-roteiro/SKILL.md` e `docs/aulas-interativas-tecnico/autoria-aula-roteiro/SKILL.md`.

## Exploração livre, direção de 26/10/2026

- Guiar para compreender o conceito, sem exigir uma sequência única de cliques. Permitir repetir, ir além do mínimo e comparar casos em qualquer ordem. Registrar o efeito observado, não só a escolha de uma configuração.
- Separar edição da regra, entrada e execução. Adicionar/retirar o bloco muda o programa; pressionar/soltar uma tecla muda a entrada; avançar quadros ou testar o encontro executa a regra. Nomear o teclado de teste como simulação. Não usar “ligar a seta” para adicionar movimento.
- Manter referências visuais para comparar início, anterior, atual e próximo passo. Não antecipar x/y em quadros e limite; os dois eixos ficam livres quando o conceito de posição é apresentado.
- Reinício da tentativa conserva regra e descobertas; reinício da experiência limpa o percurso. Editar uma regra não muda retroativamente o que aconteceu. Explicar o motivo de ações fisicamente indisponíveis.
- Preservar vídeo conceitual, montagem completa e Passo a passo coerente. Usar pergunta/resposta quando o quiz pede diagnóstico ou escolha de teste, e manter a demonstração quando ela esclarece o conceito.
- Validar ordens alternativas, repetição, extremos, edição após o acontecimento, desfazer, retomada e continuação depois da conclusão, além de erros plausíveis no jogo real. Os controles, falas, manifestos, derivados e cadernos precisam contar a mesma história. Referência completa: DESCOBERTA-GUIADA.md.


## Missões de posto, direção de 28/10/2026

Nas missões, a montagem integral fica na ajuda opcional, disponível desde o início. O vídeo principal apresenta o resultado e relembra conceitos, sem resolver a tarefa. Exigir só o repertório investigado e os blocos montados nos cursos-base; infraestrutura pronta não conta como conhecimento demonstrado. Conservar um projeto por dimensão, critérios por etapa e testes antes/depois da coleta. Quiz pode combinar previsão com cena e escolha de teste sem cena. Referência implementada: O Jardim Secreto, em `docs/aulas-interativas/faisca/o-jardim-secreto/`. Diretrizes completas em DESCOBERTA-GUIADA.md.
