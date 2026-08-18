-- Add durable cover/gallery images for published products.
ALTER TABLE "Product" ADD COLUMN "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];