# Tarefas

- [x] Corrigir inserções indevidas em notificações e auditoria, preservar emissores legítimos e validar sem interferir na importação.
- [x] Revalidar a correção de notificações/auditoria; testes positivos/negativos aprovados e revisão sem os dois alertas críticos, apto à tentativa de publicação do painel.

- [x] Implementar execução Jikan autônoma no servidor, com início/retomada admin, pausa segura, retentativas limitadas ao trabalho ativo e progresso persistido; preservar importação em andamento e cron diário.
- [x] Validar autorização, preservação, falhas/retomada em banco isolado, painel autenticado em 320/390/768/1280 e publicar funções atualizadas; registrar limitações concretas.
- [ ] Validar ciclo autônomo completo em produção — bloqueado pela restrição de não interferir na importação anterior; depende de início/retomada explícita pelo administrador após a página atual.

- [x] Implementar espera progressiva, retomada automática persistida e status de falhas no painel Jikan.
- [x] Validar falha real do Jikan e pausa; recuperação simulada após recarregar, repetição da mesma página, erro permanente e responsividade em 320, 390, 768 e 1280 px.
- [x] Adicionar importação e atualização paginada pelo Jikan com preservação dos textos existentes.
- [x] Integrar capas e controles administrativos com pausa e retomada.
- [x] Testar preservação de textos e painel autenticado em 320, 390, 768 e 1280 px.
- [ ] Confirmar importação real e leitura das capas — bloqueado pela indisponibilidade do Jikan (timeout também na consulta direta).
- [x] Integrar o Kitsu (sucessor do Hummingbird) como fonte complementar: completar dados faltantes, sinopses ausentes via DeepL, capas reserva e animes novos com vínculo no MAL (Anime Relations Map); painel Admin → Catálogo → Kitsu.
- [ ] Executar uma primeira varredura do Kitsu no catálogo e conferir resultados no painel — depende da execução pelo administrador no painel.
- [x] Pesquisar e apresentar opções de tradução automática, sem ativar serviços pagos ou IA externa.- [x] Descobrir: consulta única com total exato, facetas globais, filtros na URL, layout compacto e enriquecimento Kitsu de gênero/estúdio/temporada.
