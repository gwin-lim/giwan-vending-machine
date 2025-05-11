import type { StockedProduct } from '../models/Product';
import {
  PaymentStatus,
  CashType,
  DEFAULT_USER_CASH,
  DEFAULT_CARD_LIMIT,
} from '../models/Payment';
import type {
  PaymentMethod,
  CashPayment,
  CardPayment,
  Payment,
  UserCashHoldings,
} from '../models/Payment';
import { VendingMachineState, VendingMachineError } from '../models/VendingMachine';
import type { VendingMachineResult, SelectedProductItem } from '../models/VendingMachine';

/**
 * 자판기 서비스 클래스
 * 자판기의 핵심 로직을 관리합니다.
 */
class VendingMachineService {
  private products: StockedProduct[] = [];
  private selectedProducts: Map<string, SelectedProductItem> = new Map();
  private state: VendingMachineState = VendingMachineState.IDLE;
  private payment: Payment | null = null;
  private error: VendingMachineError | null = null;
  private cashReserve: Map<CashType, number> = new Map();
  private userCash: UserCashHoldings;
  private cardLimit: number; // 프라이빗 멤버로 유지

  /**
   * 자판기 초기화
   */
  constructor(
    products: StockedProduct[],
    initialUserCash: UserCashHoldings = DEFAULT_USER_CASH,
    initialCardLimit: number = DEFAULT_CARD_LIMIT
  ) {
    this.products = [...products];
    this.userCash = { ...initialUserCash };
    this.cardLimit = initialCardLimit;

    // 기본 현금 보유량 초기화 (각 권종별 10개로 설정, 테스트를 위해 100원은 0개)
    this.cashReserve.set(CashType.COIN_100, 10); // 거스름돈 부족 테스트를 위해 0개로 설정
    this.cashReserve.set(CashType.COIN_500, 10);
    this.cashReserve.set(CashType.BILL_1000, 10);
    this.cashReserve.set(CashType.BILL_5000, 10);
    this.cashReserve.set(CashType.BILL_10000, 10);
  }

  /**
   * 현재 자판기 상태 반환
   */
  getState(): VendingMachineState {
    return this.state;
  }

  /**
   * 선택된 상품 목록 반환
   */
  getSelectedProducts(): SelectedProductItem[] {
    return Array.from(this.selectedProducts.values());
  }

  /**
   * 음료수 수량 조절
   */
  adjustProductQuantity(productId: string, quantityChange: number): VendingMachineResult {
    console.log(`상품 수량 조절: ${productId}, 변경량: ${quantityChange}`);

    // 대기 상태가 아니고 선택 상태가 아닙니다
    if (
      this.state !== VendingMachineState.IDLE &&
      this.state !== VendingMachineState.PRODUCT_SELECTED
    ) {
      return {
        success: false,
        message: '현재 다른 작업이 진행 중입니다.',
      };
    }

    // 상품 찾기
    const product = this.products.find((p) => p.id === productId);

    if (!product) {
      return {
        success: false,
        message: '존재하지 않는 상품입니다.',
      };
    }

    // 이미 선택된 상품인지 확인
    const selectedItem = this.selectedProducts.get(productId);
    const currentQuantity = selectedItem ? selectedItem.quantity : 0;
    const newQuantity = currentQuantity + quantityChange;

    // 수량이 0 미만이면 상품 제거
    if (newQuantity <= 0) {
      if (selectedItem) {
        this.selectedProducts.delete(productId);
      }

      // 선택된 상품이 없으면 대기 상태로 전환
      if (this.selectedProducts.size === 0) {
        this.state = VendingMachineState.IDLE;
      }

      return {
        success: true,
        message: `${product.name} 상품이 선택 목록에서 제거되었습니다.`,
        data: {
          selectedProducts: this.getSelectedProducts(),
          totalAmount: this.calculateTotalAmount(),
          state: this.state,
        },
      };
    }

    // 재고 확인
    if (newQuantity > product.stock) {
      return {
        success: false,
        message: `${product.name} 상품의 재고가 부족합니다.`,
        data: {
          availableStock: product.stock,
          requestedQuantity: newQuantity,
        },
      };
    }

    // 상품 수량 업데이트
    this.selectedProducts.set(productId, {
      product,
      quantity: newQuantity,
    });

    // 상태 업데이트
    this.state = VendingMachineState.PRODUCT_SELECTED;

    return {
      success: true,
      message: `${product.name} 상품이 선택되었습니다.(${newQuantity})`,
      data: {
        selectedProducts: this.getSelectedProducts(),
        totalAmount: this.calculateTotalAmount(),
      },
    };
  }

