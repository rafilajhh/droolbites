-- Stock per size: NULL means not tracked, so every existing size stays orderable until the owner sets a number.
ALTER TABLE `product_variants`
    ADD COLUMN `stock` INTEGER NULL;

-- Stock is taken when an order is paid and given back once if the store declines or cancels it.
ALTER TABLE `orders`
    ADD COLUMN `stock_deducted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `stock_short` BOOLEAN NOT NULL DEFAULT false;

-- How many units each line took (fewer than qty when the size ran short), so a restore gives back exactly that.
ALTER TABLE `order_items`
    ADD COLUMN `stock_taken` SMALLINT NULL;
