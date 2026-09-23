USE fisherman_demo;

INSERT INTO roles (name) VALUES
('ADMIN'),
('FISHERMAN'),
('BUYER'),
('PORT_OFFICIAL'),
('MARKET_OPERATOR');

INSERT INTO users (email, password_hash, full_name, phone, preferred_language, role_id, is_active) VALUES
('admin@demo.local', '$2a$10$JfW3Z8Q6bH5muVxWZ.Po9O4EqA1XqEuX4n9Jj5K8tZQ4rS5Jruljm', 'Admin User', '9000000001', 'en', 1, TRUE),
('official1@demo.local', '$2a$10$JfW3Z8Q6bH5muVxWZ.Po9O4EqA1XqEuX4n9Jj5K8tZQ4rS5Jruljm', 'Port Official One', '9000000002', 'en', 4, TRUE),
('official2@demo.local', '$2a$10$JfW3Z8Q6bH5muVxWZ.Po9O4EqA1XqEuX4n9Jj5K8tZQ4rS5Jruljm', 'Port Official Two', '9000000003', 'en', 4, TRUE),
('market1@demo.local', '$2a$10$JfW3Z8Q6bH5muVxWZ.Po9O4EqA1XqEuX4n9Jj5K8tZQ4rS5Jruljm', 'Market Operator One', '9000000004', 'en', 5, TRUE),
('market2@demo.local', '$2a$10$JfW3Z8Q6bH5muVxWZ.Po9O4EqA1XqEuX4n9Jj5K8tZQ4rS5Jruljm', 'Market Operator Two', '9000000005', 'en', 5, TRUE),
('fisher1@demo.local', '$2a$10$JfW3Z8Q6bH5muVxWZ.Po9O4EqA1XqEuX4n9Jj5K8tZQ4rS5Jruljm', 'Fisherman One', '9000000006', 'kn', 2, TRUE),
('fisher2@demo.local', '$2a$10$JfW3Z8Q6bH5muVxWZ.Po9O4EqA1XqEuX4n9Jj5K8tZQ4rS5Jruljm', 'Fisherman Two', '9000000007', 'ml', 2, TRUE),
('fisher3@demo.local', '$2a$10$JfW3Z8Q6bH5muVxWZ.Po9O4EqA1XqEuX4n9Jj5K8tZQ4rS5Jruljm', 'Fisherman Three', '9000000008', 'en', 2, TRUE),
('fisher4@demo.local', '$2a$10$JfW3Z8Q6bH5muVxWZ.Po9O4EqA1XqEuX4n9Jj5K8tZQ4rS5Jruljm', 'Fisherman Four', '9000000009', 'tulu', 2, TRUE),
('fisher5@demo.local', '$2a$10$JfW3Z8Q6bH5muVxWZ.Po9O4EqA1XqEuX4n9Jj5K8tZQ4rS5Jruljm', 'Fisherman Five', '9000000010', 'en', 2, TRUE),
('buyer1@demo.local', '$2a$10$JfW3Z8Q6bH5muVxWZ.Po9O4EqA1XqEuX4n9Jj5K8tZQ4rS5Jruljm', 'Buyer One', '9000000011', 'en', 3, TRUE),
('buyer2@demo.local', '$2a$10$JfW3Z8Q6bH5muVxWZ.Po9O4EqA1XqEuX4n9Jj5K8tZQ4rS5Jruljm', 'Buyer Two', '9000000012', 'en', 3, TRUE),
('buyer3@demo.local', '$2a$10$JfW3Z8Q6bH5muVxWZ.Po9O4EqA1XqEuX4n9Jj5K8tZQ4rS5Jruljm', 'Buyer Three', '9000000013', 'en', 3, TRUE),
('buyer4@demo.local', '$2a$10$JfW3Z8Q6bH5muVxWZ.Po9O4EqA1XqEuX4n9Jj5K8tZQ4rS5Jruljm', 'Buyer Four', '9000000014', 'en', 3, TRUE),
('buyer5@demo.local', '$2a$10$JfW3Z8Q6bH5muVxWZ.Po9O4EqA1XqEuX4n9Jj5K8tZQ4rS5Jruljm', 'Buyer Five', '9000000015', 'en', 3, TRUE),
('buyer6@demo.local', '$2a$10$JfW3Z8Q6bH5muVxWZ.Po9O4EqA1XqEuX4n9Jj5K8tZQ4rS5Jruljm', 'Buyer Six', '9000000016', 'en', 3, TRUE),
('buyer7@demo.local', '$2a$10$JfW3Z8Q6bH5muVxWZ.Po9O4EqA1XqEuX4n9Jj5K8tZQ4rS5Jruljm', 'Buyer Seven', '9000000017', 'en', 3, TRUE),
('buyer8@demo.local', '$2a$10$JfW3Z8Q6bH5muVxWZ.Po9O4EqA1XqEuX4n9Jj5K8tZQ4rS5Jruljm', 'Buyer Eight', '9000000018', 'en', 3, TRUE);

