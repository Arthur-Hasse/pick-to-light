/*
 =========================================================================
   PICK TO LIGHT INDUSTRIAL - ESP32 WI-FI
   Teste com 1 Linha de 3 LEDs + 1 Botão por LED (Caixas 1, 2 e 3)
 =========================================================================

 ESQUEMA DE LIGAÇÃO:
 -------------------------------------------------------------------------
 1) LEDs (Baseado na sua matriz 5x4):
    - Linha 1 (Ânodo comum): GPIO 13
    - Coluna 1 (Cátodo LED 1 - Caixa 1): GPIO 19
    - Coluna 2 (Cátodo LED 2 - Caixa 2): GPIO 21
    - Coluna 3 (Cátodo LED 3 - Caixa 3): GPIO 22

    * Como acender cada LED:
      - Linha 13 vai para HIGH (3.3V).
      - Coluna correspondente (19, 21 ou 22) vai para LOW (0V) -> LED ACENDE!
      - Coluna em HIGH -> LED APAGADO.

 2) BOTÕES (Push Buttons NA - 1 por caixa):
    - Botão 1 (Caixa 1): 3.3V -> Botão -> GPIO 25 (Resistor 10k para GND)
    - Botão 2 (Caixa 2): 3.3V -> Botão -> GPIO 26 (Resistor 10k para GND)
    - Botão 3 (Caixa 3): 3.3V -> Botão -> GPIO 27 (Resistor 10k para GND)

 3) COMUNICAÇÃO:
    - O ESP32 conecta no seu Wi-Fi e roda um Web Server HTTP na porta 80.
    - Endpoints disponíveis:
        GET /led?box=1    -> Acende o LED da Caixa 1
        GET /led?box=2    -> Acende o LED da Caixa 2
        GET /led?box=3    -> Acende o LED da Caixa 3
        GET /clear        -> Apaga todos os LEDs
        GET /status       -> Retorna JSON com o status dos LEDs e botões
 =========================================================================
*/

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>

// -------------------------------------------------------------------------
// 1. CONFIGURAÇÃO DA REDE WI-FI
// -------------------------------------------------------------------------
const char* WIFI_SSID     = "SUA_REDE_WIFI";       // <-- Coloque o nome do seu Wi-Fi
const char* WIFI_PASSWORD = "SUA_SENHA_WIFI";     // <-- Coloque a senha do seu Wi-Fi

// (Opcional) URL do seu servidor Web para notificar o botão físico
// Exemplo local: "http://192.168.1.100:3000/api/esp32" ou na Vercel: "https://pick-to-light-xxx.vercel.app/api/esp32"
const char* SERVER_API_URL = ""; 

// -------------------------------------------------------------------------
// 2. PINOS DOS LEDS E BOTÕES
// -------------------------------------------------------------------------
#define PINO_LINHA_1 13

const int PINOS_COLUNAS[3] = { 19, 21, 22 }; // Colunas 1, 2 e 3 (Caixas 1, 2 e 3)
const int PINOS_BOTOES[3]  = { 25, 26, 27 }; // Botões 1, 2 e 3

// Estado dos 3 LEDs (true = aceso, false = apagado)
bool ledAtivo[3] = { false, false, false };

// Último botão físico pressionado
int ultimoBotaoPressionado = 0;
unsigned long ultimoDebounce[3] = { 0, 0, 0 };
const unsigned long DEBOUNCE_DELAY_MS = 250;

WebServer server(80);

// -------------------------------------------------------------------------
// 3. FUNÇÕES DE CONTROLE DE HARDWARE
// -------------------------------------------------------------------------
void atualizarHardwareLEDs() {
  digitalWrite(PINO_LINHA_1, HIGH); // Ativa o ânodo da Linha 1

  for (int i = 0; i < 3; i++) {
    if (ledAtivo[i]) {
      digitalWrite(PINOS_COLUNAS[i], LOW);  // LOW = Conduz corrente (Acende)
    } else {
      digitalWrite(PINOS_COLUNAS[i], HIGH); // HIGH = Corta corrente (Apaga)
    }
  }
}

void apagarTodosLEDs() {
  for (int i = 0; i < 3; i++) {
    ledAtivo[i] = false;
  }
  atualizarHardwareLEDs();
  Serial.println("[PICK TO LIGHT] Todos os LEDs foram desligados.");
}

void acenderLED(int caixa) {
  if (caixa < 1 || caixa > 3) {
    Serial.println("[ERRO] Caixa invalida! Use 1, 2 ou 3.");
    return;
  }
  
  // No Pick to Light padrão, acendemos a caixa da tarefa atual
  ledAtivo[caixa - 1] = true;
  atualizarHardwareLEDs();
  
  Serial.print("[PICK TO LIGHT] LED da Caixa ");
  Serial.print(caixa);
  Serial.println(" ACESO.");
}

