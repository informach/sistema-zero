# Jogos visuais e conquistas por linguagem — checkpoint de integração

## Código revisado

Pac-Man e Space Arena têm duas entradas cada na galeria: Clássico em Blocos/Ponte
e Pro em Código. Cada par compartilha os mesmos fontes Python e assets. O motor
recebe formas compostas Turtle oficiais e controles de cotas gerais; não contém
uma implementação escondida dos jogos. A qualificação R4 usa o loader real,
roundtrip Blockly e edições reais, sem blocos opacos.

O Estúdio Completo usa as conquistas do próprio perfil e público. Cursos
JavaScript não concedem blocos Python equivalentes. O servidor reutiliza a união
atual e congelada de `studioUnlockBlocks`, sem migração. Admin recebe todos os
blocos e extensões homologados. A criação Python continua visível apenas para
admins; a elegibilidade por curso é uma regra independente dessa apresentação.
Aulas e salas mantêm sua curadoria contextual.

O Admin oferece recompensas por linguagem e salva auxiliares explicitamente.
O servidor recusa IDs Python desconhecidos, duplicados ou conjuntos incompletos.
O runtime nunca completa uma conquista inventando permissões. Pro permanece
código livre após os direitos de produto, curso, Pro e runtime.

O novo teto JavaScript `grantedBlockIds` diferencia ausência de um conjunto vazio
sem alterar a semântica antiga de curadoria `allowBlocks: []`. Busca, toolbox,
flyouts, ferramentas do projeto, extensões e Zappy compartilham o mesmo filtro.
Python usa snapshots imutáveis de autoridade: uma resposta antiga não restaura
permissões retiradas e uma mudança efetiva atualiza a oferta sem recriar parsers,
registry ou documento.

## Achados corrigidos na revisão

- Reuso de formas após `clear()` reservava cotas indevidamente.
- A cópia de exemplo precisava conferir os blocos/modos da decisão final, além
  do catálogo consultado antes de preparar o projeto.
- Um perfil com conquistas somente Python poderia receber a paleta JavaScript
  inteira ao interpretar uma lista vazia como curadoria por nível.
- A curadoria JavaScript inicial ocultava conquistas recebidas posteriormente.
- A paleta Python mantinha os IDs do bootstrap após uma autorização mais restrita.
- Revogar/restaurar extensão descarregava o documento e podia perder edições.
  A hidratação agora pertence à preparação do documento; mudanças de acesso ou
  modo preservam fonte, rascunhos e estado de edição.
- O seletor Admin ficava preso quando a release escolhida era retirada e restava
  uma única alternativa. A recuperação agora exige escolha explícita e preserva IDs.

## Evidências e checagens

Os [recibos dos jogos e da distribuição](2026-10-22-python-reference-games-visual-evidence/)
são imutáveis. `ui-r12` comprova os quatro percursos gráficos na candidata final
do motor: galeria, edição, Ponte, salvar/reabrir, revisão exata, entrada causal em
pixels e Stop. A nova rodada gráfica após as regras de conquista é uma pendência
explícita deste checkpoint, sem herdar aprovação por inferência.

Checagens locais executadas neste lote, sem somar wrappers e seus casos internos:

| Recorte | Resultado |
| --- | --- |
| Motor Turtle, modelo Pac-Man, modelo Space Arena | 31, 12 e 13 testes aprovados |
| Qualificador configurado com CPython/Pyodide real | 10 testes, zero skips |
| Catálogo de recompensas, incluindo import nativo Node sem browser/rede | 5 testes, 33 asserções |
| Members HTTP/runtime/recompensas reexecutados pelo root | 47 testes, 350 asserções |
| Admin seletor, metadados e dependências reexecutados pelo root | 13 testes, 94 asserções |
| Autoridade, extensões e lease visual reexecutados pelo root | 41 testes, 207 asserções; wrapper visual sem dupla contagem |
| StudioCore real isolado após o reparo de hidratação | 23 casos internos, 155 asserções |
| Host real isolado após a assinatura da autoridade | 11 casos internos, 110 asserções |
| Geradores de fontes/sons/metadados e seus negativos | verificações de geração e 5 testes, 62 asserções |

Tipagem completa aprovada em Admin, Core, Members, Member Shell e Studio;
Studio Runtime passou também no `tsconfig.test.json`, e o serviço de linguagem
passou nos três projetos TypeScript. As verificações foram seriais, com Node
24.22.0 e TypeScript do lockfile. Biome conferiu os 221 arquivos de código/config
alterados; `git diff --check` passou. O fingerprint da imagem foi regenerado e
conferido, sem afirmar que uma imagem antiga corresponde a ele.

A distribuição `e3188c84b1b63baee730656ea1399e6ee4d03946e6cbe6cbee57ef92bc43f8e9`
foi reproduzida três vezes, mantendo os mesmos 41 arquivos. O
[plano atual](../superpowers/plans/2026-10-22-python-current-candidate/README.md)
contém os comandos portáveis e os limites da implantação. Os resultados de
desempenho remotos em `65c9bffd…` pertencem à candidata anterior.

## Implantação e pendências

Este checkpoint disponibiliza código revisado para integração entre sessões;
não declara a homologação final do produto Python. A rodada gráfica integrada,
CI/imagem, fluxos autenticados hospedados Admin→aluno, aulas/salas/Mural, áudio
ouvido por pessoa e máquina de referência continuam qualificados separadamente.

O login Railway foi restabelecido pelo usuário. As consultas readonly confirmaram
ausência do catálogo Members em staging e um catálogo antigo no Worker. Nenhuma
chave, variável ou namespace remoto foi alterado por essas consultas. A ativação
exige conciliação explícita, imagem atual e os gates de drenagem do serviço de
linguagem; não haverá leitor de metadados Python antigos para acomodar a configuração.
O daemon Docker local não respondeu nesta sessão; o CI já contém construção da
imagem e smoke sem rede. A rotação das chaves Railway pertence a outra sessão.
