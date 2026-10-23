# Teste do Estúdio Python — Windows x64

Pacote de diagnóstico L0. Não instala o Estúdio, não modifica seus projetos e não exige administrador, Docker, Python ou Node instalados. Inclui ferramentas fixadas por versão/hash. Precisa de Chrome ou Edge instalado. Não altere as configurações de segurança do Windows para executá-lo; registre qualquer bloqueio.

1. Extraia o ZIP inteiro em uma pasta local (por exemplo, Downloads). Não execute de dentro do ZIP.
2. Conecte o computador à energia, deixe o navegador atualizado e feche programas que não usaria durante uma aula.
3. Abra o Terminal nessa pasta e execute um dos comandos abaixo. Um perfil temporário do navegador abrirá; mantenha a janela visível. São 30 ciclos Python e 30 conversões Pinta, além das provas funcionais.

Chrome, sem chamada:

```bat
.\executar.cmd chrome baseline
```

Edge, sem chamada:

```bat
.\executar.cmd edge baseline
```

Depois, abra a chamada de vídeo que costuma usar, com câmera e áudio nas condições habituais de aula. Repita com o mesmo navegador:

```bat
.\executar.cmd chrome video
```

Ou `.\executar.cmd edge video`. Deixe a janela do teste visível ao lado da chamada. O teste não abre nem grava a chamada; o rótulo `video` registra sua declaração. Anote à parte resolução/perfil da chamada, compartilhamento de tela e alimentação do computador para interpretar os resultados.

Os relatórios são JSON na pasta `.cache/studio-python-l0`: `browser-probes-*.json`, `reference-*/report.json`, `runner-*.json` e `kit-manifest.json`. Copie esses arquivos para análise, inclusive os que registrarem falha. Eles contêm CPU, RAM, Windows, versão do navegador, hashes das ferramentas, medições e erros; não coletam contas, câmera, microfone ou projetos. Nada é enviado automaticamente. Não precisa copiar `runtime` nem `pinta-bundle` de volta.

O pacote mede fatias experimentais. Recursos servidos localmente e sem cache não comprovam download real com rede de 20 Mbps/80 ms; este teste não homologa o player público, os jogos completos, Pyright ou 30 alunos. Memória livre do sistema é contexto, não medição exclusiva de memória WASM. As metas serão avaliadas no relatório; finalizar o teste não significa aprovação automática.

Pode apagar a pasta extraída após guardar os resultados. Para interromper, feche a janela do navegador de teste e aguarde o terminal mostrar “Teste encerrado”; nenhuma etapa seguinte será iniciada. Não feche o terminal antes disso, para permitir a limpeza. O prazo máximo por etapa é dez minutos; no timeout, o pacote encerra a árvore de processos que ele próprio iniciou e registra o resultado. Licenças e origens estão em `licenses` e no manifesto.
