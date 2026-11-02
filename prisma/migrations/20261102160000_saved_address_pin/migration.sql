-- The saved delivery address carries its map pin, like an order's shipping address.
ALTER TABLE `users`
    ADD COLUMN `address_lat` DOUBLE NULL,
    ADD COLUMN `address_lng` DOUBLE NULL;
