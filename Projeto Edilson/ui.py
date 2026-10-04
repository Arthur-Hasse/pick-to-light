import customtkinter as ctk
import tkinter as tk
import logic
import hardware_mock
import database
from tkinter import messagebox

# Configuração Global de Cores
BG_PRIMARY = "#1E1E24"
BG_SECONDARY = "#2B2D42"
TEXT_PRIMARY = "#FFFFFF"
TEXT_SECONDARY = "#8D99AE"
COLOR_NEUTRAL = "#3A86FF"
COLOR_SUCCESS = "#103161"
COLOR_ERROR = "#EF233C"

class SmartInventoryApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        
        self.title("Smart Inventory Manager (V2)")
        self.geometry("1024x768")
        self.configure(fg_color=BG_PRIMARY)
        
        # Variáveis Globais de Estado
        self.funcionario_id = ""
        self.usuario_role = ""
        self.usuario_nome = ""
        self.current_os = None # Ordem de servico atual (para operario)
        
        # Dicionário para armazenar as telas
        self.frames = {}
        
        # Inicialização das Telas
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)
        
        for F in [LoginScreen, DashboardScreen, AdminDashboardScreen, CreateOrdemScreen, SelectOrdemScreen, OperarioWorkScreen]:
            frame = F(parent=self, controller=self)
            self.frames[F] = frame
            frame.grid(row=0, column=0, sticky="nsew")
            
        self.show_frame(LoginScreen)
        
    def show_frame(self, cont, **kwargs):
        """Muda para a tela desejada."""
        frame = self.frames[cont]
        # Se houver inicialização necessária na tela
        if hasattr(frame, 'on_show'):
            frame.on_show(**kwargs)
        frame.tkraise()

class LoginScreen(ctk.CTkFrame):
    def __init__(self, parent, controller):
        super().__init__(parent, fg_color=BG_PRIMARY)
        self.controller = controller
        
        # Container Centralizado
        container = ctk.CTkFrame(self, fg_color=BG_PRIMARY)
        container.place(relx=0.5, rely=0.5, anchor="center")
        
        # Top Icon (Simulation)
        icon_frame = ctk.CTkFrame(container, fg_color=BG_SECONDARY, corner_radius=15, width=65, height=65, border_width=1, border_color=COLOR_NEUTRAL)
        icon_frame.pack(pady=(0, 20))
        icon_frame.pack_propagate(False)
        icon_lbl = ctk.CTkLabel(icon_frame, text="💼", font=("Roboto", 28), text_color=COLOR_NEUTRAL)
        icon_lbl.place(relx=0.5, rely=0.5, anchor="center")
        
        titulo = ctk.CTkLabel(container, text="Identificação do Operador", font=("Roboto", 28, "bold"), text_color=TEXT_PRIMARY)
        titulo.pack(pady=(0, 5))
        
        subtitulo = ctk.CTkLabel(container, text="Aproxime o crachá ou digite seu ID", font=("Roboto", 16), text_color=TEXT_SECONDARY)
        subtitulo.pack(pady=(0, 30))
        
        self.entry_id = ctk.CTkEntry(container, font=("Roboto", 20), placeholder_text="Digite seu ID", justify="center", width=330, height=55, fg_color=BG_PRIMARY, border_width=1, border_color=BG_SECONDARY)
        self.entry_id.pack(pady=(0, 20))
        self.entry_id.bind("<Return>", lambda e: self.fazer_login())
        
        # Keypad Frame
        keypad_frame = ctk.CTkFrame(container, fg_color="transparent")
        keypad_frame.pack(pady=(0, 30))
        
        btn_font = ("Roboto", 22, "bold")
        btn_fg = BG_SECONDARY
        btn_hover = "#3A3D5A"
        btn_text = TEXT_PRIMARY
        
        def add_to_entry(val):
            current = self.entry_id.get()
            self.entry_id.delete(0, 'end')
            self.entry_id.insert(0, current + val)
            
        def clear_entry():
            self.entry_id.delete(0, 'end')
            
        def backspace():
            current = self.entry_id.get()
            self.entry_id.delete(0, 'end')
            self.entry_id.insert(0, current[:-1])

        botoes = [
            ('1', 0, 0, lambda: add_to_entry('1')), ('2', 0, 1, lambda: add_to_entry('2')), ('3', 0, 2, lambda: add_to_entry('3')),
            ('4', 1, 0, lambda: add_to_entry('4')), ('5', 1, 1, lambda: add_to_entry('5')), ('6', 1, 2, lambda: add_to_entry('6')),
            ('7', 2, 0, lambda: add_to_entry('7')), ('8', 2, 1, lambda: add_to_entry('8')), ('9', 2, 2, lambda: add_to_entry('9')),
            ('Limpar', 3, 0, clear_entry), ('0', 3, 1, lambda: add_to_entry('0')), ('⌫', 3, 2, backspace)
        ]
        
        for text, r, c, cmd in botoes:
            f = btn_font
            if text == "Limpar":
                f = ("Roboto", 16, "bold")
            btn = ctk.CTkButton(keypad_frame, text=text, font=f, width=105, height=65, corner_radius=10, fg_color=btn_fg, hover_color=btn_hover, text_color=btn_text, command=cmd)
            btn.grid(row=r, column=c, padx=5, pady=5)
        
        btn_login = ctk.CTkButton(container, text="ACESSAR SISTEMA", font=("Roboto", 18, "bold"), fg_color=BG_SECONDARY, hover_color="#3A3D5A", text_color=TEXT_SECONDARY, width=330, height=60, corner_radius=10, command=self.fazer_login)
        btn_login.pack(pady=(0, 20))
        
        rodape_txt = "Ambiente de demonstração — qualquer ID de 1 a 6 dígitos funciona"
        lbl_rodape = ctk.CTkLabel(container, text=rodape_txt, font=("Roboto", 12), text_color=TEXT_SECONDARY)
        lbl_rodape.pack()

    def fazer_login(self):
        fid = self.entry_id.get().strip()
        if not fid:
            messagebox.showerror("Erro", "Insira o ID do Funcionário")
            return
            
        usuario = database.get_usuario(fid)
        if not usuario:
            # Para manter compatibilidade com "qualquer ID", vamos criar como operario
            database.upsert_usuario(fid, f"Operador {fid}", "OPERARIO")
            usuario = database.get_usuario(fid)
            
        self.controller.funcionario_id = fid
        self.controller.usuario_role = usuario['role']
        self.controller.usuario_nome = usuario['nome']
        
        self.entry_id.delete(0, 'end')
        
        if usuario['role'] == "ADMIN":
            self.controller.show_frame(AdminDashboardScreen)
        else:
            self.controller.show_frame(SelectOrdemScreen)

