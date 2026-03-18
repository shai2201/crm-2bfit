import { Header } from "@/components/dashboard/Header";
import { ProductManager } from "@/components/products/ProductManager";
import { prisma } from "@/lib/prisma";
import type { Product } from "@/types";

async function getProducts(): Promise<Product[]> {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });
  return products.map((p) => ({
    ...p,
    price:     String(p.price),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <>
      <Header
        title="מוצרים ותמחור"
        subtitle="ניהול שירותים, חבילות ומחירים"
      />
      <div className="p-6">
        <ProductManager products={products} />
      </div>
    </>
  );
}
