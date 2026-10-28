-- GoPay is no longer offered. Old GoPay payments become QRIS (GoPay pays QRIS codes) before the value leaves the enum.
UPDATE `payments` SET `method` = 'qris' WHERE `method` = 'gopay';

-- AlterTable
ALTER TABLE `payments` ADD COLUMN `charged_amount` INTEGER NULL,
    ADD COLUMN `fee` INTEGER NULL,
    ADD COLUMN `fee_bearer` VARCHAR(10) NULL,
    ADD COLUMN `pay_url` VARCHAR(500) NULL,
    ADD COLUMN `provider` VARCHAR(20) NULL,
    ADD COLUMN `qr_content` TEXT NULL,
    ADD COLUMN `reference` VARCHAR(64) NULL,
    ADD COLUMN `transaction_id` VARCHAR(64) NULL,
    MODIFY `method` ENUM('bca_va', 'bni_va', 'mandiri_va', 'bri_va', 'permata_va', 'bsi_va', 'muamalat_va', 'cimb_va', 'sinarmas_va', 'bnc_va', 'maybank_va', 'indomaret', 'alfamart', 'ovo', 'dana', 'shopeepay', 'qris') NOT NULL;

-- AlterTable
ALTER TABLE `store_settings` ADD COLUMN `retail_enabled` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX `payments_reference_key` ON `payments`(`reference`);


-- Rows created before this migration came from the mock provider.
UPDATE `payments` SET `provider` = 'mock' WHERE `provider` IS NULL;
