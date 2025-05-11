import type { StockedProduct } from './Product';
/**
 * 선택된 상품 타입
 */
export interface SelectedProductItem {
  product: StockedProduct;
  quantity: number;
}

/**
 * 자판기 상태
 */
export enum VendingMachineState {
  IDLE = '대기',
  PRODUCT_SELECTED = '상품 선택됨',
  PAYMENT_PENDING = '결제 대기 중',
  PAYMENT_PROCESSING = '결제 처리 중',
  DISPENSING = '상품 배출 중',
  ERROR = '오류',
}

/**
 * 자판기 오류 타입
 */
export enum VendingMachineError {
  OUT_OF_STOCK = '재고 부족',
  INSUFFICIENT_PAYMENT = '결제 금액 부족',
  PAYMENT_FAILED = '결제 실패',
  CANNOT_MAKE_CHANGE = '거스름돈 부족',
  DISPENSING_ERROR = '상품 배출 오류',
}

/**
 * 자판기 작업 결과 인터페이스
 */
export interface VendingMachineResult {
  success: boolean;
  message: string;
  error?: VendingMachineError;
  data?: any;
}
