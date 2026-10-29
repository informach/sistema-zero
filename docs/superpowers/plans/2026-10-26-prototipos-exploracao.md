# Protótipos Cadê Todo Mundo e revisão Farol

**Objetivo:** demonstrar exploração livre nas duas experiências do Cadê Todo Mundo e eliminar ambiguidades entre programação, entrada e execução no Farol.
**Direção aprovada:** manter componentes e estilo atuais; orientação por objetivos, liberdade para repetir e observar em qualquer ordem; comparar antes e depois em HTML local.
**Arquitetura:** arquivos exclusivos em docs/design. Antes importa componentes reais. Depois reutiliza palcos e motor com modelos locais explícitos. Sem alterar cursos, manifestos ou componentes de produção.
**Tecnologias:** React, TypeScript, Bun, CSS real da aplicação, Chrome/Playwright.

- [x] Criar docs/design/cade-exploracao-antes-depois: duas experiências, modelos locais, comparador, fontes incorporadas, teste da versão atual e da proposta.
- [x] Separar no Farol bloco presente, tecla apertada e avanço do tempo; mostrar ausência do bloco como ausência e não como tecla solta; testar matriz de situações.
- [x] Revisar linguagem, estado visual, reinícios, repetição, orientações, quiz, objetivos e apresentação responsiva nas sete partes do Farol; registrar achados e correções.
- [x] Gerar os dois HTMLs, testar comportamento e apresentação em desktop/celular, inspecionar imagens e entregar links.

Verificações: casos em ordem alternativa, repetição depois da conclusão, reinícios preservando descobertas, ausência de efeito retroativo ao editar regras; teclado/foco; sem rede obrigatória; zero erros de página. Preservar alterações alheias e os protótipos anteriores do Cadê Todo Mundo.
