# Lote 2 — review

- Arquivos continuam como entrada. Guias opcionais têm busca própria, sem truncar o catálogo em três itens e sem avaliar receitas quando ocultos. Aviso da conversão permanece.
- Abertura rápida com combobox/listbox, setas, Enter e Escape; máximo de 100 resultados e filtro por caminho. Breadcrumb de pasta abre essa busca no caminho; breadcrumb do arquivo revela a árvore.
- Descritores compartilhados alimentam menu e ações de cada instância Monaco. Disponibilidade resolvida novamente ao executar; F2 prepara a revisão existente. Ctrl+K permanece livre, Ctrl+Alt+K preserva Zappy.
- Review encontrou ausência da contribuição da paleta no Monaco modular. Corrigida no chunk exclusivo do Pro, junto a busca local, ir à linha e folding. Não importamos editor.main nem todo o Monaco no shell.
- Prova nova Chromium passou: Ctrl+P, abrir arquivo, F2 e revisão, cancelar com Escape, paleta F1 e comando registrado, Ctrl+Shift+F e arquivo fechado, Guias.
- Regressões de mudança de extensão/markers, recuperação, preservação de buffers/jogo através de layout, material e Zappy contextual passaram. Dezesseis testes de workspace passaram. Dois seletores do teste novo foram corrigidos (nome real do botão e combobox em vez de todo input); não foram contornadas falhas de produto.
- Staging reconferida: b030c443e, limpa. Typecheck completo e budgets fazem parte da verificação final; não inferimos sua aprovação dos testes focados.
