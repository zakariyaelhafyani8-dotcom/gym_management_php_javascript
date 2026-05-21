# 🏋️ GymPro Manager — Guide d'installation complet

## 📁 Structure du projet

```
gym_manager/
├── index.html              # Page principale (SPA)
├── css/
│   └── style.css           # Styles complets (thème dark red)
├── js/
│   └── app.js              # Application JavaScript (SPA)
├── php/
│   ├── api.php             # API centrale (toutes les requêtes)
│   └── includes/
│       └── config.php      # Configuration + connexion PDO
├── xml/
│   └── planning.xml        # Configuration planning (XML)
├── images/                 # Dossier images
└── database.sql            # Script SQL complet
```

---

## 🚀 Installation sur Fedora (Apache + MariaDB)

### 1. Installer Apache, PHP et MariaDB

```bash
# Installer les paquets nécessaires
sudo dnf install httpd php php-mysqlnd php-pdo mariadb-server -y

# Démarrer et activer les services
sudo systemctl start httpd mariadb
sudo systemctl enable httpd mariadb
```

### 2. Configurer MariaDB

```bash
# Sécuriser MariaDB
sudo mysql_secure_installation

# Se connecter à MariaDB
sudo mysql -u root -p

# Créer l'utilisateur (dans MariaDB)
CREATE USER 'gym_user'@'localhost' IDENTIFIED BY '123';
GRANT ALL PRIVILEGES ON gym_manager.* TO 'gym_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Importer la base de données

```bash
# Méthode 1 : Via ligne de commande
sudo mysql -u root -p < /chemin/vers/database.sql

# Méthode 2 : Via phpMyAdmin (si installé)
# Aller sur http://localhost/phpmyadmin
# Importer database.sql
```

### 4. Copier le projet dans Apache

```bash
# Copier dans le dossier web Apache
sudo cp -r gym_manager/ /var/www/html/gym_manager

# Corriger les permissions
sudo chown -R apache:apache /var/www/html/gym_manager
sudo chmod -R 755 /var/www/html/gym_manager
```

### 5. Configurer la connexion DB dans PHP

Modifier `php/includes/config.php` :

```php
define('DB_HOST', 'localhost');
define('DB_USER', 'gym_user');       // ou 'root'
define('DB_PASS', 'votre_mot_de_passe');
define('DB_NAME', 'gym_manager');
define('APP_URL', 'http://localhost/gym_manager');
```

### 6. Configurer SELinux (Fedora)

```bash
# Permettre à Apache d'accéder aux fichiers
sudo setsebool -P httpd_can_network_connect_db 1
sudo chcon -R -t httpd_sys_content_t /var/www/html/gym_manager
```

### 7. Ouvrir le pare-feu (si nécessaire)

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

### 8. Accéder à l'application

Ouvrir le navigateur : **http://localhost/gym_manager**

---

## 🔐 Comptes de connexion (données de test)

| Rôle          | Email             | Mot de passe |
|---------------|-------------------|--------------|
| Admin         | admin@gym.com     | password     |
| Coach Karim   | karim@gym.com     | password     |
| Coach Sara    | sara@gym.com      | password     |

> ⚠️ **Note** : Les mots de passe dans `database.sql` utilisent le hash bcrypt de "password" (`$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi`).
> Pour le production, changez tous les mots de passe !

---

## 📌 Fonctionnalités par rôle

### Admin (admin@gym.com)
- ✅ Tableau de bord avec statistiques
- ✅ Gestion complète des clients (CRUD)
- ✅ Gestion des abonnements
- ✅ Gestion des paiements
- ✅ Planning des séances (créer/supprimer)
- ✅ Inscrire/désinscrire clients aux séances
- ✅ Statistiques et graphiques
- ✅ Voir les abonnements expirés

### Coach (karim@gym.com / sara@gym.com)
- ✅ Tableau de bord simplifié
- ✅ Voir leurs propres séances
- ✅ Voir les inscrits à leurs séances
- ✅ Gérer les inscriptions (dans les séances)
- ❌ Pas accès aux clients / abonnements / paiements

---

## 🗄️ Structure base de données

| Table         | Description                          |
|---------------|--------------------------------------|
| `coachs`      | Coaches et admin (auth incluse)      |
| `clients`     | Informations des membres             |
| `abonnements` | Abonnements (mensuel/trim/annuel)    |
| `seances`     | Planning des séances                 |
| `inscriptions`| Inscriptions clients aux séances     |
| `paiements`   | Historique des paiements             |

### Vue MySQL
- `v_abonnements_statut` : Calcule automatiquement le statut réel des abonnements

---

## 🔧 Logique métier principale

1. **Statut abonnement auto** : À chaque chargement, `config.php` lance :
   ```sql
   UPDATE abonnements SET statut='expiré' WHERE date_fin < CURDATE() AND statut='actif'
   ```

2. **Vérification avant inscription** : `api.php` vérifie qu'un client a un abonnement actif AVANT de l'inscrire à une séance. Sinon : erreur 403.

3. **Paiement auto** : Quand un abonnement est créé, un paiement est automatiquement enregistré.

4. **Sécurité basique** : `requireAuth()` vérifie la session PHP avant chaque appel API.

---

## 📦 Technologies utilisées

| Couche      | Techno                          |
|-------------|--------------------------------|
| Frontend    | HTML5, CSS3, JavaScript (Vanilla) |
| Backend     | PHP 8+ (PDO, procédural)       |
| Base de données | MySQL / MariaDB            |
| XML         | planning.xml (config/tarifs)   |
| Graphiques  | Chart.js 4.4                   |
| Icônes      | Font Awesome 6.5               |
| Fonts       | Google Fonts (Bebas Neue + Outfit) |

---

## 🐛 Dépannage courant

**Erreur "Connexion DB échouée"**
```bash
# Vérifier que MariaDB tourne
sudo systemctl status mariadb
# Vérifier les credentials dans config.php
```

**Page blanche / 403 Forbidden**
```bash
# Corriger SELinux
sudo chcon -R -t httpd_sys_rw_content_t /var/www/html/gym_manager
```

**Les appels API échouent**
- Vérifier que `APP_URL` dans `config.php` correspond à votre URL
- Vérifier que PHP a l'extension `pdo_mysql` : `php -m | grep pdo`

**Installer phpMyAdmin (optionnel)**
```bash
sudo dnf install phpMyAdmin -y
# Accès : http://localhost/phpmyadmin
```
