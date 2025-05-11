import React, { useState, useEffect } from 'react';
import '../styles/VendingMachine.css';
import ProductSelection from './ProductSelection';
import PaymentPanel from './PaymentPanel';
import DisplayPanel from './DisplayPanel';
import VendingMachineService from '../services/VendingMachineService';
import { DEFAULT_PRODUCTS } from '../models/Product';
import { CashType, CASH_OPTIONS } from '../models/Payment';
import type { PaymentMethod, UserCashHoldings } from '../models/Payment';
import { VendingMachineState, VendingMachineError } from '../models/VendingMachine';
import type { VendingMachineResult, SelectedProductItem } from '../models/VendingMachine';

const VendingMachine: React.FC = () => {
  // 자판기 서비스 인스턴스 생성 - 클래스 인스턴스이므로 ref 사용
  const vendingServiceRef = React.useRef(new VendingMachineService(DEFAULT_PRODUCTS));
  const vendingService = vendingServiceRef.current;

  // 상태 관리
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [machineState, setMachineState] = useState<VendingMachineState>(
    VendingMachineState.IDLE
  );
  const [selectedProducts, setSelectedProducts] = useState<SelectedProductItem[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(
    null
  );
  const [insertedAmount, setInsertedAmount] = useState<number>(0);
  const [message, setMessage] = useState<string>('음료를 선택해주세요.');
  const [transactionResult, setTransactionResult] = useState<VendingMachineResult | null>(null);
  const [userCash, setUserCash] = useState<UserCashHoldings>(vendingService.getUserCash());
  const [cardLimit, setCardLimit] = useState(vendingService.getCardLimit());
  const [cashReserve, setCashReserve] = useState<Map<CashType, number>>(
    vendingService.getCashReserve()
  );
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [alwaysFailCardPayment, setAlwaysFailCardPayment] = useState<boolean>(false);

  // 재고 및 금고 상태 업데이트
  useEffect(() => {
    setProducts(vendingService.getInventory());
    setCashReserve(vendingService.getCashReserve());
  }, [machineState, vendingService]);

  // 카드 결제 실패 시뮬레이트 상태 변경 추적
  useEffect(() => {
    console.log('체크박스 상태 변경 감지:', {
      alwaysFailCardPayment,
      '변경 시간': new Date().toISOString(),
    });
  }, [alwaysFailCardPayment]);

  // 상품 수량 조절 처리
  const handleProductQuantityChange = (productId: string, quantityChange: number) => {
    console.log('상품 수량 조절 이벤트', { productId, quantityChange });

    const result = vendingService.adjustProductQuantity(productId, quantityChange);
    setMessage(result.message);

    if (result.success && result.data) {
      setSelectedProducts(result.data.selectedProducts);
      // 명시적으로 PRODUCT_SELECTED 상태로 설정
      if (result.data.selectedProducts && result.data.selectedProducts.length > 0) {
        setMachineState(VendingMachineState.PRODUCT_SELECTED);
      } else {
        setMachineState(result.data.state || machineState);
      }
      setTotalAmount(result.data.totalAmount);
    }
  };

  // 상품 선택 처리 (훈문화 메서드, handleProductQuantityChange 사용)
  const handleProductSelect = (productId: string) => {
    console.log('상품 선택 이벤트', { productId });
    handleProductQuantityChange(productId, 1);
  };

  // 결제 방법 선택 처리
  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    console.log('결제 방법 선택 이벤트', { method });

    // 모든 setState 호출을 먼저 실행하고 나서 서비스 메서드를 호출
    setSelectedPaymentMethod(method);
    setMachineState(VendingMachineState.PAYMENT_PENDING);
    setInsertedAmount(0);

    const result = vendingService.selectPaymentMethod(method);
    setMessage(result.message);

    if (result.success && result.data && result.data.totalAmount) {
      setTotalAmount(result.data.totalAmount);
    }

    console.log('결제 방법 선택 완료:', {
      method,
      machineState: VendingMachineState.PAYMENT_PENDING,
      selectedPaymentMethod: method,
    });
  };

  // 현금 투입 처리
  const handleCashInsert = (cashType: CashType) => {
    console.log('현금 투입 이벤트', { cashType });

    const result = vendingService.insertCash(cashType);
    setMessage(result.message);

    if (result.success && result.data) {
      setInsertedAmount(result.data.insertedAmount);
      setUserCash(result.data.userCash); // 사용자 현금 상태 업데이트
    }
  };

  // 현금 결제 확인 처리
  const handleCashPaymentConfirm = () => {
    console.log('현금 결제 확인 이벤트');

    const result = vendingService.confirmCashPayment();
    setMessage(result.message);
    setTransactionResult(result);

    if (result.success) {
      setMachineState(VendingMachineState.DISPENSING);

      // 거스름돈 반환 시 사용자 현금 및 금고 현황 업데이트
      setUserCash(vendingService.getUserCash());
      setCashReserve(vendingService.getCashReserve());

      // 5초 후 상태 리셋
      setTimeout(() => {
        resetVendingMachine();
      }, 5000);
    } else if (result.error === VendingMachineError.CANNOT_MAKE_CHANGE && result.data) {
      // 거스름돈 부족 오류 처리
      setMachineState(VendingMachineState.ERROR); // 상태를 ERROR로 변경
      setUserCash(vendingService.getUserCash());
      // 5초 후 상태 리셋
      setTimeout(() => {
        resetVendingMachine();
      }, 5000);
    }
  };

  // 카드 결제 처리
  const handleCardPayment = (cardNumber: string) => {
    console.log('카드 결제 이벤트 시작:', {
      cardNumber,
      alwaysFailCardPayment,
      '현재 상태': machineState,
      '선택된 결제 방법': selectedPaymentMethod,
    });

    // 결제 상태 리셋 및 초기화
    setMachineState(VendingMachineState.PAYMENT_PENDING);
    // 결제 방법이 선택되지 않았다면 카드 결제로 설정
    if (!selectedPaymentMethod) {
      setSelectedPaymentMethod('CARD');
      // 결제 방법 선택 필요시 서비스에도 알림
      vendingService.selectPaymentMethod('CARD');
    }

    console.log('카드 결제 실패 강제 옵션:', alwaysFailCardPayment ? '활성화됨' : '비활성화됨');
    const result = vendingService.processCardPayment(cardNumber, alwaysFailCardPayment);
    console.log('카드 결제 결과:', result.success ? '성공' : '실패', result.message);
    setMessage(result.message);
    setTransactionResult(result);

    // 카드 한도는 결제 시점에만 확인하고 UI에 공개하지 않음

    if (result.success) {
      setMachineState(VendingMachineState.DISPENSING);
      setCardLimit(vendingService.getCardLimit());

      // 5초 후 상태 리셋
      setTimeout(() => {
        resetVendingMachine();
      }, 5000);
    } else {
      // 카드 결제 실패 처리
      setMachineState(VendingMachineState.ERROR); // ERROR 상태로 변경

      // 5초 후 상태 리셋 (자동으로 초기 상태로 돌아가게 함)
      setTimeout(() => {
        // 서비스 카드 결제 상태 초기화를 위한 취소 호출
        vendingService.cancel();
        resetVendingMachine();
      }, 5000);
    }
  };

  // 취소 처리
  const handleCancel = () => {
    console.log('취소 이벤트');

    const result = vendingService.cancel();
    setMessage(result.message);

    // 현금 반환 시 사용자 현금 및 금고 현황 업데이트
    setUserCash(vendingService.getUserCash());
    setCashReserve(vendingService.getCashReserve());

    resetVendingMachine();
  };

  // 자판기 상태 리셋
  const resetVendingMachine = () => {
    console.log('자판기 상태 리셋');

    // 리셋 순서 중요: machineState를 먼저 변경하면 다른 컴포넌트에서 참조 가능
    setMachineState(VendingMachineState.IDLE);

    // 나머지 상태 초기화
    setSelectedProducts([]);
    setSelectedPaymentMethod(null);
    setInsertedAmount(0);
    setTransactionResult(null);
    setMessage('음료를 선택해주세요.');
    setTotalAmount(0);

    console.log('자판기 상태 리셋 완료 ->', {
      새상태: VendingMachineState.IDLE,
      시간: new Date().toISOString(),
    });
  };

  return (
    <div className="vending-machine">
      <div className="vending-machine-container">
        <div className="vending-machine-left">
          <ProductSelection
            products={products}
            selectedProducts={selectedProducts}
            onSelectProduct={handleProductSelect}
            onQuantityChange={handleProductQuantityChange}
            disabled={
              machineState !== VendingMachineState.IDLE &&
              machineState !== VendingMachineState.PRODUCT_SELECTED
            }
          />
        </div>

        <div className="vending-machine-right">
          <DisplayPanel
            message={message}
            machineState={machineState}
            selectedProducts={selectedProducts}
            totalAmount={totalAmount}
            insertedAmount={insertedAmount}
            transactionResult={transactionResult}
          />

          <PaymentPanel
            machineState={machineState}
            selectedProducts={selectedProducts}
            totalAmount={totalAmount}
            selectedPaymentMethod={selectedPaymentMethod}
            insertedAmount={insertedAmount}
            userCash={userCash}
            cardLimit={0}
            onSelectPaymentMethod={handlePaymentMethodSelect}
            onCashInsert={handleCashInsert}
            onCashConfirm={handleCashPaymentConfirm}
            onCardPayment={handleCardPayment}
            onCancel={handleCancel}
          />
        </div>
        <div className="status-panel">
          <h2>STATUS</h2>
          <div>
            <h3>유저 현금 현황</h3>
            <div className="cash-holdings">
              {CASH_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className="cash-holding-item"
                >
                  <span>{option.label}: </span>
                  <span className="cash-count">{userCash[option.type]}개</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3>유저 카드 한도</h3>
            <div className="card-limits">{cardLimit.toLocaleString()}원</div>
          </div>
          <div>
            <h3>금고 현금 현황</h3>
            <div className="cash-holdings">
              {CASH_OPTIONS.map((option) => {
                const count = cashReserve.get(option.type) || 0;
                return (
                  <div
                    key={option.value}
                    className="cash-holding-item"
                  >
                    <span>{option.label}: </span>
                    <span className="cash-count">{count}개</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="simulation-panel">
        <label>
          <input
            type="checkbox"
            checked={alwaysFailCardPayment}
            onChange={(e) => {
              const newValue = e.target.checked;
              console.log('카드 결제 실패 시뮬레이트 체크박스 변경:', {
                '이전 값': alwaysFailCardPayment,
                '새 값': newValue,
                '변경 시간': new Date().toISOString(),
              });
              setAlwaysFailCardPayment(newValue);
              console.log('체크박스 상태 변경 후:', newValue ? '활성화됨' : '비활성화됨');
            }}
          />
          카드 결제 실패 시뮬레이트
        </label>
        <p>기본적으로 신용 카드는 어떤 번호라도 모두 승인 됩니다.</p>
      </div>
    </div>
  );
};

export default VendingMachine;
