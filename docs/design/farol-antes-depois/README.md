# A Chave do Farol — protótipo antes e depois

Protótipo solicitado em 26/10/2026, baseado na [análise pedagógica](../../aulas-interativas/faisca/desafio-primeiro-jogo/ANALISE-PEDAGOGICA-2026-10-26.md). Destina-se à avaliação da proposta, sem modificar o curso publicado.

## Desenho

- Comparação por abas, com a mesma largura. A troca conserva o estado de cada versão.
- Antes: componentes reais e manifestos locais das cinco experiências, quiz clássico e critérios atuais.
- Proposta: mesmas artes, fontes, palcos, moldura, mascote e botões. As cores dos botões seguem o tema escolhido.
- Quiz: quatro questões com previsão, cena demonstrativa, explicação e nova tentativa. Correção apenas local.
- Objetivos: conquistas observáveis e uma simulação identificada do observador de memória. Não representa execução do projeto do aluno.
- HTML autossuficiente, com fontes e imagens incorporadas. Voz opcional do navegador; não contém gravações finais da professora.

## Diretriz atual: objetivos orientam a exploração

A avaliação do usuário acrescentou um requisito central: a criança precisa poder repetir, mudar de ideia e investigar além dos passos sugeridos. As cinco propostas foram revistas com essa orientação. Esta revisão substitui a condução anterior por etapas que liberavam controles.

1. Todos os controles pertinentes ficam disponíveis desde o início. O destaque sugere um teste, sem obrigar uma sequência.
2. Zappy considera a situação atual e as comparações que ainda faltam. As descobertas contam em qualquer ordem e continuam marcadas ao reiniciar uma tentativa.
3. A experiência continua funcionando depois de cumprir todos os objetivos. A criança pode repetir as mesmas ações e testar novas combinações.
4. Uma descoberta depende do efeito observado. Ligar uma opção ou escolher uma condição não equivale a testar sua consequência.
5. Recomeçar a partida, voltar ao início e preparar outra tentativa conservam as descobertas. **Recomeçar experiência** limpa todo o percurso daquela proposta. Navegar para outra parte também inicia uma demonstração nova.
6. Apenas ações sem objeto disponível ficam desabilitadas: recolher uma chave já retirada ou afastar um personagem que já está longe. O texto explica como preparar outro teste.

### Aplicação nas cinco experiências

- **Quadros:** adicionar e retirar o bloco de mover é separado de apertar/soltar a tecla no teclado de teste. Avançar 1 ou 10 quadros, rodar, pausar e mudar a seta livremente. A câmera acompanha o personagem; a faixa do percurso mantém o início visível. Marcas distinguem lugar anterior, atual e próximo passo. As imagens do início, do quadro anterior e do atual conservam o personagem legível em percursos longos. Nenhuma coordenada é apresentada. Soltar a tecla apaga visualmente o comando, sem removê-lo da regra. Retirar o bloco realmente o remove. Quatro objetivos comparam a ausência do bloco, a tecla solta, os passos e a pausa.
- **Limite:** adicionar e retirar o bloco de limite durante o movimento, repetir a borda e voltar ao início. Pode começar com ou sem limite. O relógio automático pausa quando o personagem já saiu da tela; avanço manual e regras continuam disponíveis. A comparação das duas ordens pode ser aberta a qualquer momento, num teste identificado que começa junto à borda. Sem antecipar x/y.
- **Memória:** alternar a regra, recolher, afastar e reiniciar em qualquer ordem possível. Mudar a regra depois da coleta afeta o próximo encontro, não reescreve a memória. A regra mostra se a ação de guardar está presente. O painel de memória mostra separadamente o resultado da coleta anterior, mesmo depois de editar a regra.
- **Porta:** escolher com ou sem chave antes de qualquer tentativa; repetir os dois casos quantas vezes quiser. Trocar de situação limpa a resposta visual anterior. O caminho só é destacado ao testar a porta.
- **Posição:** x e y disponíveis desde o início, com botões, controles deslizantes e edição numérica. Permite percorrer os extremos dentro da tela e começar por qualquer eixo. Início marcado, rastro do último movimento e alvo opcional. O desafio não bloqueia os controles nem é necessário para completar a exploração das direções.

No roteiro, o vídeo explica o conceito e convida a investigar. Na experiência, Zappy sugere comparações contextualizadas. Os objetivos descrevem o que observar, sem transformar a aprendizagem em uma lista obrigatória de cliques.

## Arquivos e geração

`data.ts` reúne a autoria; `shared.tsx` compõe a moldura real; `experiences.tsx` contém as interações; `exploration-model.ts` registra observações independentes; `visuals.tsx` desenha as comparações; `quiz.tsx` demonstra a revisão; `client.tsx` permite navegar e comparar; `styles.css` ajusta a apresentação; `build.ts` empacota o HTML.

Gerar: `bun docs/design/farol-antes-depois/build.ts`.

Saída: [a-chave-do-farol-antes-depois.html](../a-chave-do-farol-antes-depois.html).

O empacotador conserva o quiz clássico real e adapta somente sua submissão para correção local. Nas experiências atuais, usa o contexto de prévia autoral sem conta. As propostas reutilizam o motor e os palcos existentes, com condução local; a comparação de ordem acrescenta um modelo explícito de um quadro na borda. A alteração livre da regra de memória é local ao protótipo. Nenhuma adaptação modifica os componentes de produção.

## Verificação

- `bun test ./docs/design/farol-antes-depois/exploration-model.test.ts`: seis testes de comportamento, cobrindo observações em qualquer ordem, 150 quadros, independência entre comando/tecla/tempo, reinícios, limite, memória, decisão e eixos independentes.
- `node docs/design/farol-antes-depois/verify.mjs`: percursos reais no Chrome. Movimento longo, pausa ao trocar de versão, tecla sem bloco, bloco sem tecla, testes depois da conclusão, limite primeiro, memória em ordem invertida e mudanças após coleta, porta com chave primeiro, y primeiro, extremos dos controles e alvo opcional. Verifica também quiz proposto com erro/correção, quiz clássico, observador simulado, temas e sete partes em 390, 768 e 1440 px.
- Resultado: percursos aprovados, sem erros JavaScript nem requisições externas obrigatórias. Inspeção visual do movimento longo, memória, posição e versão móvel.

Essas verificações comprovam os comportamentos do protótipo, não a aprendizagem. A avaliação pedagógica com crianças permanece necessária para aferir compreensão e autonomia.

## Revisão de linguagem e comportamento

Ver [REVIEW-2026-10-26.md](./REVIEW-2026-10-26.md). O movimento agora distingue edição da regra, teclado simulado e passagem de quadros. Memória e porta distinguem configuração, acontecimento e resultado. O quiz preserva as quatro questões e a cena demonstrativa, com explicações mais curtas e rótulos “pergunta/resposta”.


Os dados de **Antes** estão congelados nos arquivos `*.antes.json`, extraídos da base `5bde02c4f`. Assim a comparação preserva a versão aprovada antes da implementação, mesmo depois de atualizar os manifestos do curso.
