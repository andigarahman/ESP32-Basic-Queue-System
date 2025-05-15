// Konfigurasi API
const apiBase = "your api link / api";
const apiHeaders = {
    'X-API-Key': 'api key',
    'Content-Type': 'application/x-www-form-urlencoded'
};

// Inisialisasi elemen HTML
const antrianSekarangElem = document.getElementById('antrian-sekarang');
const antrianSelanjutnyaElem = document.getElementById('antrian-selanjutnya');
const jumlahAntrianElem = document.getElementById('Jumlah-antrian');

// Fungsi untuk mengambil data antrian saat ini
async function fetchAntrianSekarang() {
    try {
        const response = await fetch(`${apiBase}?action=get_antrian_sekarang`, {
            headers: apiHeaders
        });
        const data = await response.json();
        return data.antrian || '-';
    } catch (error) {
        console.error("Error fetching current queue:", error);
        return '-';
    }
}

// Fungsi untuk mengambil antrian selanjutnya
async function fetchAntrianSelanjutnya() {
    try {
        const response = await fetch(`${apiBase}?action=get_antrian_selanjutnya`, {
            headers: apiHeaders
        });
        const data = await response.json();
        return data.no_antrian || '-';
    } catch (error) {
        console.error("Error fetching next queue:", error);
        return '-';
    }
}

// Fungsi untuk mengambil jumlah antrian
async function fetchJumlahAntrian() {
    try {
        const response = await fetch(`${apiBase}?action=get_total_antrian_hari_ini`, {
            headers: apiHeaders
        });
        const data = await response.json();
        return data.total || '0';
    } catch (error) {
        console.error("Error fetching total queue:", error);
        return '0';
    }
}

// Fungsi untuk memperbarui semua data antrian
async function updateAllData() {
    try {
        const [current, next, total] = await Promise.all([
            fetchAntrianSekarang(),
            fetchAntrianSelanjutnya(),
            fetchJumlahAntrian()
        ]);

        // Update tampilan
        if (antrianSekarangElem) antrianSekarangElem.textContent = current;
        if (antrianSelanjutnyaElem) antrianSelanjutnyaElem.textContent = next;
        if (jumlahAntrianElem) jumlahAntrianElem.textContent = total;
    } catch (error) {
        console.error("Error updating all data:", error);
    }
}

// Fungsi utama saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    // Update data pertama kali
    updateAllData();
    
    // Set interval untuk update data setiap 3 detik
    setInterval(updateAllData, 3000);
});