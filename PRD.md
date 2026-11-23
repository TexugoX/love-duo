# PRD — Aplicativo de Casal (Android & iOS)

## 1. Visão Geral e Stack Técnica
- **Plataformas:** Android e iOS (Mobile-first, responsivo).
- **Frontend:** React Native + Expo (TypeScript) + Expo Router (navegação por abas).
- **Backend & Banco:** Supabase (PostgreSQL + Auth + Realtime + Storage).
- **Estilo Visual:** Paleta acolhedora e moderna (tons claros, pêssego/terracota suave, cards arredondados, ícones limpos).

## 2. Autenticação e Ligação do Casal
- **Login / Cadastro:**
  - Continuar com Google (no primeiro acesso, solicitar escolha de `@usuario` único).
  - Cadastro com E-mail: `Nome`, `Usuário (@username único)`, `E-mail`, `Senha`.
- **Vínculo do Casal (`couple_id`):**
  - Após login, se o usuário não tiver `couple_id` ativo, exibir tela "Conectar meu par".
  - Opção 1: Buscar pelo `@usuario` do parceiro e enviar convite (Aceitar/Recusar).
  - Opção 2: Gerar/digitar código curto de 6 caracteres.
  - Regra: Apenas 1 vínculo ativo por usuário por vez. Todos os módulos abaixo pertencem ao `couple_id`.

## 3. Navegação Principal (Barra Inferior com 5 Abas)
A barra inferior contém exatamente 5 abas: **Início**, **Tarefas**, **Listas**, **Calendário**, **Perfil**.

### Aba 1: Início (Resumo Geral)
- **Contador do Casal:** Tempo exato juntos (anos, meses, dias, horas) calculado a partir da data/hora no Perfil do Casal + Status da relação.
- **Pulso Rápido:** Último "Dengo" (emoji/recado/pedido) recebido com botão de resposta rápida.
- **Radar do Dia:** Status discreto do ciclo/cuidado, próximo evento com contagem regressiva e pendências rápidas de tarefas/despensa.

### Aba 2: Tarefas
Dividida em duas seções/sub-abas:
1. **Rotinas de Casa:** Afazeres domésticos compartilhados, recorrência e marcação de conclusão em tempo real.
2. **Rotinas da Relação (Dengo):**
   - **Reações em Emojis:** Envio rápido (beijo, abraço, raiva, "vai varrer" + atalhos personalizados do casal) + **Recadinho rápido** opcional.
   - **Mural Visual:** Área estilo lousa/papel para desenho rápido ou bilhete manuscrito/visual.
   - **Pedir Dengo (Pedidos rápidos de cuidado):** Botões editáveis (*Bolsa quente*, *Remédio*, *Fique comigo*, *Preciso ficar sozinha*). Quem recebe vê alerta com ações **"ESTOU INDO"** ou **"NÃO CONSIGO AGORA"**.
   - **Mood do Dia + Sugestões:** Seletor de humor diário que exibe sugestões práticas de carinho/cuidado para o parceiro.
   - **Histórico:** Lista cronológica de enviados e recebidos.

### Aba 3: Listas
Dividida em 4 sub-abas/filtros internos:
1. **Despesas do Casal:** Registro de gastos compartilhados, quem pagou e resumo mensal simples mostrando o saldo ("quem deve a quem").
2. **Despensa:** Estoque doméstico atual com botão rápido *"Acabou → Enviar para Lista de Compra"*.
3. **Lista de Compra:** Itens do dia a dia/mercado sincronizados em tempo real.
4. **Modo Obra:** Criação de cômodos personalizados (ex.: Cozinha, Quarto, Banheiro). Dentro de cada cômodo, lista de itens a comprar com status (*A cotar/Comprar*, *Comprado*, *Prioridade*) e opção de lançar valor direto em *Despesas do Casal*.

### Aba 4: Calendário
Dividida em 3 sub-abas:
1. **Próximos Eventos, Memórias & Shows:**
   - Lista cronológica dos próximos eventos com contagem regressiva para datas especiais.
   - Galeria de Memórias e **Shows Visitados** (histórico de shows já idos com fotos, local e artista) + **Ranking Automático de Artistas mais vistos** (visão Individual e visão do Casal).
2. **Calendário:**
   - Agenda compartilhada. Ao criar evento, selecionar categoria com ícone/cor: *Show/Festival* (com campo de Artista/Banda), *Festa/Aniversário*, *Apresentação de Escola do filho*, *Encontro a dois*, *Viagem*, *Compromisso/Saúde* ou *Personalizado*.
   - Eventos passados da categoria *Show/Festival* alimentam automaticamente o histórico/ranking de shows.
3. **Sintonia do Ciclo:**
   - **Fases do ciclo**, **Intimidade**, **Cuidado** e **Pedidos para o próximo encontro a dois**.
   - **Cofre Protegido por Senha (PIN/Biometria):** Espaço restrito onde um envia um **recado quente efêmero** para o outro. O recado só abre após o PIN/biometria e é **excluído definitivamente do banco ao fechar/sair da tela de leitura**.

### Aba 5: Perfil
Dividida em 2 sub-abas:
1. **Meu Perfil:** Foto, Nome, `@usuario`, E-mail, configuração do PIN/biometria da aba secreta e destaque de "Artista #1 / Total de Shows".
2. **Perfil do Casal:** Status (*Namorados*, *Noivos*, *Casados*, *Morando juntos*), seletor de **Data e Hora de início** da relação, Perguntas básicas/Sobre nós e gestão/desvinculação do casal.