#include <WiFi.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include "Adafruit_Thermal.h"
#include "SoftwareSerial.h"

// Pins configuration
#define PRINT_BUTTON 4  
#define CALL_BUTTON 19  
#define NEXT_BUTTON 18  
#define LED_RED 15        // Red LED for WiFi connecting status
#define LED_GREEN 2       // Green LED for WiFi connected status
#define LED_PRINT 23      // LED for printing status

// Printer pins on ESP32
#define PRINTER_RX 16
#define PRINTER_TX 17

const char* server = "your api"; //api link or ip
const char* api_key = "your key";  // API key to match the PHP API

SoftwareSerial printerSerial(PRINTER_RX, PRINTER_TX); // RX, TX
Adafruit_Thermal printer(&printerSerial);
WiFiManager wifiManager;

bool callPressed = false;
bool nextPressed = false;
bool callUsed = false; // Flag agar "Next" hanya bisa digunakan setelah "Call"

void setup() {
    Serial.begin(115200);
    
    // Initialize printer serial
    printerSerial.begin(9600);
    printer.begin();
    delay(1000); // Give printer time to initialize

    pinMode(PRINT_BUTTON, INPUT_PULLUP);
    pinMode(CALL_BUTTON, INPUT_PULLUP);
    pinMode(NEXT_BUTTON, INPUT_PULLUP);
    pinMode(LED_RED, OUTPUT);
    pinMode(LED_GREEN, OUTPUT);
    pinMode(LED_PRINT, OUTPUT);

    // Initial LED states
    digitalWrite(LED_RED, HIGH);    // Red ON while connecting
    digitalWrite(LED_GREEN, LOW);   // Green OFF
    digitalWrite(LED_PRINT, LOW);   // Print LED OFF
    
    connectWiFi();
    
    // Test connection to server
    testServerConnection();
}

void loop() {
    if (digitalRead(PRINT_BUTTON) == LOW) {
        delay(300);
        tambahAntrian();
        while (digitalRead(PRINT_BUTTON) == LOW);  // Wait for button release
    }

    if (digitalRead(CALL_BUTTON) == LOW && !callPressed) {
        callPressed = true;
        delay(300);
        panggilAntrian();
        callUsed = true;
        
        // Visual feedback
        blinkLED(LED_GREEN, 2);
    } 
    if (digitalRead(CALL_BUTTON) == HIGH) {
        callPressed = false;
    }

    if (digitalRead(NEXT_BUTTON) == LOW && !nextPressed && callUsed) {
        nextPressed = true;
        delay(300);
        nextAntrian();
        callUsed = false;
        
        // Visual feedback
        blinkLED(LED_GREEN, 1);
    } 
    if (digitalRead(NEXT_BUTTON) == HIGH) {
        nextPressed = false;
    }
}

void connectWiFi() {
    Serial.println("Menghubungkan ke WiFi...");

    wifiManager.setTimeout(180); // Tunggu 3 menit sebelum restart
    if (!wifiManager.autoConnect("AntrianESP32")) {
        Serial.println("Gagal terhubung, restart ESP32...");
        ESP.restart();
    }

    Serial.println("WiFi Terhubung: " + WiFi.localIP().toString());
    // Update LED states after connection
    digitalWrite(LED_RED, LOW);     // Red OFF when connected
    digitalWrite(LED_GREEN, HIGH);  // Green ON when connected
}

// Test connection to server
void testServerConnection() {
    HTTPClient http;
    String testUrl = String(server) + "?action=get_antrian_sekarang";
    
    http.begin(testUrl);
    http.addHeader("X-API-Key", api_key);
    
    int httpCode = http.GET();
    if (httpCode > 0) {
        Serial.println("Server connection test: SUCCESS");
        String payload = http.getString();
        Serial.println("Response: " + payload);
    } else {
        Serial.println("Server connection test: FAILED");
        Serial.println("Error: " + http.errorToString(httpCode));
        blinkLED(LED_RED, 5); // Indicate error
    }
    http.end();
}

