# Aceite externo da evolução do Molda

Preparado em 10/09/2026. Os itens abaixo ainda não foram executados nesta retomada.
Evidência automatizada e compatibilidade ficam nos documentos de retomada e formatos.

## Dispositivos e desempenho

Registrar modelo do aparelho, memória, sistema, navegador/versão, GPU, modo de energia,
resolução, zoom e forma de entrada. Cobrir computador/Chromebook com mouse e trackpad,
tablet com toque e celular nas edições simples previstas. Testar temas claro/escuro e
preferência de movimento reduzido depois que a outra sessão entregar a interface.

Em cada aparelho, usar uma cena representativa e outra de stress com até 128 partes,
20 mil triângulos e pinturas de 1024². Registrar arquivos usados e medição p50/p95, após
aquecimento, de frames durante órbita/transformação/pintura e de entrada até a prévia.
Critérios do plano: frame p95 até 16,7 ms no representativo e 33,3 ms no stress; prévia de
entrada p95 até 50 ms. Incluir primeiro toque e confirmação do pincel de pesos, não só
movimento posterior. Registrar progresso/cancelamento de exportação e backup extremos.

Confirmar pausa em aba oculta, ausência de render contínuo ocioso e vinte ciclos de abrir,
editar, voltar e reabrir. O e2e de Chromium fornece o método de heap/DOM/contextos; nos
outros aparelhos usar as ferramentas de diagnóstico do navegador e registrar seus limites.
Se os tempos excederem os critérios, o aceite de desempenho permanece aberto e deve haver
nova otimização medida antes de marcar as fases relacionadas como concluídas.

## Conta, arquivos e recuperação

Seguir primeiro a ordem de `2026-09-10-molda-rollout.md`, em ambiente de homologação.

1. Dois perfis no mesmo aparelho: criar, salvar, trocar de perfil durante upload/importação
   e conferir que nenhuma criação/vínculo aparece no perfil errado.
2. Mesmo perfil em dois aparelhos: modelo legado promovido em um, edição antiga no outro,
   upload/descida, conflito, exclusão e restauração. Conferir o original e a versão final.
3. Arquivos glTF/OBJ/bbmodel externos representativos: comparar prévia, relatório, UV, cores,
   hierarquia e clipes dentro do contrato de formatos; recusar perdas e confirmar que a
   oficina anterior permanece intacta. Usar `.molda.json` para preservar dados nativos.
4. Modelo com clipes/skin no Estúdio: escolher projeto, trazer, reproduzir duas instâncias,
   reiniciar, editar no Molda e ressincronizar. Verificar revisão e opção de manter a cópia.
5. Offline, armazenamento indisponível/sem quota, WebGL perdido e módulo indisponível:
   confirmar mensagem compreensível, possibilidade de recuperar o projeto e retomada.
6. Backup misto: baixar, restaurar, reabrir as cópias e confirmar que os originais continuam.

## Uso com crianças de 9–11 anos

Com acompanhamento da pessoa responsável pela avaliação, pedir tarefas curtas no layout
final: começar por um modelo pronto, acrescentar uma forma, desfazer, pintar, dar movimento,
salvar/reabrir e usar no Estúdio. Em outra tarefa, abrir uma criação com aviso de conversão
e explicar com as próprias palavras o que será mantido e o que mudará na cópia.

Registrar tarefa, aparelho, ponto de dificuldade, ajuda necessária e resultado; medir tempo
para encontrar as ações sem transformar velocidade em prova de compreensão. Não coletar
dados pessoais desnecessários. O aceite exige conseguir recuperar erros e compreender a
diferença entre projeto editável e arquivo exportado. Dificuldades recorrentes voltam como
ajustes de interface/dicas e são verificadas de novo antes de encerrar a fase 9.

## Registro do aceite

| Data / responsável | Aparelho / versão | Cenário / arquivo | Resultado e evidência | Pendência / correção |
| --- | --- | --- | --- | --- |
| A preencher após execução | — | — | Não executado | — |

Não substituir este registro por contagem de testes unitários ou emulação de viewport.
