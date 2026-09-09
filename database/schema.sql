-- ============================================================
-- Blood Donor Management System — Database Schema
-- MySQL 8.0+
-- ============================================================

-- Create database
CREATE DATABASE IF NOT EXISTS blood_donor_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE blood_donor_db;

-- ============================================================
-- Table: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id              INT             AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    full_name       VARCHAR(150)    NOT NULL,
    phone           VARCHAR(20)     DEFAULT NULL,
    role            ENUM('donor', 'requester', 'admin') NOT NULL DEFAULT 'donor',
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    is_verified     BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX ix_users_email (email),
    INDEX ix_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: donor_profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS donor_profiles (
    id                  INT             AUTO_INCREMENT PRIMARY KEY,
    user_id             INT             NOT NULL UNIQUE,
    blood_group         ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
    date_of_birth       DATE            NOT NULL,
    gender              ENUM('male', 'female', 'other') NOT NULL,
    weight_kg           DECIMAL(5,2)    DEFAULT NULL CHECK (weight_kg >= 45),
    address             VARCHAR(500)    DEFAULT NULL,
    city                VARCHAR(100)    NOT NULL,
    state               VARCHAR(100)    DEFAULT NULL,
    is_available        BOOLEAN         NOT NULL DEFAULT TRUE,
    last_donation_date  DATE            DEFAULT NULL,
    medical_conditions  TEXT            DEFAULT NULL,
    created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX ix_donor_profiles_blood_group (blood_group),
    INDEX ix_donor_profiles_city (city),
    INDEX ix_donor_profiles_is_available (is_available),

    CONSTRAINT fk_donor_profiles_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: blood_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS blood_requests (
    id                  INT             AUTO_INCREMENT PRIMARY KEY,
    requester_id        INT             NOT NULL,
    patient_name        VARCHAR(150)    NOT NULL,
    blood_group         ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
    units_needed        INT             NOT NULL DEFAULT 1 CHECK (units_needed >= 1),
    urgency             ENUM('normal', 'urgent', 'critical') NOT NULL DEFAULT 'normal',
    hospital_name       VARCHAR(255)    NOT NULL,
    hospital_address    VARCHAR(500)    DEFAULT NULL,
    city                VARCHAR(100)    NOT NULL,
    contact_phone       VARCHAR(20)     NOT NULL,
    required_date       DATE            NOT NULL,
    description         TEXT            DEFAULT NULL,
    status              ENUM('open', 'in_progress', 'fulfilled', 'cancelled', 'expired') NOT NULL DEFAULT 'open',
    created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX ix_blood_requests_blood_group (blood_group),
    INDEX ix_blood_requests_city (city),
    INDEX ix_blood_requests_status (status),
    INDEX ix_blood_requests_urgency (urgency),

    CONSTRAINT fk_blood_requests_requester
        FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: donor_responses
-- ============================================================
CREATE TABLE IF NOT EXISTS donor_responses (
    id              INT             AUTO_INCREMENT PRIMARY KEY,
    request_id      INT             NOT NULL,
    donor_id        INT             NOT NULL,
    status          ENUM('pending', 'accepted', 'rejected', 'withdrawn') NOT NULL DEFAULT 'pending',
    message         TEXT            DEFAULT NULL,
    responded_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_donor_request (request_id, donor_id),
    INDEX ix_donor_responses_status (status),

    CONSTRAINT fk_donor_responses_request
        FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_donor_responses_donor
        FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: donation_records
-- ============================================================
CREATE TABLE IF NOT EXISTS donation_records (
    id              INT             AUTO_INCREMENT PRIMARY KEY,
    donor_id        INT             NOT NULL,
    request_id      INT             DEFAULT NULL,
    blood_group     ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
    units_donated   INT             NOT NULL DEFAULT 1 CHECK (units_donated >= 1),
    donation_date   DATE            NOT NULL,
    hospital_name   VARCHAR(255)    DEFAULT NULL,
    notes           TEXT            DEFAULT NULL,
    verified_by     INT             DEFAULT NULL,
    status          ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX ix_donation_records_donor_id (donor_id),
    INDEX ix_donation_records_donation_date (donation_date),

    CONSTRAINT fk_donation_records_donor
        FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_donation_records_request
        FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE SET NULL,
    CONSTRAINT fk_donation_records_verifier
        FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Seed: Default Admin User
-- Password: [REDACTED] (bcrypt hash)
-- ============================================================
INSERT INTO users (email, password_hash, full_name, phone, role, is_active, is_verified)
VALUES (
    'admin@bloodconnect.com',
    '$2b$12$LJ3m4ys3Lz0QFOFJnKzOOeYP5s.QM3DPkVfMV0CRV.h4EqFrk9yK2',
    'System Admin',
    '+92 300 0000000',
    'admin',
    TRUE,
    TRUE
)
ON DUPLICATE KEY UPDATE full_name = full_name;
