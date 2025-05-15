// Konfigurasi API
const apiBase = "your api link / ip";
const apiHeaders = {
    'X-API-Key': 'api key',
    'Content-Type': 'application/x-www-form-urlencoded'
};

// Inisialisasi elemen HTML berdasarkan struktur antrian.html
const nomorAntrianElem = document.getElementById('nomor-antrian');
const antrianSelanjutnyaElem = document.getElementById('antrian-selanjutnya');
const dummyCallBtn = document.getElementById('dummy-call-btn');

// Variabel untuk melacak antrian
let currentAntrianId = null;

// Fungsi untuk memanggil antrian dengan suara
function speakAntrian(nomor) {
    if (!nomor || nomor === "-") return;

    const text = `Nomor antrian ${nomor}, silakan menuju loket.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 0.9;
    utterance.volume = 1;

    // Cari suara bahasa Indonesia
    const voices = speechSynthesis.getVoices();
    const indoVoice = voices.find(v => v.lang === "id-ID");
    if (indoVoice) utterance.voice = indoVoice;

    // Hentikan panggilan sebelumnya dan mulai yang baru
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
}

// Fungsi untuk mengambil antrian saat ini
async function fetchAntrianSekarang() {
    try {
        const response = await fetch(`${apiBase}?action=get_antrian_sekarang`, {
            headers: apiHeaders
        });
        const data = await response.json();
        return data.antrian || "-";
    } catch (error) {
        console.error("Error fetching current queue:", error);
        return "-";
    }
}

// Fungsi untuk mengambil antrian selanjutnya
async function fetchAntrianSelanjutnya() {
    try {
        const response = await fetch(`${apiBase}?action=get_antrian_selanjutnya`, {
            headers: apiHeaders
        });
        const data = await response.json();
        
        if (data && data.id) {
            currentAntrianId = data.id;
            return data.no_antrian;
        }
        return "-";
    } catch (error) {
        console.error("Error fetching next queue:", error);
        return "-";
    }
}

// Fungsi untuk memeriksa trigger panggilan dari ESP32
async function checkCallTrigger() {
    try {
        const response = await fetch(`${apiBase}?action=check_call_trigger`, {
            headers: apiHeaders
        });
        const data = await response.json();
        
        if (data.trigger_call) {
            const nomor = data.number;
            nomorAntrianElem.textContent = nomor;
            speakAntrian(nomor);
            return true;
        }
        return false;
    } catch (error) {
        console.error("Error checking call trigger:", error);
        return false;
    }
}

// Fungsi untuk memperbarui tampilan
async function updateDisplay() {
    const [current, next] = await Promise.all([
        fetchAntrianSekarang(),
        fetchAntrianSelanjutnya()
    ]);
    
    nomorAntrianElem.textContent = current;
    antrianSelanjutnyaElem.textContent = next;
}

// Event listener untuk tombol dummy panggil
if (dummyCallBtn) {
    dummyCallBtn.addEventListener('click', async () => {
        const nomor = nomorAntrianElem.textContent.trim();
        if (nomor !== "-") {
            speakAntrian(nomor);
            
            // Beri feedback ke server bahwa antrian dipanggil
            try {
                await fetch(apiBase, {
                    method: "POST",
                    headers: apiHeaders,
                    body: "action=panggil_antrian&trigger_web=false"
                });
            } catch (error) {
                console.error("Error sending call notification:", error);
            }
        } else {
            alert("Tidak ada antrian yang bisa dipanggil.");
        }
    });
}

// Inisialisasi suara saat halaman dimuat
speechSynthesis.onvoiceschanged = () => {
    speechSynthesis.getVoices(); // Memuat daftar suara yang tersedia
};

// Fungsi utama untuk polling data
async function mainLoop() {
    // Periksa trigger panggilan dari ESP32
    await checkCallTrigger();
    
    // Perbarui tampilan
    await updateDisplay();
    
    // Jadwalkan pemanggilan berikutnya
    setTimeout(mainLoop, 500);
}

// Mulai aplikasi
document.addEventListener('DOMContentLoaded', () => {
    // Inisialisasi pertama kali
    updateDisplay();
    
    // Mulai polling
    mainLoop();
});