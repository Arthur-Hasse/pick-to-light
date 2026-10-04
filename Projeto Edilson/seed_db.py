import database
from datetime import datetime

print("Iniciando cadastro de peças fictícias no banco de dados...")

# Lista de peças para cadastrar
pecas = [
    {
        'id': 101,
        'nome': 'Parafuso Sextavado M4',
        'tipo': 'Parafuso',
        'posicao_linha': 0,
        'posicao_coluna': 0,
        'peso_unitario_g': 15.5,
        'dimensoes': '10x5x5',
        'estoque_inicial': 50
    },
    {
        'id': 102,
        'nome': 'Porca M4',
        'tipo': 'Porca',
        'posicao_linha': 0,
        'posicao_coluna': 1,
        'peso_unitario_g': 5.2,
        'dimensoes': '5x5x2',
        'estoque_inicial': 100
    },
    {
        'id': 201,
        'nome': 'Resistor 1k Ohm',
        'tipo': 'Componente Eletronico',
        'posicao_linha': 1,
        'posicao_coluna': 0,
        'peso_unitario_g': 0.5,
        'dimensoes': '2x2x6',
        'estoque_inicial': 200
    },
    {
        'id': 202,
        'nome': 'Capacitor Eletrolítico 10uF',
        'tipo': 'Componente Eletronico',
        'posicao_linha': 1,
        'posicao_coluna': 1,
        'peso_unitario_g': 1.2,
        'dimensoes': '4x4x10',
        'estoque_inicial': 30
    },
    {
        'id': 301,
        'nome': 'Motor DC 5V',
        'tipo': 'Motor',
        'posicao_linha': 2,
        'posicao_coluna': 0,
        'peso_unitario_g': 45.0,
        'dimensoes': '20x20x15',
        'estoque_inicial': 10
    }
]

database.upsert_usuario("admin", "Administrador", "ADMIN")
database.upsert_usuario("123", "Operário Silva", "OPERARIO")
database.upsert_usuario("456", "Operário Santos", "OPERARIO")

for p in pecas:
    # Insere metadados
    database.upsert_peca(p)
    # Atualiza o estoque
    database.update_estoque(p['id'], p['estoque_inicial'])
    # Registra a operação inicial no histórico
    database.registrar_operacao("ADMIN", p['id'], "ADICAO", p['estoque_inicial'])
    
    print(f"Cadastrada peça: {p['nome']} (ID {p['id']}) - Estoque: {p['estoque_inicial']}")

print("Cadastro concluído com sucesso!")
