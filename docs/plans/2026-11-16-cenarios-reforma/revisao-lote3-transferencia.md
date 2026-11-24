# Lote 3.4 — Área de transferência e revisão integrada

17/11/2026 · staging · parte 3.4 implementada, testada e revisada localmente. O lote 3 permanece aberto; próxima parte interna: 3.5, espalhamento.

Copiar e colar fica disponível no cabeçalho da oficina, em todas as abas, com ações explícitas e atalhos nativos Ctrl+C, Ctrl+X e Ctrl+V. Os campos de texto e diálogos mantêm seu comportamento próprio. Duplicar continua uma ação distinta, com Ctrl+D: os objetos conservam os nomes e encaixes da duplicação existente; pastas, inclusive vazias, também podem ser duplicadas.

## Contrato e implementação

O fragmento tem formato e versão próprios, origem do espaço/cenário, raízes da escolha, âncora mundial e tabelas de modelos, formas, texturas, grupos, camadas e instâncias. Usa os limites do documento, até 8 MiB, sem binários ou URLs. A captura é uma leitura: confere medidas em uma cópia em memória, sem modificar nem criar revisão na origem. Apoios internos são remapeados; apoios externos e terreno tornam-se posições mundiais. Cor, textura, repetição, espelho, propriedades, giros e escala por eixo são conservados.

A intenção `fragmento.colar` gera IDs determinísticos a partir de um prefixo fornecido pelo chamador. Mantém referências equivalentes e cria aliases quando existe colisão, sem sobrescrever dados do destino. A seleção recebe os IDs novos e conserva o contexto de pasta. Mesmo uma colagem com centenas de objetos é uma ação atômica da fila e do histórico existentes; não usa restauração do cenário para simular uma colagem. A inversão continua usando seu contrato de restauração atômica quando o desfazer ultrapassa 500 comandos.

Recortar só troca o buffer depois de a exclusão ser aceita. Cadeados e vínculos externos impedem a exclusão completa, sem remover parte da escolha. Se o navegador negar acesso ao clipboard do sistema, o buffer de sessão permite colar entre cenários da mesma ferramenta e informa essa condição. Resposta assíncrona de colagem recebida após sair da oficina é descartada.

O espaço é conferido na interface, no serviço e na transação. Modelos e texturas continuam exigindo blobs confirmados, com o papel correto no espaço de destino. A coleta de arquivos considera também as referências dentro dos fragmentos dos lotes e inversos. Os arquivos sobrevivem ao undo e à exclusão do catálogo enquanto o histórico precisar deles; apagar o último cenário libera o conteúdo e a cota, inclusive quando ele só aparece no histórico.

O host HTTP pode receber o espaço autorizado explicitamente ao ler conteúdo fixado no cenário, sem depender de uma biblioteca ainda presente no catálogo. Isso permite renderizar referências coladas de uma biblioteca apagada. O endpoint continua aplicando suas autorizações; os downloads não levam cabeçalhos da sessão ao armazenamento.

## Revisão e correções

- A validação integral do comando agora precede a leitura de suas referências no serviço. Um fragmento incompleto era capaz de provocar `TypeError` antes da validação; o teste reproduziu o erro e passou após a correção, com recusa de domínio e revisão preservada.
- A proteção de modelos compartilhados inclui os acabamentos de caminhos e os modelos de lagos, além das instâncias. A inversão abre e repõe os cadeados próprios, dos grupos e das camadas necessários. Regressão conferida antes e depois da correção.
- As raízes da captura são explícitas. Colar uma pasta mantém sua identidade de organização, em vez de guardar apenas uma lista de seus objetos.
- A conferência de medidas é reutilizada diretamente por operações de leitura e escrita. Copiar não emite definições nem grava medidas incidentalmente.
- Uma referência de textura sem nome opcional era apresentada como Original do modelo, embora estivesse aplicada. O painel agora informa Textura aplicada; recusa visual reproduzida antes da correção e conferida depois.
- O ensaio aguarda a condição real do host assíncrono. Nesta versão do Playwright, uma Promise retornada ao `waitForFunction` era tratada como truthy; a reprodução demonstrou retorno `false`. A espera usa a condição de conteúdo do host, com prazo limitado, sem adicionar atrasos à aplicação.

## Verificação local

| Recorte | Resultado |
| --- | --- |
| Núcleo | 129 testes, 3.323 asserções |
| Motor | 42 testes, 581 asserções |
| Oficina e hosts | 48 testes, 319 asserções |
| Members, serviço/histórico/HTTP | 42 testes, 160 asserções |
| Postgres 17 descartável em 55439 | 22 testes, 171 asserções |
| Tipagem | Núcleo, motor, oficina e Members aprovados |
| Build da oficina | Aprovado; permanece o aviso de chunk acima de 500 kB |

Nenhuma falha nesses comandos. A integração Postgres cobre JSONB, replay, undo/redo após reabrir, referências malformadas, papéis incorretos, origem estrangeira, verificação transacional e liberação dos arquivos que só restam nos fragmentos históricos.

Chrome: 1.440 claro/escuro, 1.024 claro e 390 escuro. Foram usados GLB real do acervo, forma autoral, textura, cor, espelho, escala não uniforme e apoio entre objetos. Conferidos copiar/recortar/colar nativos, controles explícitos, mesma cena, outro cenário, colisão de referências, preservação da origem, pasta vazia, bloqueio de recorte, campos de texto, permissão negada, resposta atrasada após sair, reentrada sem biblioteca e recusa entre espaços. Nenhum erro de página ou console nesses ensaios.

Regressões de árvore/camadas e seleção por área passaram novamente. O ensaio de materiais também passou em claro/escuro/390 px, incluindo três ciclos com recursos estáveis em 23 chamadas, 30 geometrias e 7 texturas na GPU. Esses números pertencem à fixture; não aprovam desempenho em aparelho físico nem em uma Faísca decorada por inteiro.

## Evidências

- Colagem: [1.440 claro](evidencias/lote3-transferencia/colagem-light-1440.png), [1.024 claro](evidencias/lote3-transferencia/colagem-light-1024.png), [390 escuro](evidencias/lote3-transferencia/colagem-dark-390.png).
- [Vídeo do fluxo](evidencias/lote3-transferencia/transferencia.webm) e [resultados de transferência](evidencias/lote3-transferencia/resultado.json).
- Regressões: [organização](evidencias/lote3-transferencia/regressao-organizacao.json), [seleção](evidencias/lote3-transferencia/regressao-selecao.json), [texturas](evidencias/lote3-transferencia/regressao-texturas.json).
- Ensaio reproduzível: `node packages/molda-cenarios/playground/oficina/verificar-transferencia.mjs <saida>`, com a oficina em 4541 e o acervo local já usado pelos ensaios anteriores.

## Limites e sequência

Este fragmento contém objetos e pastas. Uma pasta que mistura caminhos, águas ou marcadores é recusada explicitamente, sem perder esses elementos. A extensão desses tipos precisa acompanhar suas ferramentas dos lotes 5–7; permanece registrada na execução integral. A área de transferência interna é de sessão; não é outro armazenamento de projetos.

A parte 3.4 reúne esta revisão e o [registro da organização/seleção](revisao-lote3-organizacao-selecao.md). A sequência continua exclusivamente no lote 3, por espalhamento, conjuntos, otimização e teste jogável. Não há aprovação artística da Faísca nem encerramento global. Implantação e validação remotas continuam reservadas ao final dos lotes e da revisão completa.
