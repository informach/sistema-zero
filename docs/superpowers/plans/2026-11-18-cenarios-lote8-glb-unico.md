# Lote 8.3 — GLB único

Staging conferida em `5da218d5c`, limpa. Runtime/pacote Three e leitura ZIP estão registrados. Somente 8.3 continua ativa; não iniciar 8.4 ou outro lote.

- [x] Reutilizar `carregarCenaNoThree` em modo de água estática, sem guias/editor, e o gravador GLB já conferido. Fonte, revisão, nomes e propriedades permanecem dados, nunca código gerado.
- [x] Preservar matrizes afins também quando clipes obrigam TRS no GLTFExporter. Reutilizar `affineTrsChain` do Molda para os nós externos, sem implementar outra decomposição nem assar coordenadas globais em Float32.
- [x] Reutilizar a normalização de pele/clipes existente. Não omitir animações/skins. Uma transformação que o destino não representa deve bloquear somente GLB, com erro explícito; o pacote Three válido continua utilizável.
- [x] Incluir iluminação pontual suportada por glTF. Documentar água estática, céu/névoa/ambiente e física do formato. Preservar metadados lógicos em extras, sem afirmar que um visualizador GLB implementa regras ou colisões da plataforma.
- [x] Reabrir o arquivo real no GLTFLoader independente, conferir matrizes, geometria, materiais, limites, clipes/poses e validação Khronos. Três ciclos, cancelamento e autoria intacta; capturas e revisão.
- [x] Documentar/commitar este recorte verificado. 8.3 somente fecha depois do preparo autorizado Members/hosts/BFF e da interface completa de exportação, ainda pendentes.
