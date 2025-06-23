-- Script de criação do banco de dados para Sistema de Atividades Pendentes

-- Criar banco de dados
CREATE DATABASE IF NOT EXISTS atividades_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Usar o banco de dados
USE atividades_db;

-- Criar tabela users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    pass VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Criar tabela activities
CREATE TABLE IF NOT EXISTS activities (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    description TEXT NOT NULL,
    resolution_date DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    users_id INT NOT NULL,
    FOREIGN KEY (users_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Criar índices para melhor performance
CREATE INDEX idx_activities_users_id ON activities(users_id);
CREATE INDEX idx_activities_resolution_date ON activities(resolution_date);
CREATE INDEX idx_users_email ON users(email);

-- Inserir usuário de teste (senha: 123456)
INSERT INTO users (full_name, email, pass) VALUES 
('Usuário Teste', 'teste@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.Gm.F5e');

-- Inserir algumas atividades de teste
INSERT INTO activities (description, users_id) VALUES 
('Estudar Flask para desenvolvimento web', 1),
('Implementar sistema de autenticação', 1),
('Criar interface responsiva', 1),
('Testar funcionalidades do sistema', 1);

