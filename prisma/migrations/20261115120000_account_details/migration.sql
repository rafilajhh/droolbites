-- Google profile photo, and the saved address grows a recipient, a block/floor/unit detail, a note for
-- the courier and the kecamatan from its pin.
ALTER TABLE `users`
    ADD COLUMN `avatar_url` VARCHAR(500) NULL,
    ADD COLUMN `recipient_name` VARCHAR(100) NULL,
    ADD COLUMN `recipient_phone` VARCHAR(20) NULL,
    ADD COLUMN `address_detail` VARCHAR(70) NULL,
    ADD COLUMN `address_note` VARCHAR(200) NULL,
    ADD COLUMN `district` VARCHAR(100) NULL;

-- Orders keep who receives a delivery, the courier note and the kecamatan (block/floor/unit stays in shipping_address).
ALTER TABLE `orders`
    ADD COLUMN `shipping_district` VARCHAR(100) NULL,
    ADD COLUMN `recipient_name` VARCHAR(100) NULL,
    ADD COLUMN `recipient_phone` VARCHAR(20) NULL,
    ADD COLUMN `delivery_note` VARCHAR(200) NULL;