// -------------------------------------------------------------------------
// 4. ENVIO DE EVENTO DE BOTÃO PARA O SITE (OPCIONAL)
// -------------------------------------------------------------------------
void notificarServidorBotaoPressionado(int caixa) {
  if (strlen(SERVER_API_URL) == 0 || WiFi.status() != WL_CONNECTED) {
    return;
  }

  HTTPClient http;
  http.begin(SERVER_API_URL);
  http.addHeader("Content-Type", "application/json");

  String jsonPayload = "{\"action\":\"button_pressed\",\"box\":" + String(caixa) + "}";
  int httpCode = http.POST(jsonPayload);

  if (httpCode > 0) {
    Serial.printf("[WEB SYNC] Servidor notificado: Botao %d (HTTP %d)\n", caixa, httpCode);
  } else {
    Serial.printf("[WEB SYNC] Falha ao notificar servidor: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

// -------------------------------------------------------------------------
// 5. ROTAS DO SERVIDOR WEB HTTP NO ESP32
// -------------------------------------------------------------------------
void enviarRespostaCORS(String json) {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
  server.send(200, "application/json", json);
}

void handleOptions() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
  server.send(204);
}

void handleLed() {
  if (server.hasArg("box")) {
    int box = server.arg("box").toInt();
    if (box >= 1 && box <= 3) {
      // Desliga os outros e acende apenas o solicitado
      apagarTodosLEDs();
      acenderLED(box);
      enviarRespostaCORS("{\"success\":true,\"activeBox\":" + String(box) + "}");
      return;
    }
  }
  enviarRespostaCORS("{\"error\":\"Parametro ?box= deve ser 1, 2 ou 3\"}");
}

void handleClear() {
  apagarTodosLEDs();
  enviarRespostaCORS("{\"success\":true,\"message\":\"Todos os LEDs apagados\"}");
}

void handleStatus() {
  String json = "{";
  json += "\"box1\":" + String(ledAtivo[0] ? "true" : "false") + ",";
  json += "\"box2\":" + String(ledAtivo[1] ? "true" : "false") + ",";
  json += "\"box3\":" + String(ledAtivo[2] ? "true" : "false") + ",";
  json += "\"lastButtonPressed\":" + String(ultimoBotaoPressionado);
  json += "}";
  
  // Reseta o último botão após ser lido pelo site
  ultimoBotaoPressionado = 0;
  enviarRespostaCORS(json);
}

// -------------------------------------------------------------------------
// 6. SETUP
// -------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n==============================================");
  Serial.println("  MULTILOG - PICK TO LIGHT ESP32 WI-FI");
  Serial.println("  Teste com Linha 1: 3 Caixas (LEDs e Botoes)");
  Serial.println("==============================================");

  // Configuração dos pinos dos LEDs
  pinMode(PINO_LINHA_1, OUTPUT);
  digitalWrite(PINO_LINHA_1, HIGH);

  for (int i = 0; i < 3; i++) {
    pinMode(PINOS_COLUNAS[i], OUTPUT);
    digitalWrite(PINOS_COLUNAS[i], HIGH); // Inicialmente apagado
  }

  // Configuração dos pinos dos botões
  for (int i = 0; i < 3; i++) {
    pinMode(PINOS_BOTOES[i], INPUT);
  }

  // Conectar ao Wi-Fi
  Serial.print("Conectando ao Wi-Fi: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 30) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WI-FI CONECTADO COM SUCESSO!]");
    Serial.print(">>> IP DO ESP32: http://");
    Serial.println(WiFi.localIP());
    Serial.println("Use esse IP na tela do operador no site.");
  } else {
    Serial.println("\n[AVISO] Falha ao conectar ao Wi-Fi. Verifique SSID e senha.");
  }

  // Configuração das rotas do servidor web
  server.on("/led", HTTP_GET, handleLed);
  server.on("/clear", HTTP_GET, handleClear);
  server.on("/status", HTTP_GET, handleStatus);
  server.onNotFound(handleOptions); // Trata CORS OPTIONS

  server.begin();
  Serial.println("Servidor HTTP do ESP32 iniciado na porta 80.\n");
}

// -------------------------------------------------------------------------
// 7. LOOP PRINCIPAL
// -------------------------------------------------------------------------
void loop() {
  // Trata requisições HTTP do site
  server.handleClient();

  // -----------------------------------------------------------------------
  // Verificação dos 3 botões físicos das caixas
  // -----------------------------------------------------------------------
  unsigned long agora = millis();

  for (int i = 0; i < 3; i++) {
    int estadoBotao = digitalRead(PINOS_BOTOES[i]);

    if (estadoBotao == HIGH && (agora - ultimoDebounce[i] > DEBOUNCE_DELAY_MS)) {
      ultimoDebounce[i] = agora;
      int caixa = i + 1;

      Serial.print("[BOTAO PRESSIONADO] Caixa ");
      Serial.println(caixa);

      // Desliga o LED da caixa imediatamente (feedback do operador)
      ledAtivo[i] = false;
      atualizarHardwareLEDs();

      ultimoBotaoPressionado = caixa;

      // Notifica o backend se configurado
      notificarServidorBotaoPressionado(caixa);

      // Espera soltar o botão
      while (digitalRead(PINOS_BOTOES[i]) == HIGH) {
        delay(10);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Reconexão Wi-Fi automática se cair
  // -----------------------------------------------------------------------
  if (WiFi.status() != WL_CONNECTED && (agora % 10000 == 0)) {
    Serial.println("[WI-FI] Tentando reconectar...");
    WiFi.reconnect();
  }
}
