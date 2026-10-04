import os
import subprocess
import sys

def build():
    print("Iniciando build do Smart Inventory Manager...")
    
    # Certificar-se de que o pyinstaller está instalado
    try:
        import PyInstaller
    except ImportError:
        print("PyInstaller não encontrado. Instalando via pip...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
        
    # Comando para build (usando --noconsole para esconder terminal e --onefile para um único executável)
    # customtinker pode precisar de flags extras em alguns casos, mas a forma básica é:
    cmd = [
        sys.executable,
        "-m", "PyInstaller",
        "--noconfirm",
        "--onefile",
        "--windowed", # Esconde a janela de console no Windows
        "--name", "SmartInventoryManager",
        "ui.py"
    ]
    
    # O Pyinstaller precisa saber da biblioteca customtkinter (assets)
    # No Windows, usamos o collect-all do PyInstaller
    cmd.extend(["--collect-all", "customtkinter"])
    
    print(f"Executando: {' '.join(cmd)}")
    result = subprocess.run(cmd)
    
    if result.returncode == 0:
        print("\nBuild concluído com sucesso!")
        print("O executável está na pasta 'dist/'.")
    else:
        print("\nErro durante o processo de build.")

if __name__ == "__main__":
    build()
