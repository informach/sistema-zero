# Cinco novos quadros do Bosque

Conferência local em 29/10/2026, staging `6461f19c0` com alterações não commitadas.
Nenhuma importação em staging ou produção. O arquivo agora contém seis quadros, incluindo
a Corrida dos bichos existente, e três variações diárias, separados por público.

## Evidência

| Prova | Resultado |
| --- | --- |
| Fonte determinística, schema, orçamento e repertório dos cursos | 4 testes, 395 asserções |
| Blockly real, dezoito projetos abrem e geram o mesmo código | 2 testes, 45 asserções |
| HTTP com repositório em memória, dois públicos sem duplicação | 20 testes, 168 asserções |
| Executor oficial Chromium, novos quadros | 5 testes, 21 cenários, 155 asserções |
| Tipagem focada dos projetos, objetivos e testes | exit 0 |
| Prévia no computador e celular emulado | 10 percursos completos com reinício |

O teste HTTP simula a porta Members; não simula a rota nem seu armazenamento em memória.
A execução é provada separadamente: gabaritos passam, todos os objetivos dos iniciais falham,
erros de intenção são rejeitados. Objetivo indisponível nunca conta como reprovação pedagógica.

A primeira regra de revisita só esperava perto do bicho. Como contato dispara na entrada,
não detectava contagem repetida. Agora sai e volta ao mesmo bicho, e o negativo reprova.
A alface também é revisitada depois da entrega: omitir sua retirada reprova.

O primeiro ensaio móvel revelou que o pad não acionava o evento da tecla ensinado. A correção
compartilha o despacho de tecla canônica sem KeyboardEvent sintético nem duplicação da ação.
Controles e ciclo de vida passaram em 68 testes e 257 asserções. A primeira falha de tipagem
foi corrigida pela validação do schema na fronteira do manifesto, sem cast nem supressão.

## Capturas e reprodução

`r1/` conserva o resultado parcial anterior à correção do toque. `r2/resultado.json` tem os
dez positivos e o fechamento do navegador. Computador 1280 × 844, celular emulado 390 × 844,
teclado e toque CDP nos botões reais, respectivamente. Sem erros de página/console, pedidos
externos ou rolagem horizontal. Capturas inspecionadas para legibilidade e sobreposição.

| Quadro | Computador | Celular |
| --- | --- | --- |
| Vagalume aceso | [imagem](r2/quadro-1-computador.png) | [imagem](r2/quadro-1-celular.png) |
| O lanche do coelho | [imagem](r2/quadro-2-computador.png) | [imagem](r2/quadro-2-celular.png) |
| Trilha das pegadas | [imagem](r2/quadro-3-computador.png) | [imagem](r2/quadro-3-celular.png) |
| Cuide dos quatro | [imagem](r2/quadro-4-computador.png) | [imagem](r2/quadro-4-celular.png) |
| Travessia tranquila | [imagem](r2/quadro-5-computador.png) | [imagem](r2/quadro-5-celular.png) |

Comandos em `docs/desafios-do-jogo/bosque/README.md`. Escolher uma pasta nova em
`ARQUIPELAGO_PRINTS` e o executável em `SZ_CHECK_CHROMIUM`. Não requer serviço, banco ou conta.

Ainda faltam a lista e abertura pelo Quadro das Cores no jogo, vínculos com cursos publicados
e aparelho físico. A equivalência adulta está no conteúdo e contrato, sem alegar teste de
aluno adulto autenticado. Os números não são medição de desempenho. L03 nas demais ilhas
continua aberto; novidades dos manifestos permanecem em rascunho.