class SlotCard(ctk.CTkFrame):
    def __init__(self, parent, r, c, command=None, **kwargs):
        super().__init__(parent, fg_color="#1a1a24", corner_radius=8, **kwargs)
        self.r = r
        self.c = c
        self.command = command
        self.is_filled = False
        
        self.grid_rowconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)
        self.grid_rowconfigure(2, weight=1)
        self.grid_columnconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=1)
        
        self.lbl_pos = ctk.CTkLabel(self, text=f"L{r} - C{c}", font=("Roboto", 10), text_color="#5e6a7d")
        self.lbl_pos.grid(row=0, column=0, sticky="nw", padx=10, pady=(5, 0))
        
        self.lbl_dot = ctk.CTkLabel(self, text="●", font=("Roboto", 12), text_color="#5e6a7d")
        self.lbl_dot.grid(row=0, column=1, sticky="ne", padx=10, pady=(5, 0))
        
        self.lbl_title = ctk.CTkLabel(self, text="Vazio", font=("Roboto", 16, "bold"), text_color="#5e6a7d", anchor="w")
        self.lbl_title.grid(row=1, column=0, columnspan=2, sticky="w", padx=10)
        
        self.lbl_info = ctk.CTkLabel(self, text="Toque para cadastrar", font=("Roboto", 12), text_color="#5e6a7d")
        self.lbl_info.grid(row=2, column=0, sticky="sw", padx=10, pady=(0, 5))
        
        self.lbl_plus = ctk.CTkLabel(self, text="+", font=("Roboto", 16), text_color="#5e6a7d")
        self.lbl_plus.grid(row=2, column=1, sticky="se", padx=10, pady=(0, 5))
        
        self.bind("<Button-1>", self._on_click)
        for w in [self.lbl_pos, self.lbl_dot, self.lbl_title, self.lbl_info, self.lbl_plus]:
            w.bind("<Button-1>", self._on_click)
            
    def _on_click(self, event):
        if self.command:
            self.command(self.r, self.c)
            
    def set_empty(self):
        self.is_filled = False
        self.configure(fg_color="#1a1a24", border_width=1, border_color="#2b2d42")
        self.lbl_pos.configure(text_color="#5e6a7d")
        self.lbl_dot.configure(text="●", text_color="#5e6a7d")
        self.lbl_title.configure(text="Vazio", text_color="#5e6a7d")
        self.lbl_info.configure(text="Toque para cadastrar")
        self.lbl_plus.configure(text="+")
        
    def set_filled(self, nome, qtd, peca_id, is_low_stock=False):
        self.is_filled = True
        self.bg_color = "#2a2720" if is_low_stock else "#1f2c40"
        self.dot_color = "#eab308" if is_low_stock else "#3b82f6"
        self.border_color = "#eab308" if is_low_stock else self.bg_color
        
        self.configure(fg_color=self.bg_color, border_width=1, border_color=self.border_color)
        self.lbl_pos.configure(text_color="#8d99ae")
        self.lbl_dot.configure(text="●", text_color=self.dot_color)
        self.lbl_title.configure(text=nome, text_color="#ffffff")
        self.lbl_info.configure(text=f"{qtd} un · id {peca_id}")
        self.lbl_plus.configure(text="")
        
    def set_selected(self):
        # cyan border
        self.configure(border_width=1, border_color="#06b6d4")
        self.lbl_dot.configure(text_color="#06b6d4")
        
    def set_unselected(self):
        if self.is_filled:
            self.configure(border_color=self.border_color)
            self.lbl_dot.configure(text_color=self.dot_color)
        else:
            self.configure(border_color="#2b2d42")
            self.lbl_dot.configure(text_color="#5e6a7d")


