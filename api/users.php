<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

try {
    $pdo = db();
    $users = $pdo
        ->query('SELECT id, name FROM users ORDER BY name ASC')
        ->fetchAll();

    log_event('list_users', ['count' => count($users)]);
    json_response(['ok' => true, 'users' => $users]);
} catch (Throwable $error) {
    log_event('list_users_error', ['message' => $error->getMessage()]);
    json_response(['ok' => false, 'error' => 'No se pudieron cargar los usuarios.'], 500);
}
