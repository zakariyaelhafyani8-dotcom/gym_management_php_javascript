<?php
// ============================================
// config.php - Configuration générale
// ============================================

// Base de données
define('DB_HOST', 'localhost');
define('DB_USER', 'gymUser');       // Changer selon votre config
define('DB_PASS', '123456');           // Changer selon votre config
define('DB_NAME', 'gym_manager');

// Application
define('APP_NAME', 'GymPro Manager');
define('APP_VERSION', '1.0');
define('APP_URL', 'http://localhost/gym_manager');

// Sessions
session_start();

// Connexion PDO
function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            die(json_encode(['error' => 'Connexion DB échouée: ' . $e->getMessage()]));
        }
    }
    return $pdo;
}

// Mise à jour automatique des statuts expirés
function updateExpiredSubscriptions() {
    $db = getDB();
    $db->exec("UPDATE abonnements SET statut='expiré' WHERE date_fin < CURDATE() AND statut='actif'");
}

// Vérifier si admin connecté
function isAdmin() {
    return isset($_SESSION['user_id']) && isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
}

// Vérifier si coach connecté
function isCoach() {
    return isset($_SESSION['user_id']) && isset($_SESSION['role']);
}

// Rediriger si non connecté
function requireAuth() {
    if (!isCoach()) {
        header('Location: ' . APP_URL . '/login.php');
        exit;
    }
}

// Sécurisation des entrées
function clean($data) {
    return htmlspecialchars(strip_tags(trim($data)));
}

// Réponse JSON
function jsonResponse($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// Vérifier abonnement valide d'un client
function hasValidSubscription($client_id) {
    $db = getDB();
    $stmt = $db->prepare("
        SELECT COUNT(*) FROM abonnements
        WHERE client_id = ? AND statut = 'actif' AND date_fin >= CURDATE()
    ");
    $stmt->execute([$client_id]);
    return $stmt->fetchColumn() > 0;
}

// Appeler au démarrage
updateExpiredSubscriptions();
?>
