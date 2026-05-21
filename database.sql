-- ============================================
-- GYM MANAGER - Script SQL
-- Compatible MySQL / MariaDB (Fedora)
-- ============================================

CREATE DATABASE IF NOT EXISTS gym_manager
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE gym_manager;

-- ============================================
-- TABLE : coachs
-- ============================================
CREATE TABLE IF NOT EXISTS coachs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    specialite VARCHAR(100),
    telephone VARCHAR(20),
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- TABLE : clients
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    telephone VARCHAR(20),
    date_naissance DATE,
    adresse TEXT,
    photo VARCHAR(255) DEFAULT NULL,
    date_inscription DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- TABLE : abonnements
-- ============================================
CREATE TABLE IF NOT EXISTS abonnements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    type_abonnement ENUM('mensuel','trimestriel','annuel') DEFAULT 'mensuel',
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    statut ENUM('actif','expiré','suspendu') DEFAULT 'actif',
    montant DECIMAL(10,2) NOT NULL,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- TABLE : seances
-- ============================================
CREATE TABLE IF NOT EXISTS seances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titre VARCHAR(150) NOT NULL,
    description TEXT,
    coach_id INT NOT NULL,
    date_seance DATE NOT NULL,
    heure_debut TIME NOT NULL,
    heure_fin TIME NOT NULL,
    capacite_max INT DEFAULT 20,
    salle VARCHAR(50),
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coach_id) REFERENCES coachs(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- TABLE : inscriptions
-- ============================================
CREATE TABLE IF NOT EXISTS inscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    seance_id INT NOT NULL,
    date_inscription DATETIME DEFAULT CURRENT_TIMESTAMP,
    statut ENUM('confirmé','annulé') DEFAULT 'confirmé',
    UNIQUE KEY unique_inscription (client_id, seance_id),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (seance_id) REFERENCES seances(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- TABLE : paiements
-- ============================================
CREATE TABLE IF NOT EXISTS paiements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    abonnement_id INT,
    montant DECIMAL(10,2) NOT NULL,
    mode_paiement ENUM('espèces','carte','virement','chèque') DEFAULT 'espèces',
    statut ENUM('payé','en attente','remboursé') DEFAULT 'payé',
    note TEXT,
    date_paiement DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (abonnement_id) REFERENCES abonnements(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- DONNÉES DE TEST
-- ============================================

-- Admin (mot de passe : admin123)
INSERT INTO coachs (nom, prenom, email, mot_de_passe, specialite, telephone) VALUES
('Admin', 'Système', 'admin@gym.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administration', '0600000000'),
('Benali', 'Karim', 'karim@gym.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Musculation', '0611111111'),
('Alaoui', 'Sara', 'sara@gym.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Yoga / Cardio', '0622222222');

-- Clients
INSERT INTO clients (nom, prenom, email, telephone, date_naissance) VALUES
('El Fassi', 'Mohammed', 'mohammed@email.com', '0633333333', '1990-05-15'),
('Tazi', 'Fatima', 'fatima@email.com', '0644444444', '1995-08-22'),
('Brahim', 'Youssef', 'youssef@email.com', '0655555555', '1988-03-10'),
('Chraibi', 'Nadia', 'nadia@email.com', '0666666666', '1992-11-30'),
('Hamidi', 'Omar', 'omar@email.com', '0677777777', '1985-07-18');

-- Abonnements
INSERT INTO abonnements (client_id, type_abonnement, date_debut, date_fin, statut, montant) VALUES
(1, 'mensuel', '2026-03-01', '2026-04-30', 'actif', 250.00),
(2, 'trimestriel', '2026-01-01', '2026-03-31', 'expiré', 600.00),
(3, 'annuel', '2026-01-01', '2026-12-31', 'actif', 2000.00),
(4, 'mensuel', '2026-03-15', '2026-04-15', 'actif', 250.00),
(5, 'mensuel', '2026-01-01', '2026-01-31', 'expiré', 250.00);

-- Séances
INSERT INTO seances (titre, description, coach_id, date_seance, heure_debut, heure_fin, capacite_max, salle) VALUES
('Musculation Débutant', 'Initiation aux bases de la musculation', 2, '2026-04-06', '08:00:00', '09:30:00', 15, 'Salle A'),
('Yoga Matin', 'Séance de yoga relaxant', 3, '2026-04-06', '10:00:00', '11:00:00', 12, 'Salle B'),
('Cardio HIIT', 'Entraînement cardio intensif', 3, '2026-04-07', '07:00:00', '08:00:00', 20, 'Salle A'),
('Musculation Avancé', 'Programme avancé pour confirmés', 2, '2026-04-07', '18:00:00', '19:30:00', 10, 'Salle A'),
('Stretching', 'Assouplissement et récupération', 3, '2026-04-08', '12:00:00', '13:00:00', 15, 'Salle B');

-- Inscriptions
INSERT INTO inscriptions (client_id, seance_id, statut) VALUES
(1, 1, 'confirmé'),
(3, 1, 'confirmé'),
(4, 1, 'confirmé'),
(1, 3, 'confirmé'),
(3, 4, 'confirmé');

-- Paiements
INSERT INTO paiements (client_id, abonnement_id, montant, mode_paiement, statut) VALUES
(1, 1, 250.00, 'carte', 'payé'),
(2, 2, 600.00, 'espèces', 'payé'),
(3, 3, 2000.00, 'virement', 'payé'),
(4, 4, 250.00, 'carte', 'payé'),
(5, 5, 250.00, 'espèces', 'payé');

-- ============================================
-- VUE : statut abonnements auto-mis à jour
-- ============================================
CREATE OR REPLACE VIEW v_abonnements_statut AS
SELECT
    a.*,
    c.nom, c.prenom, c.email,
    CASE
        WHEN a.date_fin < CURDATE() THEN 'expiré'
        WHEN a.statut = 'suspendu' THEN 'suspendu'
        ELSE 'actif'
    END AS statut_reel
FROM abonnements a
JOIN clients c ON a.client_id = c.id;