class CadastroPecaPopup(ctk.CTkToplevel):
    def __init__(self, master, dashboard, r, c):
        super().__init__(master)
        self.dashboard = dashboard
        self.r = r
        self.c = c
        self.peca_existente_movida = False
        
        self.title("Cadastrar peça")
        self.geometry("450x550")
        self.transient(master)
        self.grab_set()
        
        self.update_idletasks()
        x = self.winfo_rootx() + (self.winfo_width() // 2) - (450 // 2)
        y = self.winfo_rooty() + (self.winfo_height() // 2) - (550 // 2)
        self.geometry(f"+{x}+{y}")
        
        self.configure(fg_color="#1a1a24")
        
        self.container = ctk.CTkFrame(self, fg_color="transparent")
        self.container.pack(expand=True, fill="both")
        
        self.step_1_form()
        
    def clear_container(self):
        for w in self.container.winfo_children():
            w.destroy()
            
    def step_1_form(self):
        self.clear_container()
        
        header = ctk.CTkFrame(self.container, fg_color="transparent")
        header.pack(fill="x", padx=20, pady=(20, 10))
        
        lbl_nome = ctk.CTkLabel(header, text="Cadastrar peça", font=("Roboto", 24, "bold"), text_color="#e2e8f0")
        lbl_nome.pack(anchor="w")
        
        lbl_loc = ctk.CTkLabel(header, text=f"Nova posição · Caixa L{self.r} · C{self.c}", font=("Roboto", 14), text_color="#94a3b8")
        lbl_loc.pack(anchor="w")
        
        # Aviso de peça movida (invisível por padrão)
        self.lbl_aviso = ctk.CTkLabel(self.container, text="", text_color="#eab308", font=("Roboto", 12, "bold"))
        self.lbl_aviso.pack(fill="x", padx=20)
        
        form_frame = ctk.CTkFrame(self.container, fg_color="transparent")
        form_frame.pack(fill="x", padx=20, pady=10)
        
        form_frame.grid_columnconfigure(0, weight=1)
        form_frame.grid_columnconfigure(1, weight=1)
        
        # Função helper para criar os campos
        def criar_campo(pai, texto, row, col, placeholder="", values=None):
            f = ctk.CTkFrame(pai, fg_color="transparent")
            f.grid(row=row, column=col, sticky="nsew", padx=5, pady=5)
            ctk.CTkLabel(f, text=texto, text_color="#94a3b8", font=("Roboto", 12)).pack(anchor="w", pady=(0, 2))
            
            if values is not None:
                entry = ctk.CTkComboBox(f, values=values, fg_color="#1f2c40", border_width=1, border_color="#2b2d42", command=self.on_nome_type)
                entry.set(placeholder)
            else:
                entry = ctk.CTkEntry(f, placeholder_text=placeholder, fg_color="#1f2c40", border_width=1, border_color="#2b2d42")
            
            entry.pack(fill="x")
            return entry
            
        pecas_db = database.get_todas_pecas()
        nomes_existentes = sorted(list(set([p['nome'] for p in pecas_db])))
            
        self.entry_id = criar_campo(form_frame, "ID da peça", 0, 0, "Ex: 1006")
        self.entry_nome = criar_campo(form_frame, "Nome da peça", 0, 1, "Ex: Arruela M8", values=nomes_existentes)
        self.entry_tipo = criar_campo(form_frame, "Tipo", 1, 0, "Ex: Arruela")
        self.entry_peso = criar_campo(form_frame, "Peso unitário (g)", 1, 1, "Ex: 3.5")
        self.entry_dim = criar_campo(form_frame, "Dimensões (opcional)", 2, 0, "Ex: 10x10 mm")
        self.entry_qtd = criar_campo(form_frame, "Quantidade a adicionar", 2, 1, "Ex: 100")
        
        # Bind para auto-preenchimento
        if isinstance(self.entry_nome, ctk.CTkComboBox):
            # No CTkComboBox, o bind <KeyRelease> pode precisar acessar o _entry subjacente
            self.entry_nome._entry.bind("<KeyRelease>", self.on_nome_type)
        else:
            self.entry_nome.bind("<KeyRelease>", self.on_nome_type)
        
        footer = ctk.CTkFrame(self.container, fg_color="transparent")
        footer.pack(fill="x", padx=20, pady=(20, 20))
        
        btn_cont = ctk.CTkButton(footer, text="CONTINUAR", height=45, font=("Roboto", 16, "bold"), fg_color="#3b82f6", command=self.validar_form)
        btn_cont.pack(fill="x")
        
    def on_nome_type(self, event=None):
        nome_digitado = self.entry_nome.get().strip().lower()
        if len(nome_digitado) < 2:
            self.lbl_aviso.configure(text="")
            self.peca_existente_movida = False
            return
            
        pecas = database.get_todas_pecas()
        for p in pecas:
            if p['nome'].lower() == nome_digitado:
                # Preenche automaticamente
                self.entry_id.delete(0, 'end')
                self.entry_id.insert(0, str(p['id']))
                
                self.entry_tipo.delete(0, 'end')
                self.entry_tipo.insert(0, p['tipo'])
                
                # O usuário pediu para NÃO puxar o peso caso exista, deixando para eles preencherem (ou usarem o já preenchido)
                # self.entry_peso.delete(0, 'end')
                # self.entry_peso.insert(0, str(p['peso_unitario_g']))
                
                self.entry_dim.delete(0, 'end')
                self.entry_dim.insert(0, p['dimensoes'])
                
                # Exibe aviso
                self.lbl_aviso.configure(text="⚠️ Peça já existe! Ao concluir, ela será MOVIDA para esta caixa.")
                self.peca_existente_movida = True
                return
                
        # Limpa o aviso se não bater com nada
        self.lbl_aviso.configure(text="")
        self.peca_existente_movida = False
        
    def validar_form(self):
        try:
            self.p_id = int(self.entry_id.get())
            self.p_nome = self.entry_nome.get().strip()
            self.p_tipo = self.entry_tipo.get().strip()
            self.p_peso = float(self.entry_peso.get().replace(',', '.'))
            self.p_dim = self.entry_dim.get().strip()
            self.p_qtd = int(self.entry_qtd.get())
            
            if not self.p_nome or not self.p_tipo:
                raise ValueError("Preencha todos os campos obrigatórios.")
            if self.p_qtd <= 0:
                raise ValueError("A quantidade deve ser maior que zero.")
                
            self.step_2_balanca()
            
        except ValueError as e:
            messagebox.showerror("Erro de Validação", f"Verifique os dados informados.\n{e}")
            
    def step_2_balanca(self):
        self.clear_container()
        
        header = ctk.CTkFrame(self.container, fg_color="transparent")
        header.pack(fill="x", padx=20, pady=(20, 10))
        
        lbl_nome = ctk.CTkLabel(header, text="Verificando peso", font=("Roboto", 20, "bold"), text_color="#e2e8f0")
        lbl_nome.pack(anchor="w")
        
        lbl_loc = ctk.CTkLabel(header, text=f"Cadastrando {self.p_qtd}x {self.p_nome}", font=("Roboto", 14), text_color="#94a3b8")
        lbl_loc.pack(anchor="w")
        
        middle = ctk.CTkFrame(self.container, fg_color="transparent")
        middle.pack(expand=True, fill="both", pady=10)
        
        ctk.CTkLabel(middle, text="⚖️ Lendo balança...", font=("Roboto", 16), text_color="#94a3b8").pack(pady=10)
        
        peso_esperado = self.p_qtd * self.p_peso
        
        stats_frame = ctk.CTkFrame(middle, fg_color="transparent")
        stats_frame.pack(pady=10)
        
        f1 = ctk.CTkFrame(stats_frame, fg_color="transparent")
        f1.pack(side="left", padx=20)
        ctk.CTkLabel(f1, text="Peso esperado", text_color="#94a3b8").pack()
        ctk.CTkLabel(f1, text=f"{peso_esperado} g", font=("Roboto", 24, "bold"), text_color="#ffffff").pack()
        
        f2 = ctk.CTkFrame(stats_frame, fg_color="transparent")
        f2.pack(side="left", padx=20)
        ctk.CTkLabel(f2, text="Peso lido (simulação)", text_color="#94a3b8").pack()
        
        self.entry_peso_sim = ctk.CTkEntry(f2, font=("Roboto", 24, "bold"), width=100, justify="center")
        self.entry_peso_sim.pack()
        self.entry_peso_sim.insert(0, str(peso_esperado))
        
        footer = ctk.CTkFrame(self.container, fg_color="transparent")
        footer.pack(fill="x", padx=20, pady=20)
        
        btn_verificar = ctk.CTkButton(footer, text="VERIFICAR", height=45, font=("Roboto", 16, "bold"), fg_color="#3b82f6", command=lambda: self.validar_peso(peso_esperado))
        btn_verificar.pack(fill="x")
        
        btn_voltar = ctk.CTkButton(footer, text="Voltar", fg_color="transparent", text_color="#94a3b8", hover_color="#1a1a24", command=self.step_1_form)
        btn_voltar.pack(pady=(10, 0))
        
    def validar_peso(self, peso_esperado):
        try:
            lido = float(self.entry_peso_sim.get().replace(',', '.'))
        except ValueError:
            messagebox.showerror("Erro", "Valor numérico inválido.")
            return
            
        if abs(lido - peso_esperado) <= 2.0:
            self.step_3_sucesso()
        else:
            messagebox.showwarning("Inconsistência de Peso", "Peso não confere com o esperado!\nPor favor, refaça a operação.")
            self.destroy()
            self.dashboard.selecionar_slot(self.r, self.c)
            
    def step_3_sucesso(self):
        self.clear_container()
        
        funcionario_id = self.dashboard.controller.funcionario_id
        
        peca_data = {
            'id': self.p_id,
            'nome': self.p_nome,
            'tipo': self.p_tipo,
            'posicao_linha': self.r,
            'posicao_coluna': self.c,
            'peso_unitario_g': self.p_peso,
            'dimensoes': self.p_dim
        }
        
        try:
            database.upsert_peca(peca_data)
            novo_estoque = database.update_estoque(self.p_id, self.p_qtd)
            database.registrar_operacao(funcionario_id, self.p_id, "ADICAO", self.p_qtd)
        except Exception as e:
            messagebox.showerror("Erro", f"Falha ao registrar peça: {e}")
            self.destroy()
            return
            
        header = ctk.CTkFrame(self.container, fg_color="transparent")
        header.pack(fill="x", padx=20, pady=(20, 10))
        
        lbl_nome = ctk.CTkLabel(header, text="Cadastrado!", font=("Roboto", 24, "bold"), text_color="#e2e8f0")
        lbl_nome.pack(anchor="w")
        
        middle = ctk.CTkFrame(self.container, fg_color="transparent")
        middle.pack(expand=True, fill="both", pady=10)
        
        ctk.CTkLabel(middle, text="✅", font=("Roboto", 48), text_color="#22c55e").pack(pady=10)
        ctk.CTkLabel(middle, text="Sucesso", font=("Roboto", 20, "bold"), text_color="#ffffff").pack()
        
        msg = f"Peça movida e adicionada." if self.peca_existente_movida else "Nova peça cadastrada."
        ctk.CTkLabel(middle, text=f"{msg}\nEstoque atual: {novo_estoque} un.", text_color="#94a3b8").pack(pady=5)
        
        footer = ctk.CTkFrame(self.container, fg_color="transparent")
        footer.pack(fill="x", padx=20, pady=20)
        
        def concluir():
            self.dashboard.atualizar_matriz()
            self.destroy()
            
        btn_cont = ctk.CTkButton(footer, text="CONCLUIR", height=45, font=("Roboto", 16, "bold"), fg_color="#3b82f6", command=concluir)
        btn_cont.pack(fill="x")


class OperacaoFlowPopup(ctk.CTkToplevel):
    def __init__(self, master, dashboard, r, c, info):
        super().__init__(master)
        self.dashboard = dashboard
        self.r = r
        self.c = c
        self.info = info
        self.peca = info['peca']
        self.estoque_atual = info['qtd']
        
        self.title("Operação")
        self.geometry("400x420")
        self.transient(master)
        self.grab_set()
        
        self.update_idletasks()
        x = self.winfo_rootx() + (self.winfo_width() // 2) - (400 // 2)
        y = self.winfo_rooty() + (self.winfo_height() // 2) - (420 // 2)
        self.geometry(f"+{x}+{y}")
        
        self.configure(fg_color="#1a1a24")
        
        self.tipo = None
        self.qtd_selecionada = 1
        
        self.container = ctk.CTkFrame(self, fg_color="transparent")
        self.container.pack(expand=True, fill="both")
        
        self.step_1_menu()
        
    def clear_container(self):
        for w in self.container.winfo_children():
            w.destroy()
            
    def step_1_menu(self):
        self.clear_container()
        
        header = ctk.CTkFrame(self.container, fg_color="transparent")
        header.pack(fill="x", padx=20, pady=(20, 10))
        
        lbl_nome = ctk.CTkLabel(header, text=self.peca['nome'], font=("Roboto", 24, "bold"), text_color="#e2e8f0")
        lbl_nome.pack(anchor="w")
        
        lbl_loc = ctk.CTkLabel(header, text=f"Caixa L{self.r} · C{self.c} — id {self.peca['id']}", font=("Roboto", 14), text_color="#94a3b8")
        lbl_loc.pack(anchor="w")
        
        info_frame = ctk.CTkFrame(self.container, fg_color="transparent")
        info_frame.pack(fill="x", padx=20, pady=10)
        
        box_estoque = ctk.CTkFrame(info_frame, fg_color="#1f2c40", corner_radius=8, height=80)
        box_estoque.pack(side="left", expand=True, fill="x", padx=(0, 10))
        box_estoque.pack_propagate(False)
        ctk.CTkLabel(box_estoque, text="Em estoque", font=("Roboto", 12), text_color="#94a3b8").pack(anchor="w", padx=10, pady=(10, 0))
        ctk.CTkLabel(box_estoque, text=f"{self.estoque_atual} un", font=("Roboto", 20, "bold"), text_color="#e2e8f0").pack(anchor="w", padx=10)
        
        box_peso = ctk.CTkFrame(info_frame, fg_color="#1f2c40", corner_radius=8, height=80)
        box_peso.pack(side="right", expand=True, fill="x")
        box_peso.pack_propagate(False)
        ctk.CTkLabel(box_peso, text="Peso unitário", font=("Roboto", 12), text_color="#94a3b8").pack(anchor="w", padx=10, pady=(10, 0))
        ctk.CTkLabel(box_peso, text=f"{self.peca['peso_unitario_g']} g", font=("Roboto", 20, "bold"), text_color="#e2e8f0").pack(anchor="w", padx=10)
        
        btn_frame = ctk.CTkFrame(self.container, fg_color="transparent")
        btn_frame.pack(fill="x", padx=20, pady=(10, 20))
        
        def set_tipo(t):
            if t == "REMOCAO" and self.estoque_atual <= 0:
                messagebox.showwarning("Aviso", "Não há estoque para retirar.")
                return
            self.tipo = t
            self.qtd_selecionada = 1
            self.step_2_quantidade()
            
        btn_ret = ctk.CTkButton(btn_frame, text="↓\nRETIRAR", font=("Roboto", 16, "bold"), fg_color="#1f2c40", hover_color="#2b3b54", corner_radius=8, height=80, command=lambda: set_tipo("REMOCAO"))
        btn_ret.pack(side="left", expand=True, fill="x", padx=(0, 10))
        
        btn_add = ctk.CTkButton(btn_frame, text="↑\nADICIONAR", font=("Roboto", 16, "bold"), fg_color="#1f2c40", hover_color="#2b3b54", corner_radius=8, height=80, command=lambda: set_tipo("ADICAO"))
        btn_add.pack(side="right", expand=True, fill="x")
        
    def step_2_quantidade(self):
        self.clear_container()
        
        txt_op = "Retirar" if self.tipo == "REMOCAO" else "Adicionar"
        
        header = ctk.CTkFrame(self.container, fg_color="transparent")
        header.pack(fill="x", padx=20, pady=(20, 10))
        
        lbl_nome = ctk.CTkLabel(header, text=f"{txt_op} · {self.peca['nome']}", font=("Roboto", 20, "bold"), text_color="#e2e8f0")
        lbl_nome.pack(anchor="w")
        
        lbl_loc = ctk.CTkLabel(header, text=f"Caixa L{self.r} · C{self.c}", font=("Roboto", 14), text_color="#94a3b8")
        lbl_loc.pack(anchor="w")
        
        middle = ctk.CTkFrame(self.container, fg_color="transparent")
        middle.pack(expand=True, fill="both")
        
        ctk.CTkLabel(middle, text=f"Quantidade a {txt_op.lower()}", text_color="#94a3b8").pack(pady=(10, 5))
        
        ctrl_frame = ctk.CTkFrame(middle, fg_color="transparent")
        ctrl_frame.pack()
        
        lbl_num = ctk.CTkLabel(ctrl_frame, text=str(self.qtd_selecionada), font=("Roboto", 36, "bold"), text_color="#ffffff")
        
        def alterar_qtd(delta):
            nova = self.qtd_selecionada + delta
            if nova < 1: nova = 1
            if self.tipo == "REMOCAO" and nova > self.estoque_atual:
                nova = self.estoque_atual
            self.qtd_selecionada = nova
            lbl_num.configure(text=str(self.qtd_selecionada))
            
        btn_minus = ctk.CTkButton(ctrl_frame, text="−", width=50, height=50, font=("Roboto", 24), fg_color="#1f2c40", command=lambda: alterar_qtd(-1))
        btn_minus.pack(side="left", padx=10)
        
        lbl_num.pack(side="left", padx=20)
        
        btn_plus = ctk.CTkButton(ctrl_frame, text="+", width=50, height=50, font=("Roboto", 24), fg_color="#1f2c40", command=lambda: alterar_qtd(1))
        btn_plus.pack(side="left", padx=10)
        
        limite_str = f"máximo disponível: {self.estoque_atual} un" if self.tipo == "REMOCAO" else "sem limite de adição"
        ctk.CTkLabel(middle, text=limite_str, text_color="#5e6a7d").pack(pady=5)
        
        footer = ctk.CTkFrame(self.container, fg_color="transparent")
        footer.pack(fill="x", padx=20, pady=20)
        
        btn_cont = ctk.CTkButton(footer, text="CONTINUAR", height=45, font=("Roboto", 16, "bold"), fg_color="#3b82f6", command=self.step_3_balanca)
        btn_cont.pack(fill="x")
        
        btn_voltar = ctk.CTkButton(footer, text="Voltar", fg_color="transparent", text_color="#94a3b8", hover_color="#1a1a24", command=self.step_1_menu)
        btn_voltar.pack(pady=(10, 0))
        
    def step_3_balanca(self):
        self.clear_container()
        
        header = ctk.CTkFrame(self.container, fg_color="transparent")
        header.pack(fill="x", padx=20, pady=(20, 10))
        
        lbl_nome = ctk.CTkLabel(header, text="Verificando peso", font=("Roboto", 20, "bold"), text_color="#e2e8f0")
        lbl_nome.pack(anchor="w")
        
        acao = "Retirando" if self.tipo == "REMOCAO" else "Adicionando"
        lbl_loc = ctk.CTkLabel(header, text=f"{acao} {self.qtd_selecionada}x {self.peca['nome']}", font=("Roboto", 14), text_color="#94a3b8")
        lbl_loc.pack(anchor="w")
        
        middle = ctk.CTkFrame(self.container, fg_color="transparent")
        middle.pack(expand=True, fill="both", pady=10)
        
        ctk.CTkLabel(middle, text="⚖️ Lendo balança...", font=("Roboto", 16), text_color="#94a3b8").pack(pady=10)
        
        peso_esperado = self.qtd_selecionada * self.peca['peso_unitario_g']
        
        stats_frame = ctk.CTkFrame(middle, fg_color="transparent")
        stats_frame.pack(pady=10)
        
        f1 = ctk.CTkFrame(stats_frame, fg_color="transparent")
        f1.pack(side="left", padx=20)
        ctk.CTkLabel(f1, text="Peso esperado", text_color="#94a3b8").pack()
        ctk.CTkLabel(f1, text=f"{peso_esperado} g", font=("Roboto", 24, "bold"), text_color="#ffffff").pack()
        
        f2 = ctk.CTkFrame(stats_frame, fg_color="transparent")
        f2.pack(side="left", padx=20)
        ctk.CTkLabel(f2, text="Peso lido (simulação)", text_color="#94a3b8").pack()
        
        self.entry_peso = ctk.CTkEntry(f2, font=("Roboto", 24, "bold"), width=100, justify="center")
        self.entry_peso.pack()
        self.entry_peso.insert(0, str(peso_esperado))
        
        footer = ctk.CTkFrame(self.container, fg_color="transparent")
        footer.pack(fill="x", padx=20, pady=20)
        
        btn_verificar = ctk.CTkButton(footer, text="VERIFICAR", height=45, font=("Roboto", 16, "bold"), fg_color="#3b82f6", command=lambda: self.validar_peso(peso_esperado))
        btn_verificar.pack(fill="x")
        
        btn_voltar = ctk.CTkButton(footer, text="Voltar", fg_color="transparent", text_color="#94a3b8", hover_color="#1a1a24", command=self.step_2_quantidade)
        btn_voltar.pack(pady=(10, 0))
        
    def validar_peso(self, peso_esperado):
        try:
            lido = float(self.entry_peso.get().replace(',', '.'))
        except ValueError:
            messagebox.showerror("Erro", "Valor numérico inválido.")
            return
            
        # Tolerância de 2g (margem de erro da balança)
        if abs(lido - peso_esperado) <= 2.0:
            self.step_4_sucesso()
        else:
            messagebox.showwarning("Inconsistência de Peso", "Peso não confere com o esperado!\nPor favor, devolva a peça ao local de origem e refaça a operação.")
            self.destroy()
            self.dashboard.selecionar_slot(self.r, self.c) # Apenas re-seleciona visualmente
            
    def step_4_sucesso(self):
        self.clear_container()
        
        funcionario_id = self.dashboard.controller.funcionario_id
        qtd_alteracao = self.qtd_selecionada if self.tipo == "ADICAO" else -self.qtd_selecionada
        
        try:
            novo_estoque = database.update_estoque(self.peca['id'], qtd_alteracao)
            database.registrar_operacao(funcionario_id, self.peca['id'], self.tipo, self.qtd_selecionada)
        except Exception as e:
            messagebox.showerror("Erro", f"Falha ao registrar operação: {e}")
            self.destroy()
            return
            
        header = ctk.CTkFrame(self.container, fg_color="transparent")
        header.pack(fill="x", padx=20, pady=(20, 10))
        
        lbl_nome = ctk.CTkLabel(header, text="Confirmado", font=("Roboto", 24, "bold"), text_color="#e2e8f0")
        lbl_nome.pack(anchor="w")
        
        lbl_loc = ctk.CTkLabel(header, text=f"Caixa L{self.r} · C{self.c}", font=("Roboto", 14), text_color="#94a3b8")
        lbl_loc.pack(anchor="w")
        
        middle = ctk.CTkFrame(self.container, fg_color="transparent")
        middle.pack(expand=True, fill="both", pady=10)
        
        ctk.CTkLabel(middle, text="✅", font=("Roboto", 48), text_color="#22c55e").pack(pady=10)
        ctk.CTkLabel(middle, text="Peso confere", font=("Roboto", 20, "bold"), text_color="#ffffff").pack()
        
        txt_op = "Entrada" if self.tipo == "ADICAO" else "Retirada"
        ctk.CTkLabel(middle, text=f"{txt_op} registrada para {self.peca['nome']}. Novo estoque na caixa: {novo_estoque} un.", text_color="#94a3b8").pack(pady=5)
        
        footer = ctk.CTkFrame(self.container, fg_color="transparent")
        footer.pack(fill="x", padx=20, pady=20)
        
        def concluir():
            self.dashboard.atualizar_matriz()
            self.destroy()
            
        btn_cont = ctk.CTkButton(footer, text="CONCLUIR", height=45, font=("Roboto", 16, "bold"), fg_color="#3b82f6", command=concluir)
        btn_cont.pack(fill="x")


class DashboardScreen(ctk.CTkFrame):
    def __init__(self, parent, controller):
        super().__init__(parent, fg_color="#0f111a")
        self.controller = controller
        self.grid_botoes = {}
        self.estoque_slots = {}
        self.slot_selecionado = None
        
        # --- Header ---
        header = ctk.CTkFrame(self, fg_color="transparent", height=60)
        header.pack(side="top", fill="x", padx=20, pady=10)
        
        # Left side
        frame_esq = ctk.CTkFrame(header, fg_color="transparent")
        frame_esq.pack(side="left")
        lbl_title = ctk.CTkLabel(frame_esq, text="MULTILOG", font=("Roboto", 24, "bold"), text_color="#e2e8f0")
        lbl_title.pack(anchor="w")
        lbl_sub = ctk.CTkLabel(frame_esq, text="Controle de estoque · dupla verificação", font=("Roboto", 12), text_color="#94a3b8")
        lbl_sub.pack(anchor="w")
        
        # Right side
        frame_dir = ctk.CTkFrame(header, fg_color="transparent")
        frame_dir.pack(side="right")
        
        btn_sair = ctk.CTkButton(frame_dir, text="Sair", width=60, fg_color="transparent", border_width=1, border_color="#334155", text_color="#94a3b8", command=lambda: self.controller.show_frame(LoginScreen))
        btn_sair.pack(side="right", padx=(10,0))
        
        self.lbl_user = ctk.CTkLabel(frame_dir, text="Operador\nID", font=("Roboto", 12), text_color="#e2e8f0", justify="right")
        self.lbl_user.pack(side="right", padx=10)
        
        lbl_online = ctk.CTkLabel(frame_dir, text="● Sistema online", font=("Roboto", 12), text_color="#059669")
        lbl_online.pack(side="right", padx=10)
        
        # --- Search Bar ---
        search_frame = ctk.CTkFrame(self, fg_color="transparent")
        search_frame.pack(fill="x", padx=20, pady=(0, 10))
        self.entry_busca = ctk.CTkEntry(search_frame, placeholder_text="🔍 Buscar peça por nome ou ID...", height=40, width=400, fg_color="#1a1a24", border_width=1, border_color="#2b2d42", corner_radius=8)
        self.entry_busca.pack(side="left")
        
        self.dropdown_frame = ctk.CTkScrollableFrame(self, width=400, height=150, fg_color="#1f2c40", corner_radius=8, border_width=1, border_color="#2b2d42")
        self.entry_busca.bind("<KeyRelease>", self.on_search_type)
        self.entry_busca.bind("<FocusOut>", lambda e: self.after(200, self.dropdown_frame.place_forget))
        
        # --- Matriz ---
        self.matriz_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.matriz_frame.pack(expand=True, fill="both", padx=20, pady=10)
        self.criar_matriz(5, 5)
        
        # --- Footer / Legenda ---
        footer = ctk.CTkFrame(self, fg_color="transparent")
        footer.pack(side="bottom", fill="x", padx=20, pady=20)
        
        legendas = [
            ("●", "#3b82f6", "Estoque normal"),
            ("●", "#eab308", "Estoque baixo"),
            ("○", "#5e6a7d", "Caixa vazia"),
            ("●", "#06b6d4", "Solicitado / localizado")
        ]
        for icon, color, text in legendas:
            lbl_icon = ctk.CTkLabel(footer, text=icon, font=("Roboto", 14), text_color=color)
            lbl_icon.pack(side="left", padx=(15 if text != "Estoque normal" else 0, 5))
            lbl_text = ctk.CTkLabel(footer, text=text, font=("Roboto", 12), text_color="#94a3b8")
            lbl_text.pack(side="left")
            
    def criar_matriz(self, linhas, colunas):
        for r in range(linhas):
            self.matriz_frame.grid_rowconfigure(r, weight=1)
            for c in range(colunas):
                self.matriz_frame.grid_columnconfigure(c, weight=1)
                
                slot = SlotCard(self.matriz_frame, r=r, c=c, command=self.selecionar_slot)
                slot.grid(row=r, column=c, padx=5, pady=5, sticky="nsew")
                self.grid_botoes[(r, c)] = slot

    def selecionar_slot(self, r, c):
        if self.slot_selecionado:
            prev_r, prev_c = self.slot_selecionado
            self.grid_botoes[(prev_r, prev_c)].set_unselected()
            
        self.slot_selecionado = (r, c)
        slot_atual = self.grid_botoes[(r, c)]
        
        info = self.estoque_slots.get((r, c), {'qtd': 0, 'peca': None})
        peca = info['peca']
        
        if not peca:
            # Vazio, vai para o popup de cadastro
            slot_atual.set_selected()
            CadastroPecaPopup(self, self, r, c)
        else:
            # Tem peça, seleciona e mostra popup completo
            slot_atual.set_selected()
            OperacaoFlowPopup(self, self, r, c, info)

    def selecionar_da_busca(self, r, c):
        self.entry_busca.delete(0, 'end')
        self.dropdown_frame.place_forget()
        self.selecionar_slot(r, c)
        
    def on_search_type(self, event):
        termo = self.entry_busca.get().strip().lower()
        
        if not termo:
            self.dropdown_frame.place_forget()
            return
            
        resultados = []
        for (r, c), info in self.estoque_slots.items():
            peca = info['peca']
            if peca:
                nome = peca['nome'].lower()
                pid = str(peca['id'])
                if termo in nome or termo in pid:
                    resultados.append((r, c, peca))
                    
        for w in self.dropdown_frame.winfo_children():
            w.destroy()
            
        if not resultados:
            lbl = ctk.CTkLabel(self.dropdown_frame, text="Peça não existe", text_color="#94a3b8")
            lbl.pack(pady=10, padx=10, anchor="w")
        else:
            for r, c, peca in resultados:
                texto = f"{peca['nome']} (Caixa L{r}·C{c})"
                btn = ctk.CTkButton(self.dropdown_frame, text=texto, fg_color="transparent", hover_color="#2b3b54", text_color="#ffffff", anchor="w", command=lambda r=r, c=c: self.selecionar_da_busca(r, c))
                btn.pack(fill="x", pady=2, padx=5)
                
        # Calcula a posição para aparecer logo abaixo da barra de busca
        x_pos = self.entry_busca.winfo_rootx() - self.winfo_rootx()
        y_pos = self.entry_busca.winfo_rooty() - self.winfo_rooty() + self.entry_busca.winfo_height()
        
        self.dropdown_frame.place(x=x_pos, y=y_pos + 2)
        self.dropdown_frame.lift()
        
    def atualizar_matriz(self):
        self.estoque_slots = {}
        for (r, c), slot in self.grid_botoes.items():
            slot.set_empty()
            self.estoque_slots[(r, c)] = {'qtd': 0, 'peca': None}
            
        pecas = database.get_todas_pecas()
        for p in pecas:
            r = p['posicao_linha']
            c = p['posicao_coluna']
            qtd = p['quantidade_estoque']
            
            if (r, c) in self.grid_botoes:
                self.estoque_slots[(r, c)] = {'qtd': qtd, 'peca': p}
                slot = self.grid_botoes[(r, c)]
                slot.set_filled(nome=p['nome'], qtd=qtd, peca_id=p['id'], is_low_stock=(qtd <= 5))
                
        self.slot_selecionado = None
                
    def on_show(self, **kwargs):
        self.lbl_user.configure(text=f"Operador\nID {self.controller.funcionario_id}")
        self.atualizar_matriz()

class AdminDashboardScreen(DashboardScreen):
    def __init__(self, parent, controller):
        super().__init__(parent, controller)
        
        # Add "Nova Ordem de Serviço" button in the header
        header = self.winfo_children()[0] # The header frame is the first child
        frame_dir = header.winfo_children()[1] # The right side frame
        
        btn_nova_os = ctk.CTkButton(frame_dir, text="+ Ordem Serviço", width=120, fg_color="#10b981", hover_color="#059669", command=lambda: self.controller.show_frame(CreateOrdemScreen))
        btn_nova_os.pack(side="left", padx=10)


class CreateOrdemScreen(ctk.CTkFrame):
    def __init__(self, parent, controller):
        super().__init__(parent, fg_color="#0f111a")
        self.controller = controller
        self.itens_os = []
        
        header = ctk.CTkFrame(self, fg_color="transparent", height=60)
        header.pack(side="top", fill="x", padx=20, pady=10)
        
        lbl_title = ctk.CTkLabel(header, text="Nova Ordem de Serviço", font=("Roboto", 24, "bold"), text_color="#e2e8f0")
        lbl_title.pack(side="left")
        
        btn_voltar = ctk.CTkButton(header, text="Voltar", width=80, fg_color="transparent", border_width=1, border_color="#334155", text_color="#94a3b8", command=lambda: self.controller.show_frame(AdminDashboardScreen))
        btn_voltar.pack(side="right")
        
        content = ctk.CTkFrame(self, fg_color="transparent")
        content.pack(expand=True, fill="both", padx=20, pady=10)
        
        # Form
        form_frame = ctk.CTkFrame(content, fg_color="#1f2c40", corner_radius=8)
        form_frame.pack(fill="x", pady=10, ipady=10)
        
        self.entry_titulo = ctk.CTkEntry(form_frame, placeholder_text="Título da Ordem", width=300)
        self.entry_titulo.pack(pady=10)
        
        item_frame = ctk.CTkFrame(form_frame, fg_color="transparent")
        item_frame.pack(fill="x", padx=20)
        
        pecas_db = database.get_todas_pecas()
        nomes_pecas = [f"{p['nome']} (ID: {p['id']})" for p in pecas_db]
        
        self.combo_peca = ctk.CTkComboBox(item_frame, values=nomes_pecas, width=250)
        self.combo_peca.pack(side="left", padx=5)
        
        self.combo_op = ctk.CTkComboBox(item_frame, values=["REMOCAO", "ADICAO"], width=100)
        self.combo_op.pack(side="left", padx=5)
        
        self.entry_qtd = ctk.CTkEntry(item_frame, placeholder_text="Qtd", width=60)
        self.entry_qtd.pack(side="left", padx=5)
        
        btn_add_item = ctk.CTkButton(item_frame, text="Adicionar Item", width=100, command=self.adicionar_item)
        btn_add_item.pack(side="left", padx=10)
        
        self.list_frame = ctk.CTkScrollableFrame(content, fg_color="#1a1a24", corner_radius=8)
        self.list_frame.pack(expand=True, fill="both", pady=10)
        
        btn_salvar = ctk.CTkButton(content, text="SALVAR ORDEM", height=45, font=("Roboto", 16, "bold"), fg_color="#3b82f6", command=self.salvar_ordem)
        btn_salvar.pack(fill="x", pady=10)

    def on_show(self, **kwargs):
        self.itens_os = []
        self.entry_titulo.delete(0, 'end')
        self.entry_qtd.delete(0, 'end')
        for w in self.list_frame.winfo_children():
            w.destroy()
        
        # update dropdown with latest parts
        pecas_db = database.get_todas_pecas()
        nomes_pecas = [f"{p['nome']} (ID: {p['id']})" for p in pecas_db]
        self.combo_peca.configure(values=nomes_pecas)
            
    def adicionar_item(self):
        peca_str = self.combo_peca.get()
        if not peca_str: return
        peca_id = int(peca_str.split("ID: ")[1].replace(")", ""))
        op = self.combo_op.get()
        try:
            qtd = int(self.entry_qtd.get())
        except:
            messagebox.showerror("Erro", "Quantidade inválida.")
            return
            
        self.itens_os.append({'peca_id': peca_id, 'tipo_operacao': op, 'quantidade': qtd, 'nome': peca_str})
        
        lbl = ctk.CTkLabel(self.list_frame, text=f"{op} - {qtd}x {peca_str}", text_color="#ffffff", anchor="w")
        lbl.pack(fill="x", padx=10, pady=2)
        self.entry_qtd.delete(0, 'end')
        
    def salvar_ordem(self):
        titulo = self.entry_titulo.get().strip()
        if not titulo or not self.itens_os:
            messagebox.showerror("Erro", "Preencha o título e adicione itens.")
            return
        database.criar_ordem_servico(titulo, self.itens_os)
        messagebox.showinfo("Sucesso", "Ordem de serviço criada!")
        self.controller.show_frame(AdminDashboardScreen)


class SelectOrdemScreen(ctk.CTkFrame):
    def __init__(self, parent, controller):
        super().__init__(parent, fg_color="#0f111a")
        self.controller = controller
        
        header = ctk.CTkFrame(self, fg_color="transparent", height=60)
        header.pack(side="top", fill="x", padx=20, pady=10)
        
        lbl_title = ctk.CTkLabel(header, text="Ordens de Serviço Pendentes", font=("Roboto", 24, "bold"), text_color="#e2e8f0")
        lbl_title.pack(side="left")
        
        btn_sair = ctk.CTkButton(header, text="Sair", width=60, fg_color="transparent", border_width=1, border_color="#334155", text_color="#94a3b8", command=lambda: self.controller.show_frame(LoginScreen))
        btn_sair.pack(side="right")
        
        self.list_frame = ctk.CTkScrollableFrame(self, fg_color="#1a1a24", corner_radius=8)
        self.list_frame.pack(expand=True, fill="both", padx=20, pady=20)
        
    def on_show(self, **kwargs):
        for w in self.list_frame.winfo_children():
            w.destroy()
            
        ordens = database.get_ordens_servico_abertas()
        if not ordens:
            lbl = ctk.CTkLabel(self.list_frame, text="Nenhuma ordem de serviço pendente.", text_color="#94a3b8")
            lbl.pack(pady=20)
            return
            
        for o in ordens:
            f = ctk.CTkFrame(self.list_frame, fg_color="#1f2c40", corner_radius=8)
            f.pack(fill="x", padx=10, pady=5)
            lbl = ctk.CTkLabel(f, text=f"#{o['id']} - {o['titulo']}", font=("Roboto", 16, "bold"), text_color="#ffffff")
            lbl.pack(side="left", padx=15, pady=15)
            btn = ctk.CTkButton(f, text="INICIAR", command=lambda os_id=o['id'], os_titulo=o['titulo']: self.iniciar_os(os_id, os_titulo))
            btn.pack(side="right", padx=15, pady=15)
            
    def iniciar_os(self, os_id, os_titulo):
        itens = database.get_itens_ordem_servico(os_id)
        self.controller.current_os = {'id': os_id, 'titulo': os_titulo, 'itens': itens}
        self.controller.show_frame(OperarioWorkScreen)


class OperarioWorkScreen(DashboardScreen):
    def __init__(self, parent, controller):
        super().__init__(parent, controller)
        self.blink_state = False
        self.after_id = None
        
        # Add finish button to header
        header = self.winfo_children()[0]
        frame_dir = header.winfo_children()[1]
        
        self.btn_concluir = ctk.CTkButton(frame_dir, text="Concluir O.S.", width=100, fg_color="#10b981", command=self.concluir_os)
        self.btn_concluir.pack(side="left", padx=10)
        
    def on_show(self, **kwargs):
        super().on_show(**kwargs)
        self.piscar_posicoes()
        
    def selecionar_slot(self, r, c):
        if not self.controller.current_os:
            return
            
        # Verify if slot is in the current OS
        info = self.estoque_slots.get((r, c), {'qtd': 0, 'peca': None})
        peca = info['peca']
        if not peca:
            messagebox.showwarning("Aviso", "Este espaço está vazio.")
            return
            
        item_os = next((i for i in self.controller.current_os['itens'] if i['peca_id'] == peca['id']), None)
        if not item_os:
            messagebox.showwarning("Aviso", "Esta peça não consta na sua Ordem de Serviço atual.")
            return
            
        # Call the default behavior which opens the details
        super().selecionar_slot(r, c)
        
    def piscar_posicoes(self):
        if not self.controller.current_os or self.winfo_ismapped() == 0:
            if self.after_id:
                self.after_cancel(self.after_id)
                self.after_id = None
            return
            
        self.blink_state = not self.blink_state
        
        ids_na_os = [i['peca_id'] for i in self.controller.current_os['itens']]
        
        for (r, c), info in self.estoque_slots.items():
            peca = info['peca']
            if peca and peca['id'] in ids_na_os:
                slot = self.grid_botoes[(r, c)]
                if self.blink_state:
                    slot.configure(border_color="#22c55e", border_width=2) # Destaque verde
                else:
                    slot.set_unselected() # Volta ao normal
                    
        self.after_id = self.after(500, self.piscar_posicoes)
        
    def concluir_os(self):
        if self.controller.current_os:
            database.concluir_ordem_servico(self.controller.current_os['id'])
            self.controller.current_os = None
            messagebox.showinfo("Sucesso", "Ordem de serviço concluída!")
            if self.after_id:
                self.after_cancel(self.after_id)
            self.controller.show_frame(SelectOrdemScreen)

if __name__ == "__main__":
    app = SmartInventoryApp()
    app.mainloop()
