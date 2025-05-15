<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: X-API-Key, Content-Type");

require 'database.php';
require 'query.php';

// API Key Security
$valid_api_key = "your key"; //insert a key
$provided_api_key = $_SERVER['HTTP_X_API_KEY'] ?? '';

if ($_SERVER['REQUEST_METHOD'] !== 'OPTIONS' && $provided_api_key !== $valid_api_key) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Invalid API Key"]);
    exit();
}

$antrian = new Antrian($mysqli);

header('Content-Type: application/json');

// Flag file for ESP32 trigger
$triggerFlagFile = 'call_triggered.flag';

// Get action from either POST or GET
$action = '';
// Handle all action requests regardless of method
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $action = $_POST['action'] ?? '';
} elseif ($_SERVER['REQUEST_METHOD'] == 'GET') {
    $action = $_GET['action'] ?? '';
}
error_log("Action received: " . $action . " via " . $_SERVER['REQUEST_METHOD']);

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    if ($action == 'tambah_antrian') {
        echo json_encode(["success" => true, "no_antrian" => $antrian->tambahAntrian()]);
    } elseif ($action == 'update_antrian') {
        // [kode update_antrian tetap sama]
    } elseif ($action == 'reset_antrian') {
        // [kode reset_antrian tetap sama]
    } elseif ($action == 'panggil_antrian') {
        $antrianSekarang = $antrian->getAntrianSekarang();
        if ($antrianSekarang && $antrianSekarang != "-") {
            // Create a flag file for triggering web notification
            file_put_contents($triggerFlagFile, $antrianSekarang);
            
            echo json_encode([
                "success" => true, 
                "no_antrian" => $antrianSekarang,
                "trigger_web" => true,
                "message" => "Antrian berhasil dipanggil"
            ]);
        } else {
            echo json_encode([
                "success" => false, 
                "message" => "Tidak ada antrian tersedia untuk dipanggil"
            ]);
        }
    } elseif ($action == 'next_antrian') {
        $antrianSelanjutnya = $antrian->getAntrianSelanjutnya();
        if ($antrianSelanjutnya) {
            $antrian->updateAntrian($antrianSelanjutnya['id']);
            
            // Create a flag file for triggering web notification
            file_put_contents($triggerFlagFile, $antrianSelanjutnya['no_antrian']);
            
            echo json_encode(["success" => true, "no_antrian" => $antrianSelanjutnya['no_antrian']]);
        } else {
            echo json_encode(["success" => false, "message" => "Tidak ada antrian tersedia"]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "Aksi tidak valid"]);
    }
}

// Special GET actions
if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    if ($action == 'get_antrian_sekarang') {
        echo json_encode(["antrian" => $antrian->getAntrianSekarang()]);
    } elseif ($action == 'get_antrian_selanjutnya') {
        echo json_encode($antrian->getAntrianSelanjutnya() ?? []);
    } elseif ($action == 'check_call_trigger') {
        $triggered = file_exists($triggerFlagFile);
        if ($triggered) {
            $number = file_get_contents($triggerFlagFile);
            unlink($triggerFlagFile);
            echo json_encode([
                "trigger_call" => true,
                "number" => $number
            ]);
        } else {
            echo json_encode(["trigger_call" => false]);
        }
    } elseif ($action == 'get_total_antrian_hari_ini') {
        echo json_encode(["success" => true, "total" => $antrian->getTotalAntrianHariIni()]);
    } elseif ($action == 'get_total_antrian_semua') {
        echo json_encode(["success" => true, "total" => $antrian->getTotalAntrianSemua()]);
    } elseif ($action == 'get_sisa_antrian_hari_ini') {
        echo json_encode(["success" => true, "sisa" => $antrian->getSisaAntrianHariIni()]);
    } else {
        echo json_encode(["success" => false, "message" => "Aksi tidak valid"]);
    }
}
?>