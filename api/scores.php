<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

try {
    $pdo = db();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'POST') {
        $body = read_json_body();
        $userId = (int) ($body['user_id'] ?? 0);
        $score = (int) ($body['score'] ?? -1);

        if ($userId <= 0 || $score < 0) {
            json_response(['ok' => false, 'error' => 'Usuario y puntaje son obligatorios.'], 422);
        }

        $user = $pdo->prepare('SELECT id FROM users WHERE id = ?');
        $user->execute([$userId]);

        if (!$user->fetch()) {
            json_response(['ok' => false, 'error' => 'El usuario seleccionado no existe.'], 404);
        }

        $stmt = $pdo->prepare('INSERT INTO scores (user_id, score) VALUES (?, ?)');
        $stmt->execute([$userId, $score]);

        log_event('insert_score', ['user_id' => $userId, 'score' => $score]);
        json_response(['ok' => true, 'message' => 'Puntaje guardado correctamente.']);
    }

    if ($method === 'GET') {
        $userId = (int) ($_GET['user_id'] ?? 0);
        if ($userId <= 0) {
            json_response(['ok' => false, 'error' => 'Debe seleccionar un usuario.'], 422);
        }

        $stmt = $pdo->prepare("
            SELECT scores.id, users.name AS user_name, scores.score, scores.created_at
            FROM scores
            INNER JOIN users ON users.id = scores.user_id
            WHERE scores.user_id = ?
            ORDER BY scores.created_at DESC
            LIMIT 25
        ");
        $stmt->execute([$userId]);
        $scores = $stmt->fetchAll();

        log_event('user_scores_report', ['user_id' => $userId, 'count' => count($scores)]);
        json_response(['ok' => true, 'scores' => $scores]);
    }

    json_response(['ok' => false, 'error' => 'Método no permitido.'], 405);
} catch (Throwable $error) {
    log_event('scores_error', ['message' => $error->getMessage()]);
    json_response(['ok' => false, 'error' => 'No se pudo procesar la solicitud de puntajes.'], 500);
}
