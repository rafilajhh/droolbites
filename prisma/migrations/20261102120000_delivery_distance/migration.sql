-- Delivery fee by road distance (base fee for the first km, then per km, up to a maximum distance).
ALTER TABLE `store_settings`
    MODIFY `delivery_fee` INTEGER NOT NULL DEFAULT 10000,
    ADD COLUMN `delivery_base_km` INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN `delivery_per_km` INTEGER NOT NULL DEFAULT 2500,
    ADD COLUMN `delivery_max_km` INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN `store_lat` DOUBLE NOT NULL DEFAULT -7.2375,
    ADD COLUMN `store_lng` DOUBLE NOT NULL DEFAULT 112.6365;

-- The flat fee becomes the base fee for the first 3 km.
UPDATE `store_settings` SET `delivery_fee` = 10000;

ALTER TABLE `orders`
    ADD COLUMN `shipping_lat` DOUBLE NULL,
    ADD COLUMN `shipping_lng` DOUBLE NULL,
    ADD COLUMN `delivery_distance_m` INTEGER NULL;
