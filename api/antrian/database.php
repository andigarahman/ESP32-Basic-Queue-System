<?php

$host = 'your ip';
$user = 'root';
$pass = '';
$db   = 'antrian_db';

$mysqli = new mysqli($host, $user, $pass, $db);
if ($mysqli->connect_error) {
    die("Koneksi gagal: " . $mysqli->connect_error);
}
?>