void tambahAntrian() {
    // Turn on print LED
    digitalWrite(LED_PRINT, HIGH);
    
    HTTPClient http;
    http.begin(server);
    http.addHeader("Content-Type", "application/x-www-form-urlencoded");
    http.addHeader("X-API-Key", api_key);  // Add API key in header

    int httpCode = http.POST("action=tambah_antrian");
    if (httpCode > 0) {
        String payload = http.getString();
        Serial.println("Response: " + payload);
        
        // Parse JSON response to get no_antrian
        int startPos = payload.indexOf("\"no_antrian\":") + 13;
        int endPos = payload.indexOf("}", startPos);
        String noAntrian = payload.substring(startPos, endPos);
        noAntrian.trim();
        
        printTicket(noAntrian);
    } else {
        Serial.println("Error: " + http.errorToString(httpCode));
        blinkLED(LED_RED, 3); // Indicate error
    }
    http.end();
    
    // Turn off print LED after printing is complete
    digitalWrite(LED_PRINT, LOW);
}

void panggilAntrian() {
    HTTPClient http;
    
    http.begin(server);
    http.addHeader("Content-Type", "application/x-www-form-urlencoded");
    http.addHeader("X-API-Key", api_key);
    
    String postData = "action=panggil_antrian&trigger_web=true";
    int postCode = http.POST(postData);
    
    if (postCode > 0) {
        Serial.printf("[HTTP] Response code: %d\n", postCode);
        String response = http.getString();
        Serial.println("Response: " + response);
        
        // Parse JSON untuk mendapatkan nomor antrian
        int startPos = response.indexOf("\"no_antrian\":") + 13;
        int endPos = response.indexOf("\"", startPos);
        String currentAntrian = response.substring(startPos, endPos);
        
        if (currentAntrian != "") {
            blinkLED(LED_GREEN, 2);
        } else {
            blinkLED(LED_RED, 1);
        }
    } else {
        Serial.printf("[HTTP] Gagal, error: %s\n", http.errorToString(postCode).c_str());
        blinkLED(LED_RED, 3);
        tryAlternativePanggilMethod();
    }
    http.end();
}

// Backup method if the first fails
void tryAlternativePanggilMethod() {
    HTTPClient http;
    String url = String(server) + "?action=panggil_antrian&trigger_web=true";
    
    http.begin(url);
    http.addHeader("X-API-Key", api_key);
    
    Serial.println("Trying alternative GET method: " + url);
    
    int httpCode = http.GET();
    if (httpCode > 0) {
        Serial.printf("[HTTP] Alternative method response: %d\n", httpCode);
        String payload = http.getString();
        Serial.println("Response: " + payload);
    } else {
        Serial.printf("[HTTP] Alternative method failed: %s\n", http.errorToString(httpCode).c_str());
    }
    http.end();
}

void nextAntrian() {
    HTTPClient http;
    http.begin(server);
    http.addHeader("Content-Type", "application/x-www-form-urlencoded");
    http.addHeader("X-API-Key", api_key);  // Add API key in header

    int httpCode = http.POST("action=next_antrian");
    if (httpCode > 0) {
        String payload = http.getString();
        Serial.println("Next antrian: " + payload);
        
        // Parse JSON response
        if (payload.indexOf("\"success\":true") > -1) {
            blinkLED(LED_GREEN, 1); // Indicate success
        }
    } else {
        Serial.println("Error: " + http.errorToString(httpCode));
        blinkLED(LED_RED, 3); // Indicate error
    }
    http.end();
}

// Print ticket with nice formatting using Adafruit library
void printTicket(String noAntrian) {
    // Reset printer settings
    printer.setDefault();
    
    // Print header
    printer.justify('C');
    printer.setSize('M');
    printer.println(F("PDAM TIRTARAHARJA"));
    printer.println(F("NOMOR ANTRIAN"));
    
    // Print queue number (large)
    printer.setSize('L');
    printer.println(noAntrian);
    
    // Reset to normal size
    printer.setSize('S');
    
    // Print thank you note
    printer.println(F("Terima Kasih"));
    printer.println(F("Mohon Menunggu"));

    // Add extra spacing before cutting
    printer.feed(6);  // Increased spacing
}

// Helper function to blink LED
void blinkLED(int pin, int times) {
    int currentState = digitalRead(pin);
    for (int i = 0; i < times; i++) {
        digitalWrite(pin, HIGH);
        delay(100);
        digitalWrite(pin, LOW);
        delay(100);
    }
    digitalWrite(pin, currentState); // Restore original state
}