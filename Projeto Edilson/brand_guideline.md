# BRAND GUIDELINES: Smart Inventory UI (V2)

## 1. Princípios de Design
O ambiente de uso é industrial. A interface deve ser **funcional, rápida, de alto contraste e orientada a telas específicas** para não confundir o operador.

## 2. Paleta de Cores (Tema Dark Industrial)
- **Fundo Principal (Background):** `#1E1E24` (Cinza muito escuro/Chumbo)
- **Fundo Secundário (Painéis/Cards):** `#2B2D42` (Cinza azulado)
- **Texto Principal:** `#FFFFFF` (Branco) ou `#F8F9FA`
- **Texto Secundário:** `#8D99AE` (Cinza claro)

**Cores de Status (Feedback Crítico):**
- **Ação Neutra/Seleção:** `#3A86FF` (Azul tecnológico) - Caixa selecionada ou aguardando QR Code.
- **Sucesso/Acesso Liberado:** `#06D6A0` (Verde esmeralda) - Peso validado / Operação concluída.
- **Erro/Alerta:** `#EF233C` (Vermelho alerta) - Peso incorreto ou QR Code inválido.

## 3. Tipografia
- Fonte primária: `Roboto`, `Segoe UI` ou `Inter`.
- Os alertas e instruções ativas (ex: "PESE O ITEM AGORA") devem usar fontes gigantes (24pt a 32pt) para leitura à distância.

## 4. Estrutura de Navegação (Múltiplas Telas)
A aplicação deve usar um sistema de "Stacked Widgets" ou gerenciador de frames, contendo:

**A. Tela de Autenticação/Status**
- Campo simples para o operador inserir seu ID/Crachá antes de operar.
- O ID logado deve aparecer no canto superior direito de todas as outras telas.

**B. Tela Principal (Dashboard do Estoque)**
- Visão em grade (Matriz de botões/caixas) mostrando o status geral.
- Dois botões de ação massivos na base ou lateral: [ ➕ ENTRADA DE PEÇAS ] e [ ➖ RETIRADA DE PEÇAS ].

**C. Telas de Operação (Entrada/Retirada)**
- **Header:** Título da operação (ex: "MODO RETIRADA") e ID do funcionário logado.
- **Centro:** Ícone ou área de status indicando "AGUARDANDO LEITURA DO QR CODE...".
- **Após leitura:** Exibe os dados extraídos do QR Code (Peça, Tipo, Dimensões) em formato de "Card".
- **Painel Visual:** Mostra apenas o recorte ou destaque da linha/coluna onde a peça deve ser guardada/retirada (refletindo o LED físico).
- **Rodapé:** Botão de [ VOLTAR ] e Botão de [ SIMULAR BALANÇA ].

## 5. Comportamento e Interação
- **Leitura de Código de Barras/QR Code:** Leitores físicos normalmente funcionam como emuladores de teclado (digitam a string e apertam ENTER). A UI deve estar preparada para focar automaticamente em um campo de entrada oculto ou usar eventos de teclado para capturar o QR Code sem que o usuário precise clicar com o mouse.
- Pop-ups de erro devem ser muito claros e exigir um clique no botão "RECONHECER" (vermelho).