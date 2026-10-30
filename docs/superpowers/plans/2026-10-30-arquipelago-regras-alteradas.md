# C01c: repertório das regras alteradas

## Problema e decisão

O Members hoje calcula diferença de tipos entre inicial e gabarito. Um Se já presente com
condição incompleta ou um Para cada com corpo vazio desaparece dessa diferença, embora
completá-lo peça compreender a regra. A barreira C01a não recebe o que essa diferença omite.

Derivar por conteúdo dos blocos, não apenas por tipo. Apoio idêntico continua dispensado.
Blocos acrescentados, retirados ou alterados entram nos requisitos. Um contêiner cujo corpo
muda também entra, pois completar um laço não é o mesmo que só observar um laço pronto.
Campos, entradas, estado extra e desativação são conteúdo; IDs, coordenadas de editor,
comentários e recolhimento visual não são. Não analisar imagens, arquivos gerados ou arte.

Comparar multiconjuntos de assinaturas para não confundir trocar IDs ou repetir um bloco
com nova aprendizagem. Assinar entradas com suas cadeias completas, mas excluir `next` da
assinatura própria: acrescentar uma ação no fim não torna todo o apoio anterior uma tarefa.
Na moldura, conferir também a ordem relativa das ações mantidas. Nas entradas de contêineres,
a ordem já participa da assinatura do corpo. Molduras continuam fora da lista de ferramentas.

Usar travessia iterativa e assinaturas de tamanho constante, sem serializar cada sufixo de
uma cadeia. Manter os limites e a recusa de ciclos/IDs duplicados do leitor do Estúdio.
Nenhuma assinatura é persistida ou vira autoridade de aprovação. O executor continua provando
o comportamento. Conclusões e publicações antigas conservam seus snapshots; a nova derivação
vale na análise de nova publicação, sem alterar promoção, carteira, contrato ou salvamento.

## Etapas e provas

- [x] Regra pura com valores/condições alterados, corpo antes vazio, cópia adicional,
  retirada, reordenação, IDs/posição/comentários, cadeia grande, ciclo e IDs duplicados.
- [x] Integração na análise do Members e prova de regressão pelo verificador das aulas.
- [x] Reanalisar os pacotes locais para distinguir ferramentas realmente cobradas do apoio
  inalterado. Fonte ausente continua pendência, sem bloco manual ou curso fictício.
- [x] Testes dos pacotes envolvidos, tipagem, Biome, revisão completa e documentação.
- [ ] Commit e merge local.

## Limites

Essa derivação é conservadora e descreve ferramentas modificadas, não aprendizado observado.
Trocar somente cor ou texto também muda campos do bloco e mantém o requisito daquela ferramenta.
Objetivos pedagógicos continuam avaliando comportamento, sem exigir cores ou nomes do gabarito.
Python e projetos textuais/Pro ficam no C02, com autorização e evidência próprias.

## Revisão e achados adicionais

A lista informativa de blocos desconhecidos não impedia publicação: a API considera
`problemas`, e os desconhecidos não chegavam à derivação. Agora a presença no inicial ou
gabarito é um problema impeditivo, antes de chamar o executor. Ambos os testes falharam
antes da correção e passaram depois. O teste do laço já presente também reproduziu a lacuna.

A reanálise usa a mesma função em `docs/desafios-do-jogo/regras-a-completar.ts`, com 108
entradas e comparação do JSON gerado no teste do Members. Dez entradas têm projetos com
IDs repetidos: os quatro jogos da corrida da Vila e Pulo com apoio do Pico, em Kids e adulto.
O leitor já recusava isso antes deste lote. Esses erros aparecem como `problema` e listas
nulas, nunca como ausência de requisitos. Corrigir as fábricas de IR e regenerar em C01d.

Revisão de custo: travessia iterativa, hashes de tamanho constante e comparação de ordens
linear. Nenhum recurso visual, banco, formato de salvamento ou regra do executor mudou.
A conferência no navegador do Bosque pertence ao C01b2a; não há prova visual nova neste lote.

## Verificação do lote

- Testes dirigidos: 24 aprovados, 195 asserções; regressões demonstradas antes da correção.
- Members completo: `bun test --timeout 30000`, 2.131 aprovados, 559 ignorados, zero falhas,
  16.156 asserções em 333 arquivos. Banco não configurado e testes dependentes ignorados.
- API, repertório/equipe/manifestos: 49 aprovados, 378 asserções, sem banco.
- `NODE_OPTIONS=--max-old-space-size=8192 bunx tsc --noEmit` em Members: aprovado.
  Uma execução anterior encontrou um alias de pasta inexistente no gerador do relatório;
  removido e a execução final passou.
- Geração repetida do relatório, Biome dos sete arquivos TS/JSON e `git diff --check` aprovados.
- Revisão do diff: apoio intacto, limites, bloqueio antes do executor, fronteiras, respostas
  e documentação conferidos. Publicação remota, migrações e salvamento não foram alterados.

## Pedidos de arte

Nenhum. Mudança de análise no servidor, sem interface visual nova.
