import database
import hardware_mock
from typing import Dict, Any, Tuple, Optional

# Margem de erro permitida para a balança (ex: 5%)
TOLERANCIA_PESO = 0.05

def validar_peso(peso_medido: float, peso_unitario: float, quantidade: int) -> bool:
    """Valida se o peso medido está dentro da tolerância do peso esperado."""
    peso_esperado = peso_unitario * quantidade
    margem = peso_esperado * TOLERANCIA_PESO
    
    limite_inferior = peso_esperado - margem
    limite_superior = peso_esperado + margem
    
    return limite_inferior <= peso_medido <= limite_superior

def processar_operacao(funcionario_id: str, peca_data: Dict[str, Any], tipo_operacao: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Processa o fluxo completo de adição ou remoção de peça.
    Retorna uma tupla: (Sucesso (bool), Mensagem (str), Dados da Peça (dict))
    """
    # Salva/Atualiza metadados da peça no banco
    database.upsert_peca(peca_data)
    
    quantidade_operacao = int(peca_data.get('quantidade', 0))
    if quantidade_operacao <= 0:
        return False, "Quantidade deve ser maior que 0.", peca_data
        
    # Verificar se há estoque suficiente em caso de remoção
    if tipo_operacao == "REMOCAO":
        peca_db = database.get_peca(peca_data['id'])
        if not peca_db or peca_db['quantidade_estoque'] < quantidade_operacao:
            return False, f"Estoque insuficiente. Disponível: {peca_db['quantidade_estoque'] if peca_db else 0}", peca_data

    # 2. Indicação Visual
    hardware_mock.acender_led(peca_data['posicao_linha'], peca_data['posicao_coluna'])
    
    # 3. Verificação de Peso
    peso_esperado_total = float(peca_data['peso_unitario_g']) * quantidade_operacao
    peso_medido = hardware_mock.ler_peso_balanca(peso_esperado=peso_esperado_total)
    
    if peso_medido is None:
        hardware_mock.apagar_led()
        return False, "Operação cancelada (Peso não informado).", peca_data
        
    # 4. Validação
    if not validar_peso(peso_medido, float(peca_data['peso_unitario_g']), quantidade_operacao):
        hardware_mock.apagar_led()
        return False, f"Erro de peso! Esperado ~{peso_esperado_total}g, Lido: {peso_medido}g", peca_data
        
    # 5. Registro
    qtd_alteracao = quantidade_operacao if tipo_operacao == "ADICAO" else -quantidade_operacao
    try:
        nova_qtd = database.update_estoque(peca_data['id'], qtd_alteracao)
        database.registrar_operacao(funcionario_id, peca_data['id'], tipo_operacao, quantidade_operacao)
        hardware_mock.apagar_led()
        
        return True, f"Operação concluída. Novo estoque: {nova_qtd}", peca_data
    except Exception as e:
        hardware_mock.apagar_led()
        return False, f"Erro ao atualizar banco de dados: {e}", peca_data