INSERT INTO fishermen (user_id, fisherman_id, vessel_id, status, verified) VALUES
(6, 'FISH-001', NULL, 'ACTIVE', TRUE),
(7, 'FISH-002', NULL, 'ACTIVE', TRUE),
(8, 'FISH-003', NULL, 'ACTIVE', TRUE),
(9, 'FISH-004', NULL, 'ACTIVE', TRUE),
(10, 'FISH-005', NULL, 'ACTIVE', TRUE);

INSERT INTO buyers (user_id, buyer_id) VALUES
(11, 'BUY-001'),
(12, 'BUY-002'),
(13, 'BUY-003'),
(14, 'BUY-004'),
(15, 'BUY-005'),
(16, 'BUY-006'),
(17, 'BUY-007'),
(18, 'BUY-008');

INSERT INTO officials (user_id, official_id, department) VALUES
(2, 'PORT-001', 'Harbor Operations'),
(3, 'PORT-002', 'Coastal Safety');

INSERT INTO market_operators (user_id, operator_id) VALUES
(4, 'MKT-001'),
(5, 'MKT-002');

INSERT INTO vessels (name, registration_number, fisherman_id, vessel_type, status, departure_time, expected_return) VALUES
('Blue Horizon', 'KA-01-MB-1001', 1, 'Trawler', 'AT_HARBOR', NULL, NULL),
('Sea Pearl', 'KA-01-MB-1002', 2, 'Gillnetter', 'DEPARTED', '2026-09-22 05:30:00', '2026-09-22 18:30:00'),
('Ocean Grace', 'KA-01-MB-1003', 3, 'Trawler', 'FISHING', '2026-09-22 04:00:00', '2026-09-22 17:00:00'),
('Harbor Tide', 'KA-01-MB-1004', 4, 'Longliner', 'RETURNING', '2026-09-22 06:00:00', '2026-09-22 15:00:00'),
('Sunrise Knot', 'KA-01-MB-1005', 5, 'Purse Seiner', 'DOCKED', '2026-09-22 08:00:00', '2026-09-22 20:00:00');

UPDATE fishermen SET vessel_id = 1 WHERE id = 1;
UPDATE fishermen SET vessel_id = 2 WHERE id = 2;
UPDATE fishermen SET vessel_id = 3 WHERE id = 3;
UPDATE fishermen SET vessel_id = 4 WHERE id = 4;
UPDATE fishermen SET vessel_id = 5 WHERE id = 5;

INSERT INTO vessel_status_history (vessel_id, old_status, new_status, updated_by, source) VALUES
(1, 'AT_HARBOR', 'AT_HARBOR', 2, 'OFFICIAL'),
(2, 'AT_HARBOR', 'DEPARTED', 2, 'OFFICIAL'),
(3, 'AT_HARBOR', 'FISHING', 1, 'FISHERMAN'),
(4, 'AT_HARBOR', 'RETURNING', 1, 'VOICE'),
(5, 'AT_HARBOR', 'DOCKED', 2, 'OFFICIAL');

