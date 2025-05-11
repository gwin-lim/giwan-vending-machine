/**
 * 음료수 상품 인터페이스
 */
export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
}

/**
 * 재고가 있는 상품 인터페이스
 */
export interface StockedProduct extends Product {
  stock: number;
}

/**
 * 기본 음료수 목록
 */
export const DEFAULT_PRODUCTS: StockedProduct[] = [
  {
    id: 'cola',
    name: '콜라',
    price: 1100,
    stock: 30,
    imageUrl: '/images/cola.png',
  },
  {
    id: 'water',
    name: '물',
    price: 600,
    stock: 30,
    imageUrl: '/images/water.png',
  },
  {
    id: 'coffee',
    name: '커피',
    price: 700,
    stock: 30,
    imageUrl: '/images/coffee.png',
  },
];
