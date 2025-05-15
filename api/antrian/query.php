<?php

class Antrian {
    private $mysqli;
    private $tanggal;

    public function __construct($mysqli) {
        $this->mysqli = $mysqli;
        $this->tanggal = date("Y-m-d");
    }

    public function tambahAntrian() {
        $result = $this->mysqli->query("SELECT MAX(no_antrian) AS last FROM antrian WHERE tanggal='$this->tanggal'");
        $row = $result->fetch_assoc();
        $no_antrian = ($row['last'] !== null) ? $row['last'] + 1 : 1;

        $query = "INSERT INTO antrian (tanggal, no_antrian, status, update_date)
                  VALUES ('$this->tanggal', '$no_antrian', '0', NOW())";

        if ($this->mysqli->query($query)) {
            return $no_antrian;
        } else {
            return "Error: " . $this->mysqli->error;
        }
    }

    public function getAntrianSekarang() {
        $result = $this->mysqli->query("SELECT no_antrian FROM antrian WHERE tanggal='$this->tanggal' AND status=1 ORDER BY id DESC LIMIT 1");
        if ($result->num_rows > 0) {
            $data = $result->fetch_assoc();
            error_log("Antrian Sekarang: " . $data['no_antrian']);
            return $data['no_antrian'];
        } else {
            error_log("Tidak ada antrian sekarang");
            return "-";
        }
    }
    
    public function getAntrianSelanjutnya() {
        $result = $this->mysqli->query("SELECT id, no_antrian FROM antrian WHERE tanggal='$this->tanggal' AND status=0 ORDER BY id ASC LIMIT 1");
        if ($result->num_rows > 0) {
            $data = $result->fetch_assoc();
            error_log("Antrian Selanjutnya: " . $data['no_antrian']);
            return $data;
        } else {
            error_log("Tidak ada antrian selanjutnya");
            return null;
        }
    }

    public function updateAntrian($id) {
        $this->mysqli->query("UPDATE antrian SET status=1, update_date=NOW() WHERE id='$id'");
    }

    public function resetAntrian() {
        $this->mysqli->query("DELETE FROM antrian WHERE tanggal='$this->tanggal'");
    }

    // New method to get today's total queue
    public function getTotalAntrianHariIni() {
        $result = $this->mysqli->query("SELECT COUNT(*) as total FROM antrian WHERE tanggal='$this->tanggal'");
        $row = $result->fetch_assoc();
        return (int)$row['total'];
    }

    // New method to get all-time total queue
    public function getTotalAntrianSemua() {
        $result = $this->mysqli->query("SELECT COUNT(*) as total FROM antrian");
        $row = $result->fetch_assoc();
        return (int)$row['total'];
    }

    // New method to get remaining queue today
    public function getSisaAntrianHariIni() {
        $result = $this->mysqli->query("SELECT COUNT(*) as sisa FROM antrian WHERE tanggal='$this->tanggal' AND status=0");
        $row = $result->fetch_assoc();
        return (int)$row['sisa'];
    }
}

?>