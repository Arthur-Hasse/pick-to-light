import customtkinter as ctk
from typing import Optional

def acender_led(linha: int, coluna: int) -> None:
    """Mock para acender o LED correspondente na matriz."""
    print(f"[HARDWARE MOCK] LED ACESO: Linha {linha}, Coluna {coluna}")

def apagar_led() -> None:
    """Mock para apagar todos os LEDs."""
    print("[HARDWARE MOCK] LEDs APAGADOS")

def ler_peso_balanca(peso_esperado: float = 0.0) -> Optional[float]:
    """Mock para simular a leitura da balança. Abre um prompt pedindo o peso."""
    # Como é um mock de hardware dentro de uma aplicação GUI, usamos um dialog simples.
    dialog = ctk.CTkInputDialog(text=f"Simulador de Balança\n(Peso esperado: {peso_esperado}g)\nInsira o peso lido (g):", title="Mock Balança")
    valor = dialog.get_input()
    if valor is None:
        return None
    try:
        return float(valor)
    except ValueError:
        return None