  /**
   * 전체 금액 계산
   */
  calculateTotalAmount(): number {
    let total = 0;
    this.selectedProducts.forEach((item) => {
      total += item.product.price * item.quantity;
    });
    return total;
  }

  /**
   * 음료수 선택
   */
  selectProduct(productId: string): VendingMachineResult {
    console.log(`선택된 상품 ID: ${productId}`);
    return this.adjustProductQuantity(productId, 1);
  }

  /**
   * 결제 방법 선택
   */
  selectPaymentMethod(method: PaymentMethod): VendingMachineResult {
    console.log(`선택된 결제 방법: ${method}`);

    if (this.state !== VendingMachineState.PRODUCT_SELECTED) {
      return {
        success: false,
        message: '상품을 먼저 선택해야 합니다.',
      };
    }

    if (this.selectedProducts.size === 0) {
      return {
        success: false,
        message: '선택된 상품이 없습니다.',
      };
    }

    const totalAmount = this.calculateTotalAmount();

    // 결제 방법에 따라 결제 객체 생성
    if (method === 'CASH') {
      this.payment = {
        method: 'CASH',
        amount: 0,
        status: PaymentStatus.IDLE,
        insertedCash: new Map(),
      } as CashPayment;
    } else {
      this.payment = {
        method: 'CARD',
        amount: totalAmount,
        status: PaymentStatus.IDLE,
      } as CardPayment;
    }

    this.state = VendingMachineState.PAYMENT_PENDING;

    return {
      success: true,
      message: `${method === 'CASH' ? '현금' : '카드'} 결제가 선택되었습니다.`,
      data: {
        method,
        selectedProducts: this.getSelectedProducts(),
        totalAmount: totalAmount,
      },
    };
  }

  /**
   * 현금 투입
   */
  insertCash(cashType: CashType): VendingMachineResult {
    console.log(`투입된 현금: ${cashType}원`);

    if (
      this.state !== VendingMachineState.PAYMENT_PENDING ||
      !this.payment ||
      this.payment.method !== 'CASH'
    ) {
      return {
        success: false,
        message: '현재 현금 결제 상태가 아닙니다.',
      };
    }

    if (!this.selectedProducts || this.selectedProducts.size === 0) {
      return {
        success: false,
        message: '선택된 상품이 없습니다.',
      };
    }

    // 사용자의 현금 보유량 확인
    if (this.userCash[cashType] <= 0) {
      return {
        success: false,
        message: `해당 권종(${cashType}원)의 현금이 부족합니다.`,
        data: {
          userCash: this.userCash,
        },
      };
    }

    const cashPayment = this.payment as CashPayment;

    // 현금 추가
    const currentAmount = cashPayment.insertedCash.get(cashType) || 0;
    cashPayment.insertedCash.set(cashType, currentAmount + 1);

    // 사용자 현금 감소
    this.userCash[cashType]--;

    // 총 투입 금액 계산
    cashPayment.amount = Array.from(cashPayment.insertedCash.entries()).reduce(
      (total, [type, count]) => total + type * count,
      0
    );

    // 총 구매 금액 계산
    const totalRequired = this.calculateTotalAmount();

    return {
      success: true,
      message: `${cashType}원이 투입되었습니다. 총 ${cashPayment.amount}원`,
      data: {
        insertedAmount: cashPayment.amount,
        requiredAmount: totalRequired,
        remaining: Math.max(0, totalRequired - cashPayment.amount),
        userCash: this.userCash, // 사용자의 남은 현금 정보 추가
      },
    };
  }

