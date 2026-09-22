CREATE DATABASE IF NOT EXISTS fisherman_demo;
USE fisherman_demo;

CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  preferred_language VARCHAR(20) DEFAULT 'en',
  role_id INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS fishermen (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  fisherman_id VARCHAR(100) UNIQUE,
  vessel_id INT,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS buyers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  buyer_id VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS officials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  official_id VARCHAR(100) UNIQUE,
  department VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS market_operators (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  operator_id VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS vessels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  registration_number VARCHAR(100) UNIQUE,
  fisherman_id INT,
  vessel_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'AT_HARBOR',
  departure_time TIMESTAMP NULL,
  expected_return TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fisherman_id) REFERENCES fishermen(id)
);

CREATE TABLE IF NOT EXISTS vessel_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vessel_id INT NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  updated_by INT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  source VARCHAR(20) DEFAULT 'FISHERMAN',
  FOREIGN KEY (vessel_id) REFERENCES vessels(id)
);

CREATE TABLE IF NOT EXISTS fishing_trips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vessel_id INT NOT NULL,
  fisherman_id INT NOT NULL,
  departure_time TIMESTAMP NULL,
  expected_return TIMESTAMP NULL,
  actual_return TIMESTAMP NULL,
  status VARCHAR(50) DEFAULT 'PLANNED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vessel_id) REFERENCES vessels(id),
  FOREIGN KEY (fisherman_id) REFERENCES fishermen(id)
);

CREATE TABLE IF NOT EXISTS catch_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fish_species VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) DEFAULT 'kg',
  quality VARCHAR(50),
  catch_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  catch_location VARCHAR(255),
  vessel_id INT NOT NULL,
  fishing_trip_id INT,
  photo_url VARCHAR(255),
  FOREIGN KEY (vessel_id) REFERENCES vessels(id),
  FOREIGN KEY (fishing_trip_id) REFERENCES fishing_trips(id)
);

CREATE TABLE IF NOT EXISTS fish_species (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fish_listings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fisherman_id INT NOT NULL,
  fish_species VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  available_quantity DECIMAL(10,2) NOT NULL,
  quality VARCHAR(50),
  price DECIMAL(10,2) NOT NULL,
  sale_type VARCHAR(20) NOT NULL,
  photo_url VARCHAR(255),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fisherman_id) REFERENCES fishermen(id)
);

CREATE TABLE IF NOT EXISTS auctions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  listing_id INT NOT NULL,
  fisherman_id INT NOT NULL,
  fish_species VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  starting_price DECIMAL(10,2) NOT NULL,
  current_bid DECIMAL(10,2) DEFAULT 0,
  current_bidder_id INT,
  duration_minutes INT DEFAULT 60,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closes_at TIMESTAMP NULL,
  FOREIGN KEY (listing_id) REFERENCES fish_listings(id),
  FOREIGN KEY (fisherman_id) REFERENCES fishermen(id),
  FOREIGN KEY (current_bidder_id) REFERENCES buyers(id)
);

CREATE TABLE IF NOT EXISTS bids (
  id INT AUTO_INCREMENT PRIMARY KEY,
  auction_id INT NOT NULL,
  buyer_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (auction_id) REFERENCES auctions(id),
  FOREIGN KEY (buyer_id) REFERENCES buyers(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  buyer_id INT NOT NULL,
  fisherman_id INT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(30) DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (buyer_id) REFERENCES buyers(id),
  FOREIGN KEY (fisherman_id) REFERENCES fishermen(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  fish_species VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  status VARCHAR(30) DEFAULT 'PENDING',
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  buyer_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'DEMO_PAYMENT',
  status VARCHAR(30) DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (buyer_id) REFERENCES buyers(id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  buyer_id INT,
  fisherman_id INT,
  order_id INT,
  amount DECIMAL(10,2),
  type VARCHAR(50),
  status VARCHAR(30),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (buyer_id) REFERENCES buyers(id),
  FOREIGN KEY (fisherman_id) REFERENCES fishermen(id),
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS price_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fish_species VARCHAR(255) NOT NULL,
  recent_price DECIMAL(10,2) NOT NULL,
  average_price DECIMAL(10,2) NOT NULL,
  recorded_date DATE NOT NULL,
  trend VARCHAR(20) DEFAULT 'STABLE'
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'INFO',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  role VARCHAR(50),
  action VARCHAR(255) NOT NULL,
  entity VARCHAR(255),
  entity_id INT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emergency_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fisherman_id INT,
  vessel_id INT,
  alert_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'OPEN',
  location VARCHAR(255),
  message TEXT,
  FOREIGN KEY (fisherman_id) REFERENCES fishermen(id),
  FOREIGN KEY (vessel_id) REFERENCES vessels(id)
);

CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_vessels_status ON vessels(status);
CREATE INDEX idx_trips_status ON fishing_trips(status);
CREATE INDEX idx_listings_status ON fish_listings(status);
CREATE INDEX idx_auctions_status ON auctions(status);
CREATE INDEX idx_notifications_user ON notifications(user_id);
