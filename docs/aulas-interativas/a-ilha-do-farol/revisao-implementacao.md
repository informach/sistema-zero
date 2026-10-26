# Revisão completa — 26/10/2026

Escopo: código alterado, executor, três aulas, três experiências, quatro questões com demonstração, nove etapas de projeto, objetivos, copy, roteiros, manifestos, falas, edição, modelos provisórios, documentação e PDF. Sem certificado. Os projetos usam Programação e Jogo 3D.

## Achados corrigidos

- Movimento: o comando de teclado define velocidade; a preparação agora integra essa velocidade com Mover o grupo jogadores a cada quadro. A montagem e o caderno mostram o encaixe antes dessa atualização.
- Grupos: substituídas declarações de arrays por grupos nativos, aceitos pelo validador de IR e pela extensão.
- Limites: a posição anterior é atualizada somente quando o personagem está no percurso permitido. A ponte permite testar o farol antes de recolher a chave.
- Modelos: nomes e metadados compatíveis com o importador, medidas extraídas dos modelos e otimização GLB. Os projetos cabem nos limites existentes, sem ampliar os tetos.
- Objetivos executados: o navegador usa setas reais e a geometria atual para chegar ao alvo, incluindo posição personalizada da chave. O carregamento da versão fixada de Three.js foi corrigido no executor. Os testes conferem parada ao soltar, coleta, mensagem, memória, decisão e reinício.
- Experiências: comparação antes de concluir ponto de vista; evidências independentes da ordem; resultado do contato preservado ao trocar de câmera e invalidado ao editar posição; restauração e desfazer completos; controles indisponíveis até a cena carregar.
- Apresentação: enquadramento do contato ampliado, adaptação para tela estreita, controles com as cores do tema, respostas sem destaque de gabarito e distinção entre observar e último teste.
- Integração: despacho exaustivo do palco inclui a nova cena; estados e DTOs reconhecem as quatro demonstrações do quiz; gabarito continua privado. O curso conserva a identidade curricular reservada e o outline histórico usado pelo seed.
- Editorial: nomes reais dos blocos e paletas, montagem da condição e do senão, etapas completas de entrega e separação entre investigar o conceito e construir o programa.

## Correções da revisão aprofundada

- **Empacotamento:** o módulo de navegação 3D não estava no Dockerfile. Incluído e coberto por teste que percorre os imports locais do executor e confere os arquivos copiados.
- **Navegação no Linux:** mundos WebGL por software simultâneos e leituras com uma tecla mantida pressionada causavam atraso, ultrapassagem das curvas e reprovação de soluções corretas. Os pedidos 3D agora usam uma cena por vez, metade da densidade de rasterização com o mesmo viewport CSS, leitura atômica de coordenadas, pulsos limitados de teclado e margem no caminho. Mantêm geometria, velocidade, regras e prazos. Não alteram variáveis do aluno.
- **Contratos:** chão delimitado, caminhos válidos e orçamento finito; navegação recusada no Pro antes de reservar o executor e indisponível no Python. Contratos gerados e fingerprint da imagem atualizados.
- **Objetivo de posição:** a etapa não pode passar mantendo as coordenadas de entrada. Exige mudanças em x e z sem impor os números da solução, e conserva a prova de alcance real.
- **Barco:** corrigida a velocidade quase imperceptível. O objetivo executado observa deslocamento, aviso, memória, luz e reinício. A velocidade antiga é recusada.
- **Estado das experiências:** validação estrita de modo, vista e eixo; misturas de objetivos incompatíveis recusadas. Lista, progresso e falas respeitam os objetivos configurados. Outra tentativa conserva evidências; desfazer e reiniciar têm efeitos distintos.
- **Zappy e quiz:** falas específicas para cada sentido dos eixos; demonstração aguarda a cena carregar; falha de WebGL não concede evidência. Alternativas neutras antes da escolha, explicação personalizada e nova tentativa. Gabarito privado no servidor.
- **Visibilidade:** câmera lateral ajustada para o farol não esconder a chave na própria comparação de pontos de vista. Enquadramento do contato e largura de 390 px conferidos.
- **Desempenho:** cena GLB reduzida de aproximadamente 1,76 MB para 110 KB, com carregamento sob demanda, descarte ao sair e sem renderização contínua em repouso.
- **Estrutura editorial:** documentos de módulo e aula adicionados. Caderno opcional somente na parte 2 da primeira aula; as seguintes remetem a ele. Roteiros usam os estados reais “Objetivo cumprido!”, “Salvo” e “Projeto enviado!”.
- **Encerramento:** publicação opcional no Mural, com passos reais, sem virar requisito. Acesso ao projeto conservado sem exigir novo envio ou verificação no encerramento.
- **PDF:** refeito em 23 páginas no template visual compartilhado de Cadê Todo Mundo e A Chave do Farol: Nunito/Baloo 2, capa, índice, cabeçalhos, cartões, passos numerados, esquemas nas cores reais dos blocos, experiências, testes, entrega e ajuda. Preflight impede cortes e sobreposição com rodapé.
- **Documentação:** diretrizes pedagógicas, comandos de reprodução no Chrome/Docker e contrato de reintegração do Molda atualizados. Artes de origem preservadas para a substituição posterior.

