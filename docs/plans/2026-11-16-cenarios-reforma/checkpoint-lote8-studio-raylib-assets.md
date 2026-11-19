# Lote 8.4 — Resolução de assets no auxiliar Python/Raylib

19/11/2026, continuação da `staging` em `38c33c519`. **8.4 permanece aberto.** Este recorte prepara o auxiliar oficial para os arquivos do Estúdio; não implementa ainda o botão de importação Python ou os quatro motores de blocos.

## Implementação e revisão

`Cenario(raiz, dados, arquivos=mapa)` recebe opcionalmente a relação completa entre caminhos lógicos do manifesto e arquivos físicos locais. `carregar` oferece a mesma opção. Chamadas anteriores continuam válidas. O manifesto, sua fonte, licenças e papéis não são reescritos para acomodar o filesystem do Estúdio.

O mapa cobre exatamente o inventário. Caminhos absolutos, URLs, travessia de diretórios e escapes por links são recusados. Tamanho, hash e cabeçalho são conferidos antes de carregar modelos; aliases incompatíveis não podem disfarçar MIME ou limites. A conferência física é compartilhada por arquivo. Modelos estáticos idênticos podem ser carregados uma vez; atores animados conservam modelos independentes por nó.

A revisão reproduziu um defeito adicional: animações de nós sem skin compartilhavam o modelo mutável. O teste falhou com uma instância quando esperava duas e passou após a inspeção considerar também clipes. Isso não acrescenta suporte a técnicas de animação que o destino não oferecia; corrige a propriedade das instâncias.

O builder registra `molda-scene-assets-v1` na distribuição. O catálogo continua aceitando releases anteriores. O registry e a exportação web exigem a capacidade na release exata para projetos Python com `scene3d`, antes de importar o executor ou baixar os arquivos do pacote web. Fontes desktop permanecem exportáveis. Não houve ativação remota de runtime, mudança de permissões ou implantação.

## Provas

- Quatorze casos CPython com o motor real do Estúdio: mapa completo/local, aliases estáticos, atores separados, alturas Float32 e máscara remapeadas, descarte e erros anteriores. A suíte Bun que os executa passou.
- Cena técnica real do exportador: 20 nós, 27 recursos lógicos, terreno, duas águas, três caminhos e avatar com quatro clipes. Não é a composição artística final da Faísca.
- Raylib nativo **6.0.1.0**, janela oculta: caminhos lógicos ausentes, arquivos físicos por digest, 441 consultas de chão e três ciclos de carregar/desenhar/descartar. [Captura](evidencias/lote8-studio-raylib-assets/native.png).
- Navegador Chrome/Pyodide/WebGL com a distribuição local imutável `ab3f4c2e24aedbc5a9764b0b9d888d17d653a7243511bc8a6be9e45638cb90bb`: 126 arquivos verificados. Os recursos, inclusive os binários, foram materializados pelo pipeline Python existente, sem escrita de binários pelo programa de prova. Execução/desenho/quatro clipes/descarte e precedência do módulo autoral passaram, sem erros de página. [Captura](evidencias/lote8-studio-raylib-assets/browser.png), [registro](evidencias/lote8-studio-raylib-assets/browser.json).
- 27 testes Bun de capacidades, registry, exportação web/desktop e auxiliar passaram, com 149 asserções. A regressão do registry foi observada falhando antes da proteção. Os 14 casos Python são internos à suíte do auxiliar; não somar como 14 testes Bun.
- Regressão do núcleo/motor: 604 testes, 15.826 asserções; tipagem integral do Estúdio e tipagem isolada do núcleo aprovadas, sem supressões. A verificação isolada encontrou e corrigiu uma anotação alargada no teste novo de capacidades. Fontes Python geradas conferidas com `--check`; Biome dos arquivos TypeScript/JavaScript alterados e `git diff --check` aprovados.
- A comparação nativo/Estúdio produziu os mesmos valores em 441 consultas de altura e nas matrizes de 44 ossos do quadro amostrado; ambos repetiram três ciclos de recursos.

As capturas mostram a mesma cena técnica nos dois destinos; não constituem aceite artístico, de animação perceptiva ou de desempenho em dispositivos físicos. A prova de assets usa o host de qualificação; o fluxo real **Trazer do Molda** ainda será testado após ligar adapter, interface e fontes Python.

## Continuidade obrigatória

Conectar o preparo à materialização Python sem duplicar recursos nem sobrescrever módulos; reaproveitar a adaptação de skins existente por uma entrada compartilhada sem ciclo Studio→Oficina; aplicar arquivos e assets atomicamente no store. Depois, integrar o host autorizado e o fluxo visual e só então os quatro motores. Publicação, lotes 9–10, composição final, full review, CI e implantação/validação de staging continuam pendentes.