  /**
   * 카드 결제 처리
   * @param cardNumber 카드 번호
   * @param alwaysFailCardPayment 카드 결제 실패 100% 시뮬레이트 여부
   */
  processCardPayment(
    cardNumber: string,
    alwaysFailCardPayment: boolean = false
  ): VendingMachineResult {
    // 결제 상태 초기화 - 중요: 새로운 처리를 위해 오류 상태 제거
    this.error = null;
    console.log(`카드 결제 처리: ${cardNumber}`);

    if (
      this.state !== VendingMachineState.PAYMENT_PENDING ||
      !this.payment ||
      this.payment.method !== 'CARD'
    ) {
      return {
        success: false,
        message: '현재 카드 결제 상태가 아닙니다.',
      };
    }

    if (!this.selectedProducts || this.selectedProducts.size === 0) {
      return {
        success: false,
        message: '선택된 상품이 없습니다.',
      };
    }

    const totalAmount = this.calculateTotalAmount();

    // 카드 한도 금액 확인
    if (totalAmount > this.cardLimit) {
      this.error = VendingMachineError.PAYMENT_FAILED;
      this.state = VendingMachineState.ERROR;

      return {
        success: false,
        message: '카드 잔여 한도가 부족합니다.',
        error: this.error,
        data: {
          requiredAmount: totalAmount,
          cardLimit: this.cardLimit,
        },
      };
    }

    this.state = VendingMachineState.PAYMENT_PROCESSING;
    const cardPayment = this.payment as CardPayment;
    cardPayment.status = PaymentStatus.PROCESSING;
    cardPayment.cardNumber = cardNumber;

    // 시뮬레이트 체크박스가 활성화되어 있으면 항상 실패
    // 그렇지 않다면 기존 로직 적용 (90% 확률로 성공, 0000000000000000 번호는 실패)
    console.log('카드 결제 처리 연산 시작:', { alwaysFailCardPayment, cardNumber });

    // 카드 결제 상태 새로 초기화
    this.payment = {
      method: 'CARD',
      amount: this.calculateTotalAmount(),
      status: PaymentStatus.PROCESSING,
    } as CardPayment;

    let isSuccessful = false;
    if (alwaysFailCardPayment) {
      console.log('체크박스 활성화로 카드 결제 강제 실패');
      isSuccessful = false;
    } else {
      isSuccessful = true;
      console.log('체크박스 비활성화: 카드 결제 결과:', isSuccessful);
    }

    if (isSuccessful) {
      cardPayment.status = PaymentStatus.SUCCESS;
      cardPayment.approvalCode = Math.random().toString(36).substr(2, 8).toUpperCase();

      // 카드 한도 금액 차감
      this.cardLimit -= totalAmount;

      return this.completeTransaction();
    } else {
      cardPayment.status = PaymentStatus.FAILED;
      this.error = VendingMachineError.PAYMENT_FAILED;
      this.state = VendingMachineState.ERROR;

      return {
        success: false,
        message: '카드 결제에 실패했습니다.',
        error: this.error,
        data: {
          cardLimit: this.cardLimit,
        },
      };
    }
  }

