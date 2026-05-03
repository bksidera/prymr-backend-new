/*
  Warnings:

  - You are about to drop the column `email` on the `StripeCustomer` table. All the data in the column will be lost.
  - You are about to drop the column `assetType` on the `Tappable` table. All the data in the column will be lost.
  - You are about to drop the column `assetType` on the `sale` table. All the data in the column will be lost.
  - You are about to drop the column `wallet_address` on the `user` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "StripeCustomer_email_key";

-- AlterTable
ALTER TABLE "Board" ADD COLUMN     "boardImageScr" TEXT;

-- AlterTable
ALTER TABLE "Reaction" ADD COLUMN     "normalizedX" DOUBLE PRECISION,
ADD COLUMN     "normalizedY" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "SellerAccount" ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "StripeCustomer" DROP COLUMN "email";

-- AlterTable
ALTER TABLE "Tappable" DROP COLUMN "assetType",
ADD COLUMN     "inventoryAvailableCount" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "inventoryCount" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isInventoryEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isReplace" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isVanish" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "normalizedH" DOUBLE PRECISION,
ADD COLUMN     "normalizedW" DOUBLE PRECISION,
ADD COLUMN     "normalizedX" DOUBLE PRECISION,
ADD COLUMN     "normalizedY" DOUBLE PRECISION,
ADD COLUMN     "switchId" TEXT;

-- AlterTable
ALTER TABLE "sale" DROP COLUMN "assetType";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "wallet_address",
ADD COLUMN     "isStripeOnBoardingDone" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "securityKeys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,

    CONSTRAINT "securityKeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplaceTappable" (
    "id" TEXT NOT NULL,
    "tappableId" TEXT NOT NULL,
    "title" TEXT,
    "ContentImagesLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "layerName" TEXT,
    "layerNumber" TEXT,
    "isInventoryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inventoryCount" BIGINT NOT NULL DEFAULT 0,
    "inventoryAvailableCount" BIGINT NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "description" TEXT,
    "isLockTappable" BOOLEAN NOT NULL DEFAULT false,
    "price" TEXT,
    "top" TEXT,
    "left" TEXT,
    "width" TEXT,
    "height" TEXT,
    "isReplace" BOOLEAN NOT NULL DEFAULT false,
    "isVanish" BOOLEAN NOT NULL DEFAULT false,
    "infoOverlayImage" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "actionName" TEXT,
    "lockTappableDescription" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isInfoOverlay" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReplaceTappable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "sellerAccountId" TEXT NOT NULL,
    "customerGuest" BOOLEAN NOT NULL DEFAULT false,
    "tappableId" TEXT,
    "switchId" TEXT,
    "replaceId" TEXT,
    "boardId" TEXT,
    "reactionId" TEXT,
    "price" BIGINT NOT NULL,
    "stripeTransactionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isInventoryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inventoryBuyCount" BIGINT NOT NULL DEFAULT 0,
    "paymentPurpose" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newTransaction" (
    "id" TEXT NOT NULL,
    "stripeTransactionId" TEXT,
    "customerGuest" BOOLEAN NOT NULL DEFAULT false,
    "customerId" TEXT,
    "paymentPurpose" TEXT,
    "price" TEXT,
    "applicationFee" TEXT,
    "stripeFee" TEXT,
    "totalAmount" TEXT,
    "status" TEXT,
    "senderUserId" TEXT,
    "receiverUserId" TEXT,
    "reactionId" TEXT,
    "boardId" TEXT,
    "sellerAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Switch" (
    "id" TEXT NOT NULL,
    "switchAction" TEXT,
    "vanishAction" TEXT,
    "vanishDescription" TEXT,
    "isLockTappable" BOOLEAN NOT NULL DEFAULT false,
    "vanishPrice" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Switch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "securityKeys_key_key" ON "securityKeys"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_stripeTransactionId_key" ON "Transaction"("stripeTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "newTransaction_stripeTransactionId_key" ON "newTransaction"("stripeTransactionId");

-- AddForeignKey
ALTER TABLE "Tappable" ADD CONSTRAINT "Tappable_switchId_fkey" FOREIGN KEY ("switchId") REFERENCES "Switch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplaceTappable" ADD CONSTRAINT "ReplaceTappable_tappableId_fkey" FOREIGN KEY ("tappableId") REFERENCES "Tappable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplaceTappable" ADD CONSTRAINT "ReplaceTappable_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "StripeCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_sellerAccountId_fkey" FOREIGN KEY ("sellerAccountId") REFERENCES "SellerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_tappableId_fkey" FOREIGN KEY ("tappableId") REFERENCES "Tappable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_switchId_fkey" FOREIGN KEY ("switchId") REFERENCES "ReplaceTappable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_replaceId_fkey" FOREIGN KEY ("replaceId") REFERENCES "ReplaceTappable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_reactionId_fkey" FOREIGN KEY ("reactionId") REFERENCES "Reaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "newTransaction" ADD CONSTRAINT "newTransaction_reactionId_fkey" FOREIGN KEY ("reactionId") REFERENCES "Reaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "newTransaction" ADD CONSTRAINT "newTransaction_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "newTransaction" ADD CONSTRAINT "newTransaction_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "newTransaction" ADD CONSTRAINT "newTransaction_receiverUserId_fkey" FOREIGN KEY ("receiverUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
