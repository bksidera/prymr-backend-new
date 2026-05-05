-- DropForeignKey
ALTER TABLE "BoardEvent" DROP CONSTRAINT "BoardEvent_boardId_fkey";

-- DropForeignKey
ALTER TABLE "BoardEvent" DROP CONSTRAINT "BoardEvent_userId_fkey";

-- DropForeignKey
ALTER TABLE "BookMarkFolder" DROP CONSTRAINT "BookMarkFolder_userId_fkey";

-- DropForeignKey
ALTER TABLE "BookMarksBoards" DROP CONSTRAINT "BookMarksBoards_boardId_fkey";

-- DropForeignKey
ALTER TABLE "BookMarksBoards" DROP CONSTRAINT "BookMarksBoards_bookMarkFolderId_fkey";

-- DropForeignKey
ALTER TABLE "BookMarksBoards" DROP CONSTRAINT "BookMarksBoards_saleAdId_fkey";

-- DropForeignKey
ALTER TABLE "Cart" DROP CONSTRAINT "Cart_boardId_fkey";

-- DropForeignKey
ALTER TABLE "Cart" DROP CONSTRAINT "Cart_saleId_fkey";

-- DropForeignKey
ALTER TABLE "Cart" DROP CONSTRAINT "Cart_userId_fkey";

-- DropForeignKey
ALTER TABLE "FollowBoard" DROP CONSTRAINT "FollowBoard_boardId_fkey";

-- DropForeignKey
ALTER TABLE "FollowBoard" DROP CONSTRAINT "FollowBoard_userId_fkey";

-- DropForeignKey
ALTER TABLE "sale" DROP CONSTRAINT "sale_userId_fkey";

-- DropForeignKey
ALTER TABLE "saleComments" DROP CONSTRAINT "saleComments_parentSaleAdId_fkey";

-- DropForeignKey
ALTER TABLE "saleComments" DROP CONSTRAINT "saleComments_saleId_fkey";

-- DropForeignKey
ALTER TABLE "saleComments" DROP CONSTRAINT "saleComments_userId_fkey";

-- DropForeignKey
ALTER TABLE "saleImages" DROP CONSTRAINT "saleImages_saleId_fkey";

-- DropForeignKey
ALTER TABLE "saleLikes" DROP CONSTRAINT "saleLikes_commentId_fkey";

-- DropForeignKey
ALTER TABLE "saleLikes" DROP CONSTRAINT "saleLikes_postId_fkey";

-- DropForeignKey
ALTER TABLE "saleLikes" DROP CONSTRAINT "saleLikes_userId_fkey";

-- AlterTable
ALTER TABLE "Reaction" ADD COLUMN     "paymentIntentId" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'confirmed';

-- DropTable
DROP TABLE "BoardEvent";

-- DropTable
DROP TABLE "BookMarkFolder";

-- DropTable
DROP TABLE "BookMarksBoards";

-- DropTable
DROP TABLE "Cart";

-- DropTable
DROP TABLE "FollowBoard";

-- DropTable
DROP TABLE "sale";

-- DropTable
DROP TABLE "saleComments";

-- DropTable
DROP TABLE "saleImages";

-- DropTable
DROP TABLE "saleLikes";

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "inventory" INTEGER,
    "sellerAccountId" TEXT NOT NULL,
    "stripeProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_sellerAccountId_fkey" FOREIGN KEY ("sellerAccountId") REFERENCES "SellerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

