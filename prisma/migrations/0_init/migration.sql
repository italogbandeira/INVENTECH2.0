-- Migration inicial do banco de dados.
-- Cria as tabelas principais do sistema de inventário.

-- Tabela de staging/importação bruta de máquinas.
CREATE TABLE `base_maquinas_import` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero_serie` VARCHAR(255) NULL,
    `setor` VARCHAR(255) NULL,
    `usuario` VARCHAR(255) NULL,
    `tipo_equipamento` VARCHAR(255) NULL,
    `modelo` VARCHAR(255) NULL,
    `contrato` VARCHAR(255) NULL,
    `origem` VARCHAR(255) NULL,
    `observacoes` TEXT NULL,
    `login_email` VARCHAR(255) NULL,
    `login_maquina` VARCHAR(255) NULL,
    `esset` VARCHAR(50) NULL,
    `termo_responsabilidade` VARCHAR(50) NULL,
    `numero_termo_responsabilidade` VARCHAR(255) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Catálogo de contratos.
CREATE TABLE `contratos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(150) NOT NULL,

    UNIQUE INDEX `nome`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Tabela principal de máquinas.
CREATE TABLE `maquinas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero_serie` VARCHAR(255) NOT NULL,
    `setor_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NULL,
    `tipo_equipamento_id` INTEGER NULL,
    `modelo_id` INTEGER NULL,
    `contrato_id` INTEGER NULL,
    `origem_id` INTEGER NULL,
    `observacoes` TEXT NULL,
    `esset` VARCHAR(50) NULL,
    `termo_responsabilidade` VARCHAR(50) NULL,
    `numero_termo_responsabilidade` VARCHAR(255) NULL,

    UNIQUE INDEX `uq_maquinas_numero_serie`(`numero_serie`),
    INDEX `fk_maquinas_contrato`(`contrato_id`),
    INDEX `fk_maquinas_modelo`(`modelo_id`),
    INDEX `fk_maquinas_origem`(`origem_id`),
    INDEX `fk_maquinas_setor`(`setor_id`),
    INDEX `fk_maquinas_tipo`(`tipo_equipamento_id`),
    INDEX `fk_maquinas_usuario`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Catálogo de modelos.
CREATE TABLE `modelos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(150) NOT NULL,

    UNIQUE INDEX `nome`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Catálogo de origens.
CREATE TABLE `origens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `nome`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Catálogo de setores.
CREATE TABLE `setores` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `nome`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Catálogo de tipos de equipamento.
CREATE TABLE `tipos_equipamento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `nome`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Tabela de usuários finais vinculados às máquinas.
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(150) NOT NULL,
    `login_email` VARCHAR(150) NULL,
    `login_maquina` VARCHAR(150) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;