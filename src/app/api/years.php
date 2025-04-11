<?php
// Encabezados necesarios para CORS y JSON
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// Configuración de la base de datos
$host = getenv('DB_HOST') ?: 'localhost';
$user = getenv('DB_USER') ?: 'root';
$password = getenv('DB_PASS') ?: '';
$database = getenv('DB_NAME') ?: 'facturacion';
$port = getenv('DB_PORT') ?: 3306;

// Conexión a MariaDB
$conn = new mysqli($host, $user, $password, $database, $port);

// Verificar conexión
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Error de conexión a la base de datos"]);
    exit();
}

// Consulta SQL
$sql = "SELECT DISTINCT YEAR(DOCFEC) AS year FROM movalmc WHERE DOCFEC IS NOT NULL ORDER BY year DESC";
$result = $conn->query($sql);

$years = [];

if ($result) {
    while ($row = $result->fetch_assoc()) {
        $years[] = intval($row['year']);
    }
    echo json_encode($years);
} else {
    http_response_code(500);
    echo json_encode(["error" => "Error al obtener los años"]);
}

$conn->close();
?>
