<?php
declare(strict_types=1);

const LOG_DIR = __DIR__ . '/../logs';
const LOG_PATH = LOG_DIR . '/app.log';

const DB_HOST = '127.0.0.1';
const DB_NAME = 'pokemon_api';
const DB_USER = 'root';
const DB_PASS = '';

function json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function log_event(string $event, array $context = []): void
{
    if (!is_dir(LOG_DIR)) {
        mkdir(LOG_DIR, 0777, true);
    }

    $line = json_encode([
        'date' => date('c'),
        'route' => $_SERVER['REQUEST_URI'] ?? 'cli',
        'method' => $_SERVER['REQUEST_METHOD'] ?? 'CLI',
        'event' => $event,
        'context' => $context,
    ], JSON_UNESCAPED_UNICODE);

    file_put_contents(LOG_PATH, $line . PHP_EOL, FILE_APPEND | LOCK_EX);
}

function db(): PDO
{
    $pdo = new PDO('mysql:host=' . DB_HOST . ';charset=utf8mb4', DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    $pdo->exec('CREATE DATABASE IF NOT EXISTS `' . DB_NAME . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    $pdo->exec('USE `' . DB_NAME . '`');
    initialize_database($pdo);

    return $pdo;
}

function initialize_database(PDO $pdo): void
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS scores (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            score INT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_scores_user_created (user_id, created_at),
            CONSTRAINT fk_scores_users FOREIGN KEY (user_id) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $count = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    if ($count === 0) {
        $stmt = $pdo->prepare('INSERT INTO users (name) VALUES (?)');
        foreach (['Ash Ketchum', 'Misty', 'Brock', 'Red'] as $name) {
            $stmt->execute([$name]);
        }
        log_event('seed_users');
    }
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '{}', true);

    if (!is_array($data)) {
        json_response(['ok' => false, 'error' => 'El cuerpo JSON no es valido.'], 400);
    }

    return $data;
}
