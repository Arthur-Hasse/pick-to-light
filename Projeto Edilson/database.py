import sqlite3
import os
from typing import List, Dict, Optional, Any
from datetime import datetime

DB_PATH = 'estoque.db'

def init_db() -> None:
    """Inicializa o banco de dados e cria as tabelas se não existirem."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Tabela de Peças
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS pecas (
        id INTEGER PRIMARY KEY,
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL,
        posicao_linha INTEGER NOT NULL,
        posicao_coluna INTEGER NOT NULL,
        peso_unitario_g REAL NOT NULL,
        dimensoes TEXT NOT NULL,
        quantidade_estoque INTEGER NOT NULL DEFAULT 0
    )
    ''')
    
    # Tabela de Histórico
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS historico_operacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        funcionario_id TEXT NOT NULL,
        peca_id INTEGER NOT NULL,
        tipo_operacao TEXT NOT NULL,
        quantidade INTEGER NOT NULL,
        data_hora DATETIME NOT NULL,
        FOREIGN KEY (peca_id) REFERENCES pecas (id)
    )
    ''')
    
    # Tabela de Usuários
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        role TEXT NOT NULL
    )
    ''')
    
    # Tabela de Ordens de Serviço
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS ordens_servico (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ABERTA'
    )
    ''')
    
    # Tabela de Itens da Ordem de Serviço
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS itens_ordem_servico (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ordem_id INTEGER NOT NULL,
        peca_id INTEGER NOT NULL,
        tipo_operacao TEXT NOT NULL,
        quantidade INTEGER NOT NULL,
        FOREIGN KEY (ordem_id) REFERENCES ordens_servico (id),
        FOREIGN KEY (peca_id) REFERENCES pecas (id)
    )
    ''')
    
    conn.commit()
    conn.close()

def get_peca(peca_id: int) -> Optional[Dict[str, Any]]:
    """Busca uma peça pelo ID e retorna um dicionário com os dados."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM pecas WHERE id = ?", (peca_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return dict(row)
    return None

def get_todas_pecas() -> List[Dict[str, Any]]:
    """Retorna todas as peças do estoque."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM pecas")
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

def upsert_peca(peca_data: Dict[str, Any]) -> None:
    """Insere ou atualiza os metadados de uma peça no banco de dados (menos o estoque em si)."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
    INSERT INTO pecas (id, nome, tipo, posicao_linha, posicao_coluna, peso_unitario_g, dimensoes, quantidade_estoque)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    ON CONFLICT(id) DO UPDATE SET
        nome=excluded.nome,
        tipo=excluded.tipo,
        posicao_linha=excluded.posicao_linha,
        posicao_coluna=excluded.posicao_coluna,
        peso_unitario_g=excluded.peso_unitario_g,
        dimensoes=excluded.dimensoes
    ''', (
        peca_data['id'],
        peca_data.get('nome', 'Desconhecido'),
        peca_data['tipo'],
        peca_data['posicao_linha'],
        peca_data['posicao_coluna'],
        peca_data['peso_unitario_g'],
        peca_data['dimensoes']
    ))
    
    conn.commit()
    conn.close()

def update_estoque(peca_id: int, quantidade_alteracao: int) -> int:
    """Atualiza a quantidade de uma peça no estoque (+ ou -) e retorna a nova quantidade."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT quantidade_estoque FROM pecas WHERE id = ?", (peca_id,))
    result = cursor.fetchone()
    if not result:
        conn.close()
        raise ValueError(f"Peça com ID {peca_id} não encontrada.")
        
    nova_qtd = result[0] + quantidade_alteracao
    if nova_qtd < 0:
        conn.close()
        raise ValueError("Quantidade em estoque não pode ser negativa.")
        
    cursor.execute("UPDATE pecas SET quantidade_estoque = ? WHERE id = ?", (nova_qtd, peca_id))
    conn.commit()
    conn.close()
    return nova_qtd

def registrar_operacao(funcionario_id: str, peca_id: int, tipo_operacao: str, quantidade: int) -> None:
    """Registra uma operação de ADICAO ou REMOCAO no histórico."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    data_hora_atual = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute('''
    INSERT INTO historico_operacoes (funcionario_id, peca_id, tipo_operacao, quantidade, data_hora)
    VALUES (?, ?, ?, ?, ?)
    ''', (funcionario_id, peca_id, tipo_operacao, quantidade, data_hora_atual))
    
    conn.commit()
    conn.close()

# Executa a inicialização ao importar o módulo
init_db()

def get_usuario(user_id: str) -> Optional[Dict[str, Any]]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM usuarios WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def upsert_usuario(user_id: str, nome: str, role: str) -> None:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
    INSERT INTO usuarios (id, nome, role) VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET nome=excluded.nome, role=excluded.role
    ''', (user_id, nome, role))
    conn.commit()
    conn.close()

def criar_ordem_servico(titulo: str, itens: List[Dict[str, Any]]) -> int:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO ordens_servico (titulo, status) VALUES (?, 'ABERTA')", (titulo,))
    ordem_id = cursor.lastrowid
    
    for item in itens:
        cursor.execute('''
        INSERT INTO itens_ordem_servico (ordem_id, peca_id, tipo_operacao, quantidade)
        VALUES (?, ?, ?, ?)
        ''', (ordem_id, item['peca_id'], item['tipo_operacao'], item['quantidade']))
        
    conn.commit()
    conn.close()
    return ordem_id

def get_ordens_servico_abertas() -> List[Dict[str, Any]]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM ordens_servico WHERE status = 'ABERTA'")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_itens_ordem_servico(ordem_id: int) -> List[Dict[str, Any]]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM itens_ordem_servico WHERE ordem_id = ?", (ordem_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def concluir_ordem_servico(ordem_id: int) -> None:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE ordens_servico SET status = 'CONCLUIDA' WHERE id = ?", (ordem_id,))
    conn.commit()
    conn.close()
