# Exportação web Python e base do candidato verificável

Continuação do escopo aprovado. A exportação nativa permanece separada: `.py` e materiais para CPython/Tk no computador. Este lote prepara um pacote para servir o jogo no navegador e fornece a mesma receita ao futuro validador isolado do Construir. Não habilita publicação, deploy ou execução de candidato sem autoridade e evidência.

## Receita única

1. Capturar um snapshot Python sem rascunho visual pendente, com entrypoint, runtime, extensões, requirements/lock, arquivos e materiais íntegros. Não converter código nem executar arquivos no BFF.
2. O host autoriza o snapshot exato para execução e exige exportação de fonte permitida. Resolver a distribuição pelo host aprovado; nunca aceitar URL de runtime no projeto. Revalidar o contexto antes de entregar o download, respeitando cancelamento, perfil, baseline e epoch.
3. Obter metadados no namespace separado `/v1/runtime-deployments/:hash`. O serviço só devolve releases aprovadas, completas, ativas ou retiradas, com marcador de integridade e rechecagem de revogação. Verificar o contrato, identidade do runtime e bytes/hash de cada recurso no cliente do exportador. Não apresentar metadados como concessão de execução.
4. O runtime versionado inclui um launcher web leve que reutiliza `preparePythonFrameSession` e o protocolo existentes. Nenhuma cópia de coordenador, Monaco, Blockly, Ruff, Pyright ou React entra no jogo exportado. Releases anteriores sem launcher continuam executáveis e são identificadas como incompatíveis com esse formato de exportação; não alterar seus hashes nem substituir silenciosamente o ambiente.
5. ZIP: `index.html`/estilos e documentação gerados, `payload.json` com configuração e hashes, `project/` com os caminhos autorais, `runtime/<hash>/` com distribuição e licenças verificadas, manifesto de atribuição dos materiais. Prefixos separados evitam sobrescrever README, index, módulos ou assets do aluno.
6. Fonte privada não deve ser publicada acidentalmente no pacote web. Detectar arquivos sensíveis e valores conhecidos de segredos; recusar com diagnóstico de caminho, preservando o projeto. Não redigir silenciosamente o programa. A análise estática não prova a ausência de todos os segredos calculados.

## Execução e hospedagem

O launcher cria um iframe opaco sem `srcdoc`, com desafio e identidade novos por geração. Recebe eventos pelo canal existente; console limitado, entrada, parar e reiniciar continuam disponíveis. O código Python permanece no worker protegido. Descarte e resposta tardia respeitam a geração atual.

O pacote exige HTTP: módulos, WASM e workers não são qualificados em `file://`. O servidor estático gerado apenas entrega os arquivos do pacote; nunca importa ou executa o código do aluno. Fornece MIME correto para `.mjs`/WASM, CORS para o iframe opaco e CSP compatível com o runtime, sem listar diretórios ou aceitar traversal. Documentar execução local e configuração equivalente para hospedagem estática. Essa configuração pertence à documentação do pacote, não ao fluxo infantil do Estúdio.

Downloads e hashes têm limites por arquivo e totais da distribuição. Processamento de ZIP grande usa o worker existente; não instalar nem recompilar o ambiente por arquivo. A exportação é uma operação explícita fora do caminho de digitação/Execução.

## Verificações e revisão

- Metadados: upload incompleto, marcador corrompido, revogação durante leitura, runtime desconhecido, HEAD/CORS/no-store e namespace sem colisão.
- Pacote: JavaScript preservado; Python Clássico/Pro; arquivos/documentação autorais preservados; dependência não homologada recusada; byte/hash errado, limites, cancelamento e troca de perfil/projeto sem download tardio.
- Navegador real: abrir o ZIP por HTTP no Chrome/Edge, programa de console e Turtle com PNG, teclado/entrada, parar/reiniciar, screenshot e nenhuma chamada à conta/serviços do Estúdio. Conferir a origem opaca e a CSP; não afrouxar isolamento para viabilizar o teste.
- Conservar evidência dos tempos de inicialização e falhas. O teste funcional não substitui as trinta amostras do contrato de desempenho.
- Revisão independente antes de integrar a receita ao validador de candidatos. O Construir só chega à revisão aplicável com compilação CPython e smoke test isolado vinculados à mesma revisão; launcher ou screenshot sozinhos não são essa prova.
