<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// Configuración de la base de datos
$host = getenv('DB_HOST') ?: 'localhost';
$user = getenv('DB_USER') ?: 'root';
$password = getenv('DB_PASS') ?: '';
$database = getenv('DB_NAME') ?: 'facturacion';
$port = getenv('DB_PORT') ?: 3306;

$conn = new mysqli($host, $user, $password, $database, $port);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Error de conexión a la base de datos"]);
    exit();
}

// Múltiples años con ?years=2025,2024
if (isset($_GET['years'])) {
    $years = explode(',', $_GET['years']);
    $conditions = [];

    foreach ($years as $year) {
        $year = trim($year);
        if (preg_match('/^\d{4}$/', $year)) {
            $conditions[] = "(DOCFEC BETWEEN '$year-01-01' AND '$year-12-31')";
        }
    }

    if (empty($conditions)) {
        echo json_encode([]);
        exit();
    }

    $whereClause = implode(' OR ', $conditions);

    $sql = "
        SELECT CODTER, DOCFEC, BASEBAS, IMPTBAS, RECBAS, YEAR(DOCFEC) AS year
        FROM movalmc
        WHERE $whereClause
    ";

    $result = $conn->query($sql);

    $grouped = [];

    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $year = $row['year'];
            if (!isset($grouped[$year])) $grouped[$year] = [];

            $grouped[$year][] = [
                'CODTER' => $row['CODTER'],
                'DOCFEC' => $row['DOCFEC'],
                'BASEBAS' => $row['BASEBAS'],
                'IMPTBAS' => $row['IMPTBAS'],
                'RECBAS' => $row['RECBAS']
            ];
        }
        echo json_encode($grouped);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Error al obtener los datos"]);
    }

} else {
    // Año único con ?year=2024
    $year = isset($_GET['year']) ? $_GET['year'] : date('Y');
    if (!preg_match('/^\d{4}$/', $year)) {
        http_response_code(400);
        echo json_encode(["error" => "Año inválido"]);
        exit();
    }

    $startDate = "$year-01-01";
    $endDate = "$year-12-31";

    $stmt = $conn->prepare("
        SELECT CODTER, DOCFEC, BASEBAS, IMPTBAS, RECBAS
        FROM movalmc
        WHERE DOCFEC BETWEEN ? AND ?
    ");
    $stmt->bind_param('ss', $startDate, $endDate);
    $stmt->execute();
    $result = $stmt->get_result();

    $movimientos = [];

    while ($row = $result->fetch_assoc()) {
        $movimientos[] = $row;
    }

    echo json_encode($movimientos);
    $stmt->close();
}

$conn->close();
?>
