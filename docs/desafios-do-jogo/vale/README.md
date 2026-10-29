# Proteja os ninhos do Vale dos Dinos

Pacote fase4-05, JavaScript em blocos, formato `arquipelago-desafios` v1, público Kids.
Arquivo: [vale.manifesto.json](vale.manifesto.json). Importação e publicação ficam para outra etapa.

| Desafio | Tipo | Quadro | Moedas | Extra |
| --- | --- | --- | --- | --- |
| Proteja os ninhos | Quadro das Cores | 6 | 20 | 10 |
| Mais uma onda | Desafio do dia | Nenhum | 10 | 5 |
| Dois pontos | Desafio do dia | Nenhum | 10 | 5 |
| Mais um ninho | Desafio do dia | Nenhum | 10 | 5 |

Valores derivados de `MOEDAS_PADRAO_POR_TIPO`; ordens 60 a 63; atração `proteja-os-ninhos`.
A busca nos manifestos locais não encontrou outro quadro do Vale. O Admin deve conferir o
cadastro de novo na importação. `publicar: true` prepara essa aplicação futura, sem publicá-la aqui.

## O que a criança completa

O cenário, a arte, a lista de ninhos, o desenho, os contadores e Recomeçar estão prontos.
O principal pede três regras: cobrir o ninho tocado, iniciar uma onda sem sobrepor passagens,
e percorrer os ninhos para contar os protegidos e os que receberam cinza. A cobertura dura
uma onda; cada ninho conta uma vez por passagem. A criança escolhe quando começa a onda,
com tempo livre para preparar as folhas. Cinza não destrói ovos nem retira conquistas.

O grupo `ninhos` é a lista de sprites. O dado `protegido` pertence a cada ninho, sem objeto
JavaScript escrito à mão. O desenho já lê essa marca. Os contadores se acumulam na rodada,
e o botão Recomeçar limpa tudo. O extra pede o mesmo reinício ao apertar Enter.

Nas variações, o jogo inicial funciona. Muda uma regra: `totalDeOndas` de 3 para 4; o valor
somado aos pontos de 1 para 2; ou acrescentar `ninho4`, já desenhado, ao grupo. A última
variação não copia regras: o mesmo evento de toque e o mesmo laço atendem ao novo item.

## Posto, blocos e arte

O Vale abre em Arquiteto (`architect`, posição 6), perfil `intermediario-3d`. O pacote usa
somente Jogo 2D e lógica até `intermediario-2d`, sem HTML, CSS, Canvas ou código livre.
A preparação da lista vem no inicial. Como no Members, a prova de currículo compara os tipos
acrescentados pelo gabarito com as listas locais dos postos até Arquiteto. Não há liberação
manual nem afirmação de que todos os conceitos novos já tenham um curso publicado.

SVGs embutidos desenham o vulcão, cinza, ninhos com ovos, folhas e botões. Nenhum arquivo
externo ou Blender. Palco de 640 × 480; ninhos 96 × 96; a cinza começa em y 140 e termina
quando passa de y 330, a 5 unidades por quadro. Três ondas no principal. São parâmetros
propostos para esta brincadeira, não dados sobre vulcões ou animais.

## Conferir

```powershell
bun docs/desafios-do-jogo/vale/gerar-manifesto.ts
bun test docs/desafios-do-jogo/vale/vale.test.ts packages/arquipelago-contracts/tests/manifesto-do-vale.test.ts
# No pacote studio:
bun test src/blockly/__tests__/valeManifest.test.ts
# Na raiz:
$env:SZ_CHECK_CHROMIUM='C:/Program Files/Google/Chrome/Application/chrome.exe'
bun test packages/studio-runtime/tests/vale-browser.test.ts
bun docs/desafios-do-jogo/vale/conferir-browser.ts
node --max-old-space-size=8192 packages/studio/node_modules/typescript/bin/tsc --noEmit -p docs/desafios-do-jogo/vale/tsconfig.json
```

O executor usa o runtime oficial e o julgador do core. Cada objetivo passa no gabarito e
falha no inicial; erros do executor não contam como reprovação pedagógica. Mutações verificam
lista ignorada, proteção contada em dobro, cobertura não renovada, onda sobreposta, quantidade
antiga, ponto antigo, quarto ninho fora da lista e Enter sem ação. Nenhum banco é usado.

Plano e resultados: [fase4-05](../../plans/2026-10-29-arquipelago-vale-minijogo.md).
