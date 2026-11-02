-- The store confirms each paid order (accept or decline with a reason) and is emailed when one arrives.
ALTER TABLE `orders` ADD COLUMN `cancel_reason` VARCHAR(200) NULL;
ALTER TABLE `store_settings` ADD COLUMN `notify_email` VARCHAR(150) NULL;
