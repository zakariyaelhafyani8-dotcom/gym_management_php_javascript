<?php
// ============================================
// api.php - API centrale (toutes les requêtes AJAX)
// ============================================
require_once 'includes/config.php';

$action = $_REQUEST['action'] ?? '';
$db = getDB();

switch ($action) {

    // ==================== AUTH ====================
    case 'login':
        $email = clean($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';
        $stmt = $db->prepare("SELECT * FROM coachs WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        if ($user && password_verify($password, $user['mot_de_passe'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_name'] = $user['prenom'] . ' ' . $user['nom'];
            $_SESSION['role'] = ($user['id'] == 1) ? 'admin' : 'coach';
            $_SESSION['coach_id'] = $user['id'];
            jsonResponse(['success' => true, 'role' => $_SESSION['role'], 'name' => $_SESSION['user_name']]);
        }
        jsonResponse(['success' => false, 'message' => 'Email ou mot de passe incorrect'], 401);
        break;

    case 'logout':
        session_destroy();
        jsonResponse(['success' => true]);
        break;

    case 'check_session':
        if (isCoach()) {
            jsonResponse([
                'logged' => true,
                'role' => $_SESSION['role'],
                'name' => $_SESSION['user_name'],
                'id' => $_SESSION['user_id']
            ]);
        }
        jsonResponse(['logged' => false]);
        break;

    // ==================== STATS ====================
    case 'get_stats':
        requireAuth();
        $stats = [];
        // Clients actifs (avec abonnement valide)
        $stats['clients_actifs'] = $db->query("
            SELECT COUNT(DISTINCT client_id) FROM abonnements
            WHERE statut='actif' AND date_fin >= CURDATE()
        ")->fetchColumn();
        // Total clients
        $stats['total_clients'] = $db->query("SELECT COUNT(*) FROM clients")->fetchColumn();
        // Abonnements expirés
        $stats['abonnements_expires'] = $db->query("
            SELECT COUNT(*) FROM abonnements WHERE statut='expiré' OR date_fin < CURDATE()
        ")->fetchColumn();
        // Séances aujourd'hui
        $stats['seances_today'] = $db->query("
            SELECT COUNT(*) FROM seances WHERE date_seance = CURDATE()
        ")->fetchColumn();
        // Revenus du mois
        $stats['revenus_mois'] = $db->query("
            SELECT COALESCE(SUM(montant),0) FROM paiements
            WHERE MONTH(date_paiement)=MONTH(CURDATE()) AND YEAR(date_paiement)=YEAR(CURDATE())
            AND statut='payé'
        ")->fetchColumn();
        // Stats par mois (6 derniers mois)
        $stats['revenus_chart'] = $db->query("
            SELECT DATE_FORMAT(date_paiement,'%b %Y') as mois,
                   SUM(montant) as total
            FROM paiements
            WHERE date_paiement >= DATE_SUB(NOW(), INTERVAL 6 MONTH) AND statut='payé'
            GROUP BY YEAR(date_paiement), MONTH(date_paiement)
            ORDER BY date_paiement ASC
        ")->fetchAll();
        jsonResponse($stats);
        break;

    // ==================== CLIENTS ====================
    case 'get_clients':
        requireAuth();
        $clients = $db->query("
            SELECT c.*,
                   a.statut as abo_statut, a.date_fin,
                   CASE WHEN a.date_fin >= CURDATE() AND a.statut='actif' THEN 'actif' ELSE 'expiré' END as statut_reel
            FROM clients c
            LEFT JOIN abonnements a ON a.client_id = c.id
                AND a.id = (SELECT id FROM abonnements WHERE client_id=c.id ORDER BY date_fin DESC LIMIT 1)
            ORDER BY c.nom ASC
        ")->fetchAll();
        jsonResponse($clients);
        break;

    case 'get_client':
        requireAuth();
        $id = intval($_GET['id']);
        $stmt = $db->prepare("SELECT * FROM clients WHERE id=?");
        $stmt->execute([$id]);
        jsonResponse($stmt->fetch());
        break;

    case 'add_client':
        requireAuth();
        $nom    = clean($_POST['nom'] ?? '');
        $prenom = clean($_POST['prenom'] ?? '');
        $email  = clean($_POST['email'] ?? '');
        $tel    = clean($_POST['telephone'] ?? '');
        $dob    = clean($_POST['date_naissance'] ?? '');
        $adresse= clean($_POST['adresse'] ?? '');
        if (!$nom || !$prenom || !$email) jsonResponse(['success'=>false,'message'=>'Champs requis manquants'],400);
        $stmt = $db->prepare("INSERT INTO clients (nom,prenom,email,telephone,date_naissance,adresse) VALUES (?,?,?,?,?,?)");
        $stmt->execute([$nom,$prenom,$email,$tel,$dob?:null,$adresse]);
        jsonResponse(['success'=>true,'id'=>$db->lastInsertId(),'message'=>'Client ajouté avec succès']);
        break;

    case 'update_client':
        requireAuth();
        $id     = intval($_POST['id']);
        $nom    = clean($_POST['nom'] ?? '');
        $prenom = clean($_POST['prenom'] ?? '');
        $email  = clean($_POST['email'] ?? '');
        $tel    = clean($_POST['telephone'] ?? '');
        $dob    = clean($_POST['date_naissance'] ?? '');
        $adresse= clean($_POST['adresse'] ?? '');
        $stmt = $db->prepare("UPDATE clients SET nom=?,prenom=?,email=?,telephone=?,date_naissance=?,adresse=? WHERE id=?");
        $stmt->execute([$nom,$prenom,$email,$tel,$dob?:null,$adresse,$id]);
        jsonResponse(['success'=>true,'message'=>'Client modifié avec succès']);
        break;

    case 'delete_client':
        requireAuth();
        $id = intval($_POST['id']);
        $stmt = $db->prepare("DELETE FROM clients WHERE id=?");
        $stmt->execute([$id]);
        jsonResponse(['success'=>true,'message'=>'Client supprimé']);
        break;

    // ==================== ABONNEMENTS ====================
    case 'get_abonnements':
        requireAuth();
        $abonnements = $db->query("
            SELECT a.*, c.nom, c.prenom, c.email,
                   CASE WHEN a.date_fin < CURDATE() THEN 'expiré' ELSE a.statut END as statut_reel
            FROM abonnements a
            JOIN clients c ON a.client_id = c.id
            ORDER BY a.date_creation DESC
        ")->fetchAll();
        jsonResponse($abonnements);
        break;

    case 'get_abonnements_client':
        requireAuth();
        $client_id = intval($_GET['client_id']);
        $stmt = $db->prepare("
            SELECT a.*, CASE WHEN a.date_fin < CURDATE() THEN 'expiré' ELSE a.statut END as statut_reel
            FROM abonnements a WHERE a.client_id=? ORDER BY a.date_creation DESC
        ");
        $stmt->execute([$client_id]);
        jsonResponse($stmt->fetchAll());
        break;

    case 'add_abonnement':
        requireAuth();
        $client_id  = intval($_POST['client_id']);
        $type       = clean($_POST['type_abonnement'] ?? 'mensuel');
        $date_debut = clean($_POST['date_debut'] ?? '');
        $date_fin   = clean($_POST['date_fin'] ?? '');
        $montant    = floatval($_POST['montant'] ?? 0);
        if (!$client_id || !$date_debut || !$date_fin) jsonResponse(['success'=>false,'message'=>'Données manquantes'],400);
        $statut = ($date_fin >= date('Y-m-d')) ? 'actif' : 'expiré';
        $stmt = $db->prepare("INSERT INTO abonnements (client_id,type_abonnement,date_debut,date_fin,statut,montant) VALUES (?,?,?,?,?,?)");
        $stmt->execute([$client_id,$type,$date_debut,$date_fin,$statut,$montant]);
        $abo_id = $db->lastInsertId();
        // Créer paiement automatiquement
        if ($montant > 0) {
            $mode = clean($_POST['mode_paiement'] ?? 'espèces');
            $stmt2 = $db->prepare("INSERT INTO paiements (client_id,abonnement_id,montant,mode_paiement,statut) VALUES (?,?,?,?,'payé')");
            $stmt2->execute([$client_id,$abo_id,$montant,$mode]);
        }
        jsonResponse(['success'=>true,'message'=>'Abonnement créé avec succès']);
        break;

    case 'delete_abonnement':
        requireAuth();
        $id = intval($_POST['id']);
        $stmt = $db->prepare("DELETE FROM abonnements WHERE id=?");
        $stmt->execute([$id]);
        jsonResponse(['success'=>true,'message'=>'Abonnement supprimé']);
        break;

    // ==================== SÉANCES ====================
    case 'get_seances':
        requireAuth();
        $coach_id = isset($_GET['coach_id']) ? intval($_GET['coach_id']) : null;
        if ($coach_id && !isAdmin()) {
            $stmt = $db->prepare("
                SELECT s.*, c.nom as coach_nom, c.prenom as coach_prenom,
                       COUNT(i.id) as nb_inscrits
                FROM seances s
                JOIN coachs c ON s.coach_id = c.id
                LEFT JOIN inscriptions i ON s.id = i.seance_id AND i.statut='confirmé'
                WHERE s.coach_id = ?
                GROUP BY s.id ORDER BY s.date_seance ASC, s.heure_debut ASC
            ");
            $stmt->execute([$coach_id]);
        } else {
            $stmt = $db->query("
                SELECT s.*, c.nom as coach_nom, c.prenom as coach_prenom,
                       COUNT(i.id) as nb_inscrits
                FROM seances s
                JOIN coachs c ON s.coach_id = c.id
                LEFT JOIN inscriptions i ON s.id = i.seance_id AND i.statut='confirmé'
                GROUP BY s.id ORDER BY s.date_seance ASC, s.heure_debut ASC
            ");
        }
        jsonResponse($stmt->fetchAll());
        break;

    case 'add_seance':
        requireAuth();
        $titre       = clean($_POST['titre'] ?? '');
        $description = clean($_POST['description'] ?? '');
        $coach_id    = intval($_POST['coach_id']);
        $date_seance = clean($_POST['date_seance'] ?? '');
        $heure_debut = clean($_POST['heure_debut'] ?? '');
        $heure_fin   = clean($_POST['heure_fin'] ?? '');
        $capacite    = intval($_POST['capacite_max'] ?? 20);
        $salle       = clean($_POST['salle'] ?? '');
        $stmt = $db->prepare("INSERT INTO seances (titre,description,coach_id,date_seance,heure_debut,heure_fin,capacite_max,salle) VALUES (?,?,?,?,?,?,?,?)");
        $stmt->execute([$titre,$description,$coach_id,$date_seance,$heure_debut,$heure_fin,$capacite,$salle]);
        jsonResponse(['success'=>true,'message'=>'Séance créée']);
        break;

    case 'delete_seance':
        requireAuth();
        $id = intval($_POST['id']);
        $stmt = $db->prepare("DELETE FROM seances WHERE id=?");
        $stmt->execute([$id]);
        jsonResponse(['success'=>true,'message'=>'Séance supprimée']);
        break;

    // ==================== INSCRIPTIONS ====================
    case 'inscrire_client':
        requireAuth();
        $client_id = intval($_POST['client_id']);
        $seance_id = intval($_POST['seance_id']);
        // Vérifier abonnement valide
        if (!hasValidSubscription($client_id)) {
            jsonResponse(['success'=>false,'message'=>'❌ Abonnement expiré ou inexistant. Impossible d\'inscrire ce client.'],403);
        }
        // Vérifier capacité
        $stmt = $db->prepare("SELECT s.capacite_max, COUNT(i.id) as nb FROM seances s LEFT JOIN inscriptions i ON s.id=i.seance_id AND i.statut='confirmé' WHERE s.id=?");
        $stmt->execute([$seance_id]);
        $info = $stmt->fetch();
        if ($info['nb'] >= $info['capacite_max']) {
            jsonResponse(['success'=>false,'message'=>'Séance complète'],403);
        }
        try {
            $stmt = $db->prepare("INSERT INTO inscriptions (client_id,seance_id,statut) VALUES (?,?,'confirmé')");
            $stmt->execute([$client_id,$seance_id]);
            jsonResponse(['success'=>true,'message'=>'Client inscrit avec succès ✓']);
        } catch (PDOException $e) {
            jsonResponse(['success'=>false,'message'=>'Client déjà inscrit à cette séance'],409);
        }
        break;

    case 'desinscrire_client':
        requireAuth();
        $client_id = intval($_POST['client_id']);
        $seance_id = intval($_POST['seance_id']);
        $stmt = $db->prepare("DELETE FROM inscriptions WHERE client_id=? AND seance_id=?");
        $stmt->execute([$client_id,$seance_id]);
        jsonResponse(['success'=>true,'message'=>'Client désinscrit']);
        break;

    case 'get_inscrits_seance':
        requireAuth();
        $seance_id = intval($_GET['seance_id']);
        $stmt = $db->prepare("
            SELECT c.id, c.nom, c.prenom, c.email, i.date_inscription, i.statut,
                   CASE WHEN (SELECT COUNT(*) FROM abonnements WHERE client_id=c.id AND statut='actif' AND date_fin>=CURDATE())>0 THEN 'actif' ELSE 'expiré' END as abo_statut
            FROM inscriptions i JOIN clients c ON i.client_id=c.id
            WHERE i.seance_id=? AND i.statut='confirmé'
        ");
        $stmt->execute([$seance_id]);
        jsonResponse($stmt->fetchAll());
        break;

    // ==================== PAIEMENTS ====================
    case 'get_paiements':
        requireAuth();
        $client_id = isset($_GET['client_id']) ? intval($_GET['client_id']) : null;
        if ($client_id) {
            $stmt = $db->prepare("
                SELECT p.*, c.nom, c.prenom, a.type_abonnement
                FROM paiements p JOIN clients c ON p.client_id=c.id
                LEFT JOIN abonnements a ON p.abonnement_id=a.id
                WHERE p.client_id=? ORDER BY p.date_paiement DESC
            ");
            $stmt->execute([$client_id]);
        } else {
            $stmt = $db->query("
                SELECT p.*, c.nom, c.prenom, a.type_abonnement
                FROM paiements p JOIN clients c ON p.client_id=c.id
                LEFT JOIN abonnements a ON p.abonnement_id=a.id
                ORDER BY p.date_paiement DESC
            ");
        }
        jsonResponse($stmt->fetchAll());
        break;

    case 'add_paiement':
        requireAuth();
        $client_id    = intval($_POST['client_id']);
        $abo_id       = intval($_POST['abonnement_id'] ?? 0);
        $montant      = floatval($_POST['montant']);
        $mode         = clean($_POST['mode_paiement'] ?? 'espèces');
        $note         = clean($_POST['note'] ?? '');
        $stmt = $db->prepare("INSERT INTO paiements (client_id,abonnement_id,montant,mode_paiement,note,statut) VALUES (?,?,?,?,?,'payé')");
        $stmt->execute([$client_id,$abo_id?:null,$montant,$mode,$note]);
        jsonResponse(['success'=>true,'message'=>'Paiement enregistré']);
        break;

    // ==================== COACHS ====================
    case 'get_coachs':
        requireAuth();
        $coachs = $db->query("SELECT id, nom, prenom, email, specialite, telephone FROM coachs ORDER BY nom")->fetchAll();
        jsonResponse($coachs);
        break;

    default:
        jsonResponse(['error' => 'Action inconnue: ' . $action], 404);
}
?>
