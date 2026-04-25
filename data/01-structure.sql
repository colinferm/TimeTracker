use timetracker;

DROP TABLE IF EXISTS tt_user;
CREATE TABLE tt_user (
	id INT NOT NULL AUTO_INCREMENT,
	username VARCHAR(100) NOT NULL,
	userpassword VARCHAR(255) NOT NULL,
	email_address VARCHAR(255) NOT NULL,
	first_name VARCHAR(255),
	last_name VARCHAR(255),
	country VARCHAR(100),
	confirmed TINYINT NOT NULL DEFAULT '0',
	registered DATETIME NOT NULL,
	last_login DATETIME NOT NULL,
	is_admin TINYINT NOT NULL DEFAULT '0',
	is_superuser TINYINT NOT NULL DEFAULT '0',
	oauth_key VARCHAR(255),
	nonce_key VARCHAR(255),
	PRIMARY KEY (id),
	INDEX idx_user_username (username)
);

INSERT INTO tt_user (username, userpassword, email_address, confirmed, registered, last_login, is_admin)
VALUES ('colin', '$2y$10$a2gV2.OC.tEPC9EKXEyzo.bdaFkA.NgIO2pRon8iz4jEdgwdXmM4S', 'colin@fortytwosolutions.com', 1, NOW(), NOW(), 1);

DROP TABLE IF EXIST tt_organization;
CREATE TABLE tt_organization (
	id INT NOT NULL AUTO_INCREMENT,
	primary_user_id INT,
	name VARCHAR(255) NOT NULL,
	address_1 VARCHAR(255),
	address_2 VARCHAR(255),
	city VARCHAR(255),
	state_province VARCHAR(10),
	postal_code VARCHAR(15),
	country VARCHAR(200),
	phone_number VARCHAR(30),
	PRIMARY KEY (id)
);
INSERT INTO tt_organization (id, name) VALUES (1, '42 Solutions');

DROP TABLE IF EXIST tt_organization_user_map;
CREATE TABLE tt_organization_user_map (
	organization_id INT NOT NULL,
	user_id INT NOT NULL,
	INDEX idx_org_user (organization_id, user_id)
)

DROP TABLE IF EXISTS tt_client;
CREATE TABLE tt_client (
	id INT NOT NULL AUTO_INCREMENT,
	client_id INT DEFAULT '0',
	name VARCHAR(200) NOT NULL,
	primary_contact VARCHAR(255),
	address_1 VARCHAR(255),
	address_2 VARCHAR(255),
	city VARCHAR(255),
	state_province VARCHAR(10),
	postal_code VARCHAR(15),
	country VARCHAR(200),
	bill_rate DECIMAL(6,2) NOT NULL DEFAULT 135.00,
	invoice_services TEXT,
	invoice_line_item TEXT,
	start_date DATE NOT NULL,
	end_date DATE,
	PRIMARY KEY (id)
);

DROP TABLE IF EXISTS tt_client_project;
CREATE TABLE tt_client_project (
	id INT NOT NULL AUTO_INCREMENT,
	client_id INT NOT NULL,
	name VARCHAR(200) NOT NULL,
	invoice_line_item TEXT,
	bill_rate DECIMAL(6,2) NOT NULL,
	start_date DATE NOT NULL,
	end_date DATETIME,
	PRIMARY KEY (id)
);

DROP TABLE IF EXISTS tt_time_record;
CREATE TABLE tt_time_record (
	id INT NOT NULL AUTO_INCREMENT,
	client_id INT NOT NULL,
	project_id INT,
	work_desc TEXT,
	work_date DATETIME NOT NULL,
	num_hours DECIMAL(4,2) NOT NULL DEFAULT 1.0,
	created DATETIME NOT NULL,
	modified DATETIME NOT NULL,
	PRIMARY KEY (id)
);

DROP TABLE IF EXISTS tt_invoice;
CREATE TABLE tt_invoice (
	id INT NOT NULL AUTO_INCREMENT,
	client_id INT NOT NULL,
	project_id INT,
	invoice_number VARCHAR(50) NOT NULL,
	invoice_total DECIMAL(10,2) NOT NULL,
	invoice_catch_phrase VARCHAR(255),
	billed_date DATETIME,
	due_date DATE,
	paid_date DATE,
	is_billed TINYINT NOT NULL DEFAULT '0',
	created DATETIME NOT NULL,
	modified DATETIME NOT NULL,
	INDEX idx_invoice_by_client (client_id),
	INDEX idx_invoice_by_project (project_id),
	INDEX idx_invoice_by_client_project (client_id, project_id),
	PRIMARY KEY (id)
);

CREATE TABLE tt_invoice_record_map (
	invoice_id INT NOT NULL,
	time_record_id INT NOT NULL,
	INDEX idx_invoice_record (invoice_id, time_record_id)
);