-- Order timeline (accepted, handed off, completed, cancelled) and the store's "Mark as refunded".
-- All NULL: orders from before this simply show no time for those steps.
ALTER TABLE `orders` ADD COLUMN `accepted_at` DATETIME(3) NULL,
    ADD COLUMN `cancelled_at` DATETIME(3) NULL,
    ADD COLUMN `completed_at` DATETIME(3) NULL,
    ADD COLUMN `handed_off_at` DATETIME(3) NULL,
    ADD COLUMN `refund_note` VARCHAR(200) NULL,
    ADD COLUMN `refunded_at` DATETIME(3) NULL;
