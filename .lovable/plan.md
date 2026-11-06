# Importação Jikan autônoma

## Resultado
- O administrador inicia ou retoma a atualização; fechar o navegador não interrompe o trabalho.
- O painel mostra páginas confirmadas, espera após falhas temporárias, pedido de pausa, interrupções que exigem intervenção e conclusão.
- Pausar termina a página já adquirida e impede a próxima; retomar usa o checkpoint existente.

## Proteção da importação atual
- A execução completa estava na página 145 de 1.230, com uma página em processamento na consulta inicial.
- Não iniciar, reiniciar, pausar nem assumir automaticamente essa execução durante a implantação.
- Manter os comandos antigos compatíveis. A passagem para execução autônoma ocorrerá somente por ação explícita do administrador, com exclusão mútua entre navegador, executor e agendamento diário.
- Não alterar conteúdo editorial, traduções, listas, secrets ou o cron diário existente.

## Implementação
- Acrescentar controle persistido de execução e retentativas, separado do checkpoint atual, com autorização administrativa no servidor.
- Processar páginas em chamadas curtas, reutilizando a importação e as regras atuais de preservação.
- Acordar o executor quando houver trabalho. Manter tentativas programadas apenas enquanto existir execução ativa e retirar o agendamento quando pausada, concluída ou interrompida definitivamente.
- Substituir o ciclo de páginas do novo painel por comandos e consulta de progresso no servidor; manter importação avulsa compatível quando não houver execução autônoma.

## Detalhes técnicos
- Migração aditiva, com permissões explícitas e acesso restrito; não modificar registros de progresso existentes durante a instalação.
- Reutilizar a autenticação protegida do agendamento existente sem devolver tokens ao navegador.
- Aquisição atômica e identificação da concessão para impedir confirmações de executores antigos; reconciliar checkpoint antes de repetir uma página.
- Respeitar espera informada pela fonte e aplicar espera progressiva nas falhas transitórias. Recuperar chamadas interrompidas por prazo de concessão.
- Definir a cadência mínima viável após inspecionar o comando do cron existente; informar frequência, atraso máximo e impacto de custos antes de ativar qualquer frequência inferior a uma hora.

## Validação e publicação
- Testar autorização, exclusão mútua, retomada sem reinício, pausa entre páginas, retentativa e conclusão; executar testes existentes de preservação.
- Validar migração por consultas de estrutura e conferir que checkpoint e cron diário foram preservados.
- Conferir painel autenticado em 320, 390, 768 e 1280 px.
- Não usar a importação em andamento como teste destrutivo. Validar os fluxos isoladamente e informar explicitamente o que não puder ser exercitado em produção.
- Publicar as funções necessárias e confirmar respostas reais de status/autorização, sem iniciar trabalho sobre o catálogo atual.