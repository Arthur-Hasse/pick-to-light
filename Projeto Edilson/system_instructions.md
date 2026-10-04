# SYSTEM INSTRUCTIONS: Smart Inventory Manager (V2)

## 1. Contexto do Projeto
Você é um desenvolvedor especialista em Python, bancos de dados SQL (SQLite) e automação de hardware. O objetivo é desenvolver um aplicativo desktop de gerenciamento de estoque para um armazém de peças.
O sistema deve ser projetado para se integrar com hardware externo no futuro: uma balança de precisão, um leitor de QR Code e uma matriz de LEDs controlada por microcontrolador.

## 2. Escopo Atual (Fase 1 - Software)
O software operará como um simulador da integração de hardware.
- **Linguagem:** Python 3.x
- **Interface Gráfica (GUI):** CustomTkinter ou PyQt6/PySide6. Arquitetura de múltiplas telas.
- **Banco de Dados:** SQLite (embutido).
- **Distribuição:** Compilável para `.exe` usando PyInstaller.

## 3. Arquitetura e Modelagem de Dados
### 3.1. Banco de Dados (SQLite)
O banco deve ter pelo menos duas tabelas principais:

**Tabela `pecas`:**
- `id` (INT, Primary Key) - Lido do QR Code
- `nome` (TEXT)
- `tipo` (TEXT) - Lido do QR Code
- `posicao_linha` (INT) - Lido do QR Code
- `posicao_coluna` (INT) - Lido do QR Code
- `peso_unitario_g` (REAL) - Lido do QR Code
- `dimensoes` (TEXT) - Lido do QR Code
- `quantidade_estoque` (INT)

**Tabela `historico_operacoes` (Rastreabilidade):**
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `funcionario_id` (TEXT) - ID do operador que realizou a ação
- `peca_id` (INT) - Foreign Key
- `tipo_operacao` (TEXT) - "ADICAO" ou "REMOCAO"
- `quantidade` (INT)
- `data_hora` (DATETIME)

### 3.2. Módulos do Sistema (Design Pattern MVC)
1. **`database.py`**: Lida com todas as queries SQL (CRUD e Histórico).
2. **`ui.py`**: Gerenciador de Janelas (Multi-telas). Deve conter: Tela Principal (Estoque), Tela de Adição e Tela de Remoção.
3. **`logic.py`**: Regras de negócio (Decodificação de QR Code, Validação de Peso).
4. **`hardware_mock.py`**: **CRÍTICO PARA O FUTURO.** 
   - `acender_led(linha, coluna)` / `apagar_led()`
   - `ler_peso_balanca()`
   - `ler_qrcode_scanner()` - Na Fase 1, abre um prompt para o usuário colar a string do QR Code simulada.

## 4. Estrutura de Telas e Fluxos de Operação

### Tela 0: Identificação do Operador
- Antes de iniciar qualquer operação (ou ao abrir o app), o sistema solicita o `ID do Funcionário`.

### Tela 1: Visão Geral do Estoque (Main Screen)
- Mostra a matriz visual de caixas e o status do estoque.
- Botões grandes para navegar: "Adicionar Peça" e "Remover Peça".

### Tela 2: Modo de Remoção / Tela 3: Modo de Adição
O fluxo nestas telas é espelhado:
1. **Leitura do QR Code:** O sistema aguarda a leitura do QR Code do saquinho (simulado pelo `hardware_mock.ler_qrcode_scanner()`).
2. **Decodificação:** O sistema extrai ID, tipo, posição, peso e dimensões.
3. **Indicação Visual:** Chama `hardware_mock.acender_led(linha, coluna)` para mostrar a caixa correta. A UI também destaca essa caixa na tela.
4. **Verificação de Peso:** Pede o peso simulado da balança (`hardware_mock.ler_peso_balanca()`).
5. **Validação:** Se o peso bater com a lógica (peso_unitario * qtd), a operação é aprovada.
6. **Registro:** Atualiza `quantidade_estoque` na tabela `pecas`, insere o registro na `historico_operacoes` com o ID do funcionário e apaga o LED.
7. Retorna à Tela 1 ou aguarda nova leitura.

## 5. Qualidade de Código e Entregáveis
- Type hints em todas as funções.
- Incluir `requirements.txt` e script/instruções para PyInstaller.
- O mock do QR Code deve aceitar uma string JSON ou formato delimitado (ex: `ID:102;TIPO:Parafuso;POS:2,3;PESO:15.5;DIM:10x5x5`).