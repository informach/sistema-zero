---
name: aula-roteiro
description: Escreve e revisa roteiros infantis do Sistema Zero, com contexto pertinente, montagem completa e linguagem simples. Use para criar ou adaptar aulas, quizzes pedagógicos e orientações de gravação. Não use para copy de marketing.
---

# Roteiros de aula do Sistema Zero

## Começar pela referência única

Leia `docs/aulas-interativas/DIRETRIZES-PEDAGOGICAS.md` inteiro antes de criar, revisar ou adaptar qualquer curso. Ele reúne as regras, seus motivos e as variações por curso. Não reconstruir a orientação cruzando relatórios antigos nem copiar o formato de um curso sem avaliar sua pertinência.

- `docs/aulas-interativas/BRIEFING.md`: preparar a análise e registrar decisões.
- `docs/aulas-interativas/ESPEC-ROTEIRO.md`: exemplos e formato da gravação.
- `docs/aulas-interativas/ESPEC-MANIFESTO.md`: contrato técnico de blocos e seções.
- Revisões de linguagem e relatórios preservam evidências históricas; não são versões concorrentes das diretrizes.

## Aplicar ao curso

1. Ler `modulos-*.md` e o trio da aula em `docs/aulas-interativas/aulas/`: proposta, manifesto e `{slug}.roteiro.md`. Conferir gerador em `qa/` e caderno em `recursos/`.
2. Registrar conhecimentos prévios, partes preparadas, autoria da pessoa, ferramentas disponíveis, conquistas, experiências, distribuição dos quizzes e critérios. Adaptar conforme o curso e as instruções do usuário.
3. Conferir rótulos, paletas, valores e ações no código. Referências exportadas ajudam, mas não substituem essa conferência.
4. Escrever contexto, tarefa, passos completos, teste e saída conforme as Diretrizes. Registrar também as falas do Zappy na página, distinguindo-as da narração gravada.
5. Atualizar proposta, roteiro, gerador, manifesto, caderno e organização do curso juntos. Preservar identificadores, projetos, mídias e progresso.

O formato vigente é o trio de Markdown e manifesto, não `roteiro.yaml` nem um pipeline `studio-aulas` presumido. Não produzir arquivos para um formato antigo sem comprovar sua existência e necessidade.

## Conferir e entregar

- Rodar geradores e os validadores de manifesto, roteiro e Como Fazer para os materiais alterados; executar os testes do curso e dos fluxos modificados.
- Conferir as cores oficiais dos blocos e a diagramação dos PDFs renderizados.
- Usar o checklist das Diretrizes; verificar a correspondência entre a ação pedida e o funcionamento real.
- Separar cada **Na tela:** da fala com linha em branco; fala em citação. Quando houver avatar,
  identificar **Professora/Professor**, **Debinha (avatar)** ou **Dedé (avatar)** e marcar entrada
  e saída conforme ESPEC-ROTEIRO.md e AVATARES-NOS-VIDEOS.md. Zappy é fala da página, não do vídeo.
- Distribuir participações nos trechos longos e depois dos testes, sem interromper gestos ou impor
  uma cota por vídeo. Para mostrar entendimento, a criança traz um exemplo ou uma consequência;
  não repete a definição. Reações breves de surpresa e comemoração também cabem. “Agora sim!”
  responde depois de “Funcionou?”, com o resultado da demonstração visível.
- Em vídeos já gravados, preservar a fala e indicar pontos de inserção; só sinalizar gravação
  complementar se houver lacuna concreta. Manter o ensaio da versão editada com uma criança.
- Distinguir atualização local, atualização no Admin, gravação e ensaio com crianças. `plannedVideo` não substitui mídia publicada, e teste estrutural não comprova compreensão infantil.
- Quando surgir decisão pedagógica nova, atualizar a referência central e sua aplicação no curso. Não manter outra lista de regras nesta skill.

Esta orientação tem uma cópia de consulta em `docs/aulas-interativas/autoria-aula-roteiro/SKILL.md`. Ambas encaminham para a mesma referência pedagógica.
