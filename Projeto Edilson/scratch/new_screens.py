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
        
        # Add finish button to header
        header = self.winfo_children()[0]
        frame_dir = header.winfo_children()[1]
        
        self.btn_concluir = ctk.CTkButton(frame_dir, text="Concluir O.S.", width=100, fg_color="#10b981", command=self.concluir_os)
        self.btn_concluir.pack(side="left", padx=10)
        
    def on_show(self, **kwargs):
        super().on_show(**kwargs)
        self.lbl_user.configure(text=f"Operador\n{self.controller.usuario_nome}")
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
            
        # Se consta, abre o fluxo, mas restringe a operacao?
        # A OperacaoFlowPopup permite escolher ADD ou REMOVER. Para facilitar, o operário só fará o que está na OS.
        # Mas para não modificar toda a classe OperacaoFlowPopup agora, avisamos ou criamos um popup específico.
        # Por hora, reutilizaremos o OperacaoFlowPopup, o funcionário tem que seguir a OS.
        super().selecionar_slot(r, c)
        
    def piscar_posicoes(self):
        if not self.controller.current_os or self.winfo_ismapped() == 0:
            # Pára de piscar se sair da tela
            return
            
        self.blink_state = not self.blink_state
        
        ids_na_os = [i['peca_id'] for i in self.controller.current_os['itens']]
        
        for (r, c), info in self.estoque_slots.items():
            peca = info['peca']
            if peca and peca['id'] in ids_na_os:
                slot = self.grid_botoes[(r, c)]
                if self.blink_state:
                    slot.configure(border_color="#f59e0b", border_width=2) # Destaque
                else:
                    slot.set_unselected() # Volta ao normal
                    
        self.after(500, self.piscar_posicoes)
        
    def concluir_os(self):
        if self.controller.current_os:
            database.concluir_ordem_servico(self.controller.current_os['id'])
            self.controller.current_os = None
            messagebox.showinfo("Sucesso", "Ordem de serviço concluída!")
            self.controller.show_frame(SelectOrdemScreen)
