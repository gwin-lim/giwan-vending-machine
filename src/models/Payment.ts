/**
 * 결제 수단 타입
 */
export type PaymentMethod = 'CASH' | 'CARD';

/**
 * 현금 종류
 */
export enum CashType {
  COIN_100 = 100,
  COIN_500 = 500,
  BILL_1000 = 1000,
  BILL_5000 = 5000,
  BILL_10000 = 10000,
}

/**
 * 사용자 보유 현금
 */
export interface UserCashHoldings {
  [CashType.COIN_100]: number;
  [CashType.COIN_500]: number;
  [CashType.BILL_1000]: number;
  [CashType.BILL_5000]: number;
  [CashType.BILL_10000]: number;
}

/**
 * 기본 사용자 보유 현금 (권종별 10개)
 */
export const DEFAULT_USER_CASH: UserCashHoldings = {
  [CashType.COIN_100]: 10,
  [CashType.COIN_500]: 10,
  [CashType.BILL_1000]: 10,
  [CashType.BILL_5000]: 10,
  [CashType.BILL_10000]: 10,
};

/**
 * 기본 카드 한도 금액
 */
export const DEFAULT_CARD_LIMIT = 10000;

/**
 * 결제 상태
 */
export enum PaymentStatus {
  IDLE = '대기',
  PROCESSING = '처리 중',
  SUCCESS = '성공',
  FAILED = '실패',
}

/**
 * 결제 인터페이스
 */
export interface Payment {
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
}

/**
 * 현금 결제 인터페이스
 */
export interface CashPayment extends Payment {
  method: 'CASH';
  insertedCash: Map<CashType, number>; // 종류별 수량
  change?: Map<CashType, number>;
}

/**
 * 카드 결제 인터페이스
 */
export interface CardPayment extends Payment {
  method: 'CARD';
  cardNumber?: string;
  approvalCode?: string;
}

/**
 * 각 종류의 현금 결제 수단
 */
export const CASH_OPTIONS = [
  { type: CashType.COIN_100, label: '100원', value: 100 },
  { type: CashType.COIN_500, label: '500원', value: 500 },
  { type: CashType.BILL_1000, label: '1,000원', value: 1000 },
  { type: CashType.BILL_5000, label: '5,000원', value: 5000 },
  { type: CashType.BILL_10000, label: '10,000원', value: 10000 },
];
