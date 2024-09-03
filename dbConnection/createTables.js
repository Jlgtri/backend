const con = require('./index');

const createChainsTableQuery = `
  CREATE TABLE IF NOT EXISTS chains (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(32) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
)
`;

const createTokensTableQuery = `
CREATE TABLE IF NOT EXISTS tokens (
    id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    chain_id INT NOT NULL,
    symbol VARCHAR(6) NOT NULL,
    name VARCHAR(32) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chain_id_fk FOREIGN KEY (chain_id)
        REFERENCES chains (id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

CREATE UNIQUE INDEX tokens_chain_id_symbol_ix ON tokens (chain_id, symbol);
`;

const createPresalesTableQuery = `
CREATE TABLE IF NOT EXISTS presales (
    id SMALLINT UNSIGNED NOT NULL,
    name VARCHAR(64) NOT NULL,
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP,
    price DECIMAL(18, 8) NOT NULL,
    minimum_buy BIGINT UNSIGNED,
    maximum_buy BIGINT UNSIGNED,
    total_supply BIGINT UNSIGNED NOT NULL,
    vesting_initial_unlock DECIMAL(5, 4) NOT NULL,
    vesting_starts_after INT NOT NULL, -- Use INT to store interval in seconds, minutes, or any other unit
    vesting_period INT NOT NULL,       -- Same as above for vesting period
    vesting_period_count SMALLINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- Triggers can be used to simulate CHECK constraints in MySQL 8.0+
DELIMITER //

CREATE TRIGGER presale_checks BEFORE INSERT ON presales
FOR EACH ROW 
BEGIN
    IF NEW.ends_at <= NEW.starts_at THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'End time must be after start time';
    END IF;
    
    IF NEW.price <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Price must be greater than 0';
    END IF;
    
    IF NEW.minimum_buy IS NOT NULL AND NEW.minimum_buy <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Minimum buy must be greater than 0';
    END IF;
    
    IF NEW.maximum_buy IS NOT NULL AND NEW.minimum_buy IS NOT NULL AND NEW.maximum_buy <= NEW.minimum_buy THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Maximum buy must be greater than minimum buy';
    END IF;
    
    IF NEW.total_supply <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Total supply must be greater than 0';
    END IF;
    
    IF NEW.vesting_initial_unlock < 0 OR NEW.vesting_initial_unlock > 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Vesting initial unlock must be between 0 and 1';
    END IF;
    
    IF NEW.vesting_starts_after < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Vesting starts after must be a positive interval';
    END IF;
    
    IF NEW.vesting_period < 86400 THEN -- Assuming vesting_period is stored in seconds and "1 day" = 86400 seconds
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Vesting period must be at least 1 day';
    END IF;
    
    IF NEW.vesting_period_count < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Vesting period count must be 0 or greater';
    END IF;
END//

DELIMITER ;

`;

const createParchasesTableQuery = `
CREATE TABLE IF NOT EXISTS purchases (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    hash VARCHAR(255) NOT NULL,
    chain_id INT NOT NULL,
    token_symbol VARCHAR(6) NOT NULL,
    presale_id SMALLINT UNSIGNED NOT NULL,  -- Match this data type with presales.id
    amount BIGINT UNSIGNED NOT NULL,
    purchased_amount BIGINT UNSIGNED NOT NULL,
    address VARCHAR(255) NOT NULL,
    purchased_at TIMESTAMP NOT NULL,
    CONSTRAINT purchases_presale_fk FOREIGN KEY (presale_id)
        REFERENCES presales (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT purchases_token_fk FOREIGN KEY (chain_id, token_symbol)
        REFERENCES tokens (chain_id, symbol)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE UNIQUE INDEX purchases_chain_id_hash_ix ON purchases (chain_id, hash);
`;

const createClaimsTableQuery = `
CREATE TABLE IF NOT EXISTS claims (
    id INT UNSIGNED NOT NULL,
    address VARCHAR(255) NOT NULL,
    unlocked_at TIMESTAMP NOT NULL,
    amount BIGINT UNSIGNED NOT NULL,
    hash VARCHAR(255),
    claimed_at TIMESTAMP,
    PRIMARY KEY (id)
);

-- Set custom delimiter to avoid issues with the semicolon inside the trigger
DELIMITER //

-- Trigger to enforce amount > 0
CREATE TRIGGER claims_amount_check
BEFORE INSERT ON claims
FOR EACH ROW 
BEGIN
    IF NEW.amount <= 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Amount must be greater than 0';
    END IF;
END;
//

-- Trigger to ensure claimed_at is greater than unlocked_at or is NULL
CREATE TRIGGER claims_claimed_at_check
BEFORE INSERT OR UPDATE ON claims
FOR EACH ROW 
BEGIN
    IF NEW.claimed_at IS NOT NULL AND NEW.claimed_at <= NEW.unlocked_at THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'claimed_at must be greater than unlocked_at';
    END IF;
END;
//

-- Reset delimiter back to semicolon
DELIMITER ;
`;


(async () => {
  try {
    await con.execute(createChainsTableQuery);
    console.log('Chains table created or already exists.');
  } catch (error) {
    console.error('Error creating chains table:', error);
  } finally {
    con.end();
  }
})();