  /**
   * 현금 결제 확인
   */
  confirmCashPayment(): VendingMachineResult {
    console.log('현금 결제 확인');

    if (
      this.state !== VendingMachineState.PAYMENT_PENDING ||
      !this.payment ||
      this.payment.method !== 'CASH'
    ) {
      return {
        success: false,
        message: '현재 현금 결제 상태가 아닙니다.',
      };
    }

    if (!this.selectedProducts || this.selectedProducts.size === 0) {
      return {
        success: false,
        message: '선택된 상품이 없습니다.',
      };
    }

    const cashPayment = this.payment as CashPayment;
    const totalAmount = this.calculateTotalAmount();

    // 투입 금액 확인
    if (cashPayment.amount < totalAmount) {
      this.error = VendingMachineError.INSUFFICIENT_PAYMENT;
      return {
        success: false,
        message: '투입 금액이 부족합니다.',
        error: this.error,
        data: {
          insertedAmount: cashPayment.amount,
          requiredAmount: totalAmount,
          remaining: totalAmount - cashPayment.amount,
        },
      };
    }

    this.state = VendingMachineState.PAYMENT_PROCESSING;
    cashPayment.status = PaymentStatus.PROCESSING;

    // 거스름돈 계산
    const changeAmount = cashPayment.amount - totalAmount;

    if (changeAmount > 0) {
      const change = this.calculateChange(changeAmount);

      if (!change) {
        this.error = VendingMachineError.CANNOT_MAKE_CHANGE;
        this.state = VendingMachineState.ERROR;

        // 현금 반환 처리: 투입한 현금 모두 돌려주기
        const cashPayment = this.payment as CashPayment;
        if (cashPayment.insertedCash) {
          cashPayment.insertedCash.forEach((count, type) => {
            const cashType = type as CashType;
            this.userCash[cashType] += count;
          });
        }

        // 5초 후 초기화
        setTimeout(() => {
          this.resetState();
        }, 5000);

        return {
          success: false,
          message: '거스름돈 부족. 문의 1588-2222. 5초 후 상태가 초기화 됩니다.',
          error: this.error,
          data: {
            refundedAmount: cashPayment.amount,
            refundedCash: cashPayment.insertedCash,
            userCash: this.userCash,
          },
        };
      }

      cashPayment.change = change;
    }

    // 결제된 현금을 자판기 금고에 추가
    cashPayment.insertedCash.forEach((count, type) => {
      const currentCount = this.cashReserve.get(type) || 0;
      this.cashReserve.set(type, currentCount + count);
    });

    // 거스름돈을 금고에서 제거하고 사용자 현금 증가
    if (cashPayment.change) {
      cashPayment.change.forEach((count, type) => {
        const currentCount = this.cashReserve.get(type) || 0;
        this.cashReserve.set(type, currentCount - count);

        // 사용자에게 거스름돈 지급 (현금 증가)
        const cashType = type as CashType;
        this.userCash[cashType] += count;
      });
    }

    cashPayment.status = PaymentStatus.SUCCESS;

    return this.completeTransaction();
  }

  /**
   * 거스름돈 계산
   * 가능한 큰 단위부터 사용하여 계산
   */
  private calculateChange(changeAmount: number): Map<CashType, number> | null {
    console.log(`거스름돈 계산: ${changeAmount}원`);

    const change = new Map<CashType, number>();
    let remaining = changeAmount;

    // 금고 현황 로그
    console.log('금고 현황:');
    this.cashReserve.forEach((count, type) => {
      console.log(`${type}원: ${count}개`);
    });

    // 큰 단위부터 처리
    const denominations = [
      CashType.BILL_10000,
      CashType.BILL_5000,
      CashType.BILL_1000,
      CashType.COIN_500,
      CashType.COIN_100,
    ];

    for (const denom of denominations) {
      if (remaining >= denom) {
        const needed = Math.floor(remaining / denom);
        const available = this.cashReserve.get(denom) || 0;

        console.log(`${denom}원: 필요 ${needed}개, 가능 ${available}개`);

        const count = Math.min(needed, available);

        if (count > 0) {
          change.set(denom, count);
          remaining -= denom * count;
          console.log(`${denom}원: ${count}개 사용, 남은 금액: ${remaining}원`);
        }
      }
    }

    // 남은 금액이 있으면 거스름돈을 만들 수 없음
    if (remaining > 0) {
      console.log(`거스름돈 부족! 남은 금액: ${remaining}원`);
      return null;
    }

    console.log('거스름돈 계산 성공!');
    return change;
  }