## Evidências

| Verificação | Resultado |
| --- | --- |
| Suíte editorial dos cursos | 357 testes passaram |
| Motor de cenas e quiz de Members | 957 testes passaram |
| Planejamento 3D, módulos fixados, empacotamento e checkpoints | 21 testes passaram |
| Identidade curricular, contratos Python, pedido do executor e checker de Members | 71 testes passaram |
| TypeScript: core, member-shell, admin, members e studio-runtime (incluindo testes) | Sem erros |
| Manifestos | 40 válidos |
| Roteiros | 220 clipes em 40 aulas, sem erros |
| Derivados ElevenLabs/edição | Conferidos contra as fontes |
| Navegador, componentes reais | Exploração em ordem alternativa, extremos, desfazer, reinícios, contato, quatro perguntas, erro/nova tentativa, conclusão e layout de 390 px passaram |
| PDF | 23 páginas renderizadas e inspecionadas; preflight aprovado |
| Chrome e executor Linux | Oito cenários aprovados em cada ambiente; imagem construída, perfil conferido e Docker sem rede |

Matriz do jogo no executor real, no Chrome local e no Docker:

| Projeto | Resultado esperado e observado |
| --- | --- |
| Solução completa | Sete objetivos executados aprovados |
| Chave em outro lugar alcançável | Sete objetivos executados aprovados |
| Sem guardar temChave | Vitória recusada; os demais comportamentos continuam aprovados |
| Chave alta demais | Coleta e vitória recusadas; movimento e teste sem chave aprovados |
| Sem comando de movimento | Objetivos executados recusados |
| Barco na velocidade antiga | Vitória recusada |
| Etapa de posição editada | Seis objetivos executados aprovados |
| Coordenadas de entrada intactas | Os dois objetivos de edição recusados |

Os comandos reproduzíveis estão no [mapa técnico](../../aulas-interativas-tecnico/modulos-a-ilha-do-farol.md). Screenshots e observações desta execução ficam em `.cache/ilha-do-farol/`. A prévia HTML usa os componentes reais; a correção local do quiz nessa prévia é exclusiva do ensaio autoral. Na aula, a correção permanece no servidor.

## Etapas de produção

Commit e merge em staging **local** fazem parte desta entrega, preservando os commits que chegaram a staging durante a revisão. Sem push, importação remota ou implantação.

Continuam como etapas de produção: receber e integrar os arquivos ajustados do Molda, repetir a inspeção visual e os testes de alcance/contato, produzir e revisar áudio/vídeo, anexar o PDF e publicar pelo Admin. A avaliação pedagógica com iniciantes continua sendo uma etapa própria: testes de software não comprovam aprendizagem.
