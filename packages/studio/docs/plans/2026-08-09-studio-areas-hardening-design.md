# Endurecimento das áreas do Studio

Data: 2026-08-09

## Objetivo

Corrigir as divergências encontradas na divisão em seis áreas e reduzir a chance de novos desvios entre parser, IR, Blockly, catálogo e documentação. A mudança deve preservar projetos antigos, manter a última IR válida durante edições incorretas na Ponte e evitar perda de capas em falhas transitórias de persistência.

## Arquitetura

Um registro compartilhado passa a definir as áreas de comportamento, as áreas do projeto e as áreas aceitas pelo catálogo. Os módulos de IR e Blockly derivam seus tipos desse registro; metadados específicos da interface, como frame e linha de organização, continuam no Blockly.

O parser delega a leitura dos marcadores de comportamento a um módulo dedicado. O marcador escolhe a área apenas para statements que aceitam mais de uma raiz. Statements estritos seguem o contrato de lifecycle, independentemente da seção textual em que aparecem. O roteador preserva a ordem relativa dentro de cada área e mantém as variantes legadas que protegem a ordem de ajustes antigos de inimigos.

## Validação da Ponte

O reverse parser valida a IR completa com `SZIRV2Schema` antes de atribuir IDs, gerar arquivos ou reconstruir o workspace. Erros semânticos viram diagnósticos de `script.js`; a Ponte conserva a última IR e o último `blocksState` válidos até o código voltar a representar um projeto válido.

Essa validação complementa o roteamento. O roteador evita estados inválidos conhecidos; o schema protege dependências entre áreas e futuras regras que o parser não deve duplicar.

## Persistência da capa

A memória de snapshots usa leitura e confirmação em duas fases. A captura recebe uma referência imutável para a foto atual, grava a miniatura e só então confirma o consumo. A confirmação compara a referência armazenada, de modo que uma foto mais recente, recebida durante a gravação, permaneça disponível.

Se a gravação falhar, a foto continua na memória e pode ser reutilizada numa tentativa posterior dentro do prazo de validade.

## Decomposição

Este lote extrai o registro de áreas e o codec das seções de comportamento. A extração reduz as responsabilidades de `parsers/project.ts` e cria uma fronteira pequena para testes de lifecycle. Os switches gerais de JS, schema, gerador e Blockly permanecem funcionais; sua migração integral para codecs exige lotes separados para evitar uma reescrita simultânea de milhares de contratos.

## Testes

Os testes cobrem:

- comandos comuns, eventos, loops, imports, variáveis e funções entre todos os marcadores;
- a validade de toda IR retornada sem erro semântico;
- `parse -> schema -> blocksState -> workspace headless`;
- preservação dos ajustes legados de inimigos;
- bloqueio da Ponte diante de IR semanticamente inválida;
- consumo da capa após sucesso, retenção após falha e proteção de foto concorrente mais nova;
- consistência entre o registro central, frames, catálogo e organização visual.

## Verificação

O lote termina com testes focados, suíte unitária completa, TypeScript, Biome, `git diff --check` e os cenários E2E das seis áreas no Chromium.
