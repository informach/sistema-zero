# Menu adulto dentro e fora da aula

Correção local do componente canônico `CommunitySidebar` e do escopo do tema gerado. A presença de `.sz-lesson-ui` desligava os tokens adultos também no menu. A navegação agora preserva esses tokens em `.sz-community-chrome`; o conteúdo da aula continua com o tema compartilhado Kids. As unidades do menu preservam a escala adulta de 18 px, mesmo quando a aula usa raiz de 16 px.

## Conferência

- Renderização do componente real com o CSS canônico compilado, em dois documentos: com e sem a marca da aula. Conta de exemplo, sem dados nem autenticação reais.
- Comparados 67 elementos do menu fechado e 124 com o perfil aberto: posição, tamanho, fonte, peso, altura de linha, cor e fundo. Zero diferenças. Escape fecha o perfil e devolve o foco ao botão nos dois documentos.
- Largura: 259,1875 px. Texto da navegação: 17,1 px. Logo: 144 px. Fundo: `rgb(16, 20, 42)`.
- Em 390 × 844, o menu fica recolhido e o documento mede 390 px, sem rolagem lateral. Com altura de 450 px, o perfil aberto mede 306 px e começa em y = 35,109375 px nos dois documentos, com rolagem interna. Medidas capturadas após estabilizar o novo viewport.
- O último pixel exterior das imagens recortadas pode mostrar o fundo diferente da página; o interior e as medidas do menu são iguais.

Imagens: [fora da aula](fora-da-aula.png), [dentro da aula](dentro-da-aula.png), [perfil fora](fora-da-aula-perfil.png) e [perfil dentro](dentro-da-aula-perfil.png).

## Reprodução

```powershell
bun packages/community/scripts/prepare-sidebar-theme-qa.mjs .cache/minha-conferencia-menu --serve
bun test packages/ui/tests/lesson-theme.test.ts
```

O preparador exige um diretório novo em `.cache`, renderiza o componente real e compila o CSS com Node e o plugin oficial do Tailwind. Abre somente `127.0.0.1:5379`. Compare `/` e `/lesson.html`. Não é uma página autenticada da aplicação inteira.

Typecheck completo do pacote Community aprovado nesta composição. A checagem em rotas autenticadas e a implantação continuam como etapas da validação integrada; estas imagens não comprovam um deploy.
