const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();

  const products = [
    {
      storeId: 1,
      storeName: '北一食堂',
      name: 'ロスパンセット',
      description: '焼き立て翌日のパンを詰め合わせたお得セットです。',
      price: 900,
      saleDate: new Date('2026-03-07T00:00:00.000Z'),
      stock: 12,
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=900'
    },
    {
      storeId: 1,
      storeName: '北一食堂',
      name: 'クロワッサン4個セット',
      description: 'サクサク食感のクロワッサンをまとめ買い。',
      price: 780,
      saleDate: new Date('2026-03-07T00:00:00.000Z'),
      stock: 8,
      imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=900'
    },
    {
      storeId: 2,
      storeName: '大学食堂',
      name: '規格外野菜ボックス',
      description: '形が不揃いでも味は同じ。旬の野菜を詰め合わせ。',
      price: 1200,
      saleDate: new Date('2026-03-08T00:00:00.000Z'),
      stock: 15,
      imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=900'
    }
  ];

  await prisma.product.createMany({ data: products });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
