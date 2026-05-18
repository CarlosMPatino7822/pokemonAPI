<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

try {
    $pdo = db();
    $period = $_GET['period'] ?? 'all';

    $periodExpressions = [
        'week' => "CONCAT(YEAR(scores.created_at), '-W', LPAD(WEEK(scores.created_at, 1), 2, '0'))",
        'month' => "DATE_FORMAT(scores.created_at, '%Y-%m')",
        'all' => "'Todo el tiempo'",
    ];

    if (!array_key_exists($period, $periodExpressions)) {
        json_response(['ok' => false, 'error' => 'El periodo solicitado no es valido.'], 422);
    }

    $periodExpression = $periodExpressions[$period];

    $rows = $pdo->query("
        SELECT
            $periodExpression AS period,
            users.name AS user_name,
            COUNT(scores.id) AS games,
            SUM(scores.score) AS total_score,
            ROUND(AVG(scores.score), 2) AS average_score,
            MAX(scores.score) AS best_score
        FROM scores
        INNER JOIN users ON users.id = scores.user_id
        GROUP BY period, users.id, users.name
        ORDER BY period DESC, total_score DESC
    ")->fetchAll();

    log_event('grouped_report', ['period' => $period, 'count' => count($rows)]);
    json_response(['ok' => true, 'period' => $period, 'rows' => $rows]);
} catch (Throwable $error) {
    log_event('reports_error', ['message' => $error->getMessage()]);
    json_response(['ok' => false, 'error' => 'No se pudo generar el reporte.'], 500);
}