  /**
   * 트랜잭션 완료 (상품 배출 및 재고 감소)
   */
  private completeTransaction(): VendingMachineResult {
    console.log('트랜잭션 완료');

    if (!this.selectedProducts || this.selectedProducts.size === 0) {
      return {
        success: false,
        message: '선택된 상품이 없습니다.',
      };
    }

    // 상품 배출 (재고 감소)
    this.state = VendingMachineState.DISPENSING;

    // 모든 선택된 상품의 재고 감소
    let dispensedProducts: { product: StockedProduct; quantity: number }[] = [];
    let error = false;

    this.selectedProducts.forEach((selectedItem, productId) => {
      // 제품 인덱스 찾기
      const productIndex = this.products.findIndex((p) => p.id === productId);

      if (productIndex !== -1) {
        // 재고 감소
        const product = this.products[productIndex];

        // 재고가 충분한지 확인
        if (product.stock >= selectedItem.quantity) {
          product.stock -= selectedItem.quantity;
          dispensedProducts.push({
            product: { ...product },
            quantity: selectedItem.quantity,
          });
        } else {
          error = true;
        }
      } else {
        error = true;
      }
    });

    if (error) {
      this.error = VendingMachineError.DISPENSING_ERROR;
      this.state = VendingMachineState.ERROR;

      return {
        success: false,
        message: '상품 배출 중 오류가 발생했습니다.',
        error: this.error,
      };
    }

    // 트랜잭션 결과 생성
    const result = {
      success: true,
      message: '5초 후 초기 상태로 돌아갑니다.',
      data: {
        products: dispensedProducts,
        payment: this.payment,
        totalAmount: this.calculateTotalAmount(),
      },
    };

    // 5초 후 상태 초기화
    setTimeout(() => {
      this.resetState();
    }, 5000);

    return result;
  }

  /**
   * 취소 처리
   */
  cancel(): VendingMachineResult {
    console.log('자판기 작업 취소');

    if (this.state === VendingMachineState.IDLE) {
      return {
        success: false,
        message: '취소할 작업이 없습니다.',
      };
    }

    // 현금 반환
    let refundData = null;

    if (this.payment && this.payment.method === 'CASH') {
      const cashPayment = this.payment as CashPayment;
      if (cashPayment.amount > 0) {
        // 사용자에게 현금 반환
        cashPayment.insertedCash.forEach((count, type) => {
          const cashType = type as CashType;
          this.userCash[cashType] += count;
        });

        refundData = {
          refundedAmount: cashPayment.amount,
          refundedCash: cashPayment.insertedCash,
          userCash: this.userCash,
        };
      }
    }

    // 상태 초기화
    this.resetState();

    return {
      success: true,
      message: '작업이 취소되었습니다.',
      data: refundData,
    };
  }

  /**
   * 상태 초기화
   */
  private resetState(): void {
    console.log('자판기 상태 초기화');

    this.selectedProducts.clear();
    this.payment = null;
    this.error = null;
    this.state = VendingMachineState.IDLE;
  }

  /**
   * 현재 재고 조회
   */
  getInventory(): StockedProduct[] {
    return [...this.products];
  }

  /**
   * 사용자 현금 조회
   */
  getUserCash(): UserCashHoldings {
    return { ...this.userCash };
  }

  /**
   * 카드 한도 조회
   */
  getCardLimit(): number {
    return this.cardLimit;
  }

  /**
   * 금고 현금 조회
   */
  getCashReserve(): Map<CashType, number> {
    return new Map(this.cashReserve);
  }
}

export default VendingMachineService;
