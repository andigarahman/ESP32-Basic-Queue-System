// Konfigurasi API
const apiBase = "your api link / ip";
const apiHeaders = {
    'X-API-Key': 'api key',
    'Content-Type': 'application/x-www-form-urlencoded'
};

// Inisialisasi elemen HTML
const nomorAntrianElem = document.getElementById('nomor-antrian');
const totalAntrianElem = document.getElementById('total-antri');
const sisaAntrianElem = document.getElementById('sisa-antri');
const tombolPanggil = document.getElementById('tombol-panggil');
const tombolSelanjutnya = document.getElementById('tombol-selanjutnya');

// Variabel untuk melacak status suara
let isSpeaking = false;

// Fungsi untuk memanggil antrian dengan suara
async function panggilAntrian(nomor) {
    if (!nomor || nomor === "-" || isSpeaking) return;
    
    isSpeaking = true;
    
    return new Promise((resolve) => {
        const text = `Nomor antrian ${nomor}, silakan menuju loket.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "id-ID";
        utterance.rate = 0.9;
        utterance.volume = 1;

        // Cari suara bahasa Indonesia
        const voices = speechSynthesis.getVoices();
        const indoVoice = voices.find(v => v.lang === "id-ID");
        if (indoVoice) utterance.voice = indoVoice;

        utterance.onend = () => {
            console.log(`Selesai memanggil nomor: ${nomor}`);
            isSpeaking = false;
            resolve();
        };

        utterance.onerror = () => {
            isSpeaking = false;
            resolve();
        };

        // Hentikan panggilan sebelumnya dan mulai yang baru
        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
    });
}

// Fungsi untuk update tampilan
function updateDisplay(data) {
    if (data.antrian !== undefined && nomorAntrianElem) {
        nomorAntrianElem.textContent = data.antrian || '-';
    }
    if (data.total !== undefined && totalAntrianElem) {
        totalAntrianElem.textContent = data.total || '0';
    }
    if (data.sisa !== undefined && sisaAntrianElem) {
        sisaAntrianElem.textContent = data.sisa || '0';
    }
}

// Fungsi untuk mengambil data antrian
async function fetchQueueData() {
    try {
        const [currentRes, totalRes, sisaRes] = await Promise.all([
            fetch(`${apiBase}?action=get_antrian_sekarang`, { headers: apiHeaders }),
            fetch(`${apiBase}?action=get_total_antrian_hari_ini`, { headers: apiHeaders }),
            fetch(`${apiBase}?action=get_sisa_antrian_hari_ini`, { headers: apiHeaders })
        ]);

        const [currentData, totalData, sisaData] = await Promise.all([
            currentRes.json(),
            totalRes.json(),
            sisaRes.json()
        ]);

        return {
            current: currentData.antrian || '-',
            total: totalData.total || '0',
            sisa: sisaData.sisa || '0'
        };
    } catch (error) {
        console.error('Error fetching queue data:', error);
        return {
            current: '-',
            total: '0',
            sisa: '0'
        };
    }
}

// Fungsi untuk memproses antrian selanjutnya
async function nextAntrian() {
    if (!tombolSelanjutnya || isSpeaking) return;

    try {
        const response = await fetch(apiBase, {
            method: "POST",
            headers: apiHeaders,
            body: "action=next_antrian"
        });

        const data = await response.json();

        if (data.success) {
            await updateQueueData();
            if (data.no_antrian) {
                await panggilAntrian(data.no_antrian);
            }
        }
    } catch (error) {
        console.error("Error in nextAntrian:", error);
    }
}

// Fungsi untuk menangani panggilan manual dari web
async function handleManualCall() {
    const currentNumber = nomorAntrianElem?.textContent.trim();
    if (currentNumber && currentNumber !== '-' && !isSpeaking) {
        await panggilAntrian(currentNumber);
        await fetch(apiBase, {
            method: "POST",
            headers: apiHeaders,
            body: "action=panggil_antrian&trigger_web=false"
        });
    }
}

// Fungsi untuk mengecek trigger dari ESP32
async function checkEspTrigger() {
    try {
        const response = await fetch(`${apiBase}?action=check_call_trigger`, {
            headers: apiHeaders
        });
        const data = await response.json();
        
        if (data.trigger_call && data.number && !isSpeaking) {
            // Update display dengan nomor terbaru
            if (nomorAntrianElem) {
                nomorAntrianElem.textContent = data.number;
            }
            
            // Panggil nomor antrian
            await panggilAntrian(data.number);
        }
    } catch (error) {
        console.error("Error checking ESP trigger:", error);
    }
}

// Fungsi untuk memperbarui data antrian
async function updateQueueData() {
    const data = await fetchQueueData();
    updateDisplay(data);
}

// Inisialisasi tombol
function initButtons() {
    if (tombolPanggil) {
        tombolPanggil.addEventListener('click', handleManualCall);
    }

    if (tombolSelanjutnya) {
        tombolSelanjutnya.addEventListener('click', nextAntrian);
    }
}

// Fungsi utama saat halaman dimuat
document.addEventListener('DOMContentLoaded', async () => {
    // Inisialisasi suara
    speechSynthesis.onvoiceschanged = () => {
        speechSynthesis.getVoices(); // Memuat daftar suara
    };

    // Inisialisasi tombol dan data pertama kali
    initButtons();
    await updateQueueData();

    // Polling untuk trigger ESP (setiap 500ms)
    setInterval(checkEspTrigger, 500);
    
    // Polling untuk update data antrian (setiap 3 detik)
    setInterval(updateQueueData, 3000);
});