INSERT INTO fishing_trips (vessel_id, fisherman_id, departure_time, expected_return, actual_return, status) VALUES
(2, 2, '2026-09-22 05:30:00', '2026-09-22 18:30:00', NULL, 'ACTIVE'),
(3, 3, '2026-09-22 04:00:00', '2026-09-22 17:00:00', NULL, 'ACTIVE'),
(4, 4, '2026-09-22 06:00:00', '2026-09-22 15:00:00', '2026-09-22 14:50:00', 'COMPLETED');

INSERT INTO catch_records (fish_species, quantity, unit, quality, catch_date, catch_location, vessel_id, fishing_trip_id) VALUES
('Mackerel', 30, 'kg', 'A', '2026-09-22 09:00:00', 'Mangaluru Coast', 3, 2),
('Sardine', 45, 'kg', 'B', '2026-09-22 10:00:00', 'Mangaluru Coast', 2, 1),
( 'Tuna', 20, 'kg', 'A', '2026-09-22 11:00:00', 'Mangaluru Coast', 4, 3),
( 'Mackerel', 50, 'kg', 'A', '2026-09-22 08:30:00', 'Mangaluru Coast', 1, NULL);

INSERT INTO fish_species (name, category) VALUES
('Mackerel', 'Pelagic'),
('Sardine', 'Pelagic'),
('Tuna', 'Large Pelagic'),
('Prawns', 'Shellfish'),
('Kingfish', 'Pelagic');

INSERT INTO fish_listings (fisherman_id, fish_species, quantity, available_quantity, quality, price, sale_type, status) VALUES
(1, 'Mackerel', 50, 50, 'A', 300, 'AUCTION', 'ACTIVE'),
(2, 'Sardine', 40, 40, 'B', 180, 'DIRECT_SALE', 'ACTIVE'),
(3, 'Tuna', 20, 20, 'A', 420, 'AUCTION', 'ACTIVE');

INSERT INTO auctions (listing_id, fisherman_id, fish_species, quantity, starting_price, current_bid, current_bidder_id, duration_minutes, status, closes_at) VALUES
(1, 1, 'Mackerel', 50, 300, 330, 1, 120, 'ACTIVE', '2026-09-22 20:00:00');

INSERT INTO bids (auction_id, buyer_id, amount, status) VALUES
(1, 1, 330, 'ACTIVE');

INSERT INTO orders (buyer_id, fisherman_id, total_amount, status) VALUES
(1, 1, 6000, 'PAID'),
(2, 2, 4500, 'PENDING');

INSERT INTO order_items (order_id, fish_species, quantity, unit_price, status) VALUES
(1, 'Mackerel', 20, 300, 'DELIVERED'),
(2, 'Sardine', 25, 180, 'PENDING');

INSERT INTO payments (order_id, buyer_id, amount, payment_method, status) VALUES
(1, 1, 6000, 'DEMO_PAYMENT', 'PAID'),
(2, 2, 4500, 'DEMO_PAYMENT', 'PENDING');

INSERT INTO transactions (buyer_id, fisherman_id, order_id, amount, type, status) VALUES
(1, 1, 1, 6000, 'SALE', 'PAID'),
(2, 2, 2, 4500, 'SALE', 'PENDING');

INSERT INTO price_history (fish_species, recent_price, average_price, recorded_date, trend) VALUES
('Mackerel', 310, 295, '2026-09-22', 'UP'),
('Sardine', 180, 170, '2026-09-22', 'UP'),
('Tuna', 420, 405, '2026-09-22', 'UP');

INSERT INTO notifications (user_id, title, message, type) VALUES
(6, 'New Bid', 'A buyer placed a bid on your Mackerel auction.', 'AUCTION'),
(2, 'Harbor Alert', 'Two vessels are nearing the dock.', 'PORT'),
(1, 'System', 'Demo database initialized successfully.', 'INFO');

INSERT INTO audit_logs (user_id, role, action, entity, entity_id) VALUES
(2, 'PORT_OFFICIAL', 'changed vessel status', 'vessels', 2),
(6, 'FISHERMAN', 'recorded catch', 'catch_records', 1),
(1, 'ADMIN', 'initialized app', 'system', 1);

INSERT INTO emergency_alerts (fisherman_id, vessel_id, location, message) VALUES
(2, 2, 'Off Mangaluru coast', 'Engine warning reported by vessel crew.');
