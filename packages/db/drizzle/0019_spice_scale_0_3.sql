-- Owner decision 2026-11-14: spice level is 0-3 (the number of red chillies of three).
-- Levels 1-3 keep their value; 4 and 5 become 3.
UPDATE `products` SET `spice_level` = 3 WHERE `spice_level` > 3;
