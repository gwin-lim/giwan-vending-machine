import React, { useState, useEffect } from 'react';
import { CashType, CASH_OPTIONS } from '../models/Payment';
import type { PaymentMethod, UserCashHoldings } from '../models/Payment';
import { VendingMachineState } from '../models/VendingMachine';
import type { SelectedProductItem } from '../models/VendingMachine';
import '../styles/PaymentPanel.css';

interface PaymentPanelProps {
  machineState: VendingMachineState;
  selectedProducts: SelectedProductItem[];
  totalAmount: number;
  selectedPaymentMethod: PaymentMethod | null;
  insertedAmount: number;
  userCash: UserCashHoldings;
  cardLimit: number;
  onSelectPaymentMethod: (method: PaymentMethod) => void;
  onCashInsert: (cashType: CashType) => void;
  onCashConfirm: () => void;
  onCardPayment: (cardNumber: string) => void;
  onCancel: () => void;
}

const PaymentPanel: React.FC<PaymentPanelProps> = ({
  machineState,
  selectedProducts,
  totalAmount,
  selectedPaymentMethod,
  insertedAmount,
  userCash,
  onSelectPaymentMethod,
  onCashInsert,
  onCashConfirm,
  onCardPayment,
  onCancel,
}) => {
  const [cardNumber, setCardNumber] = useState<string>('');
  const [isProcessingCard, setIsProcessingCard] = useState<boolean>(false);

  // 상태 변경 디버깅을 위한 useEffect
  useEffect(() => {
    console.log('PaymentPanel 상태 변경:', {
      machineState,
      selectedProductsCount: selectedProducts.length,
      selectedPaymentMethod,
    });
  }, [machineState, selectedProducts, selectedPaymentMethod]);

  // 카드 번호 입력 처리
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('카드 번호 입력 이벤트');

    const input = e.target.value.replace(/[^0-9]/g, '');

    if (input.length <= 16) {
      setCardNumber(input);
    }
  };

  // 카드 번호 형식화 (XXXX-XXXX-XXXX-XXXX)
  const formatCardNumber = (number: string) => {
    const groups = [];
    for (let i = 0; i < number.length; i += 4) {
      groups.push(number.substring(i, i + 4));
    }
    return groups.join('-');
  };

  // 카드 결제 처리
  const handleCardSubmit = (e: React.FormEvent) => {
    console.log('카드 결제 제출 이벤트 시작', {
      카드번호: cardNumber,
      '처리중 상태': isProcessingCard,
      머신상태: machineState,
      결제방법: selectedPaymentMethod,
    });

    e.preventDefault();

    // 카드 번호가 유효한지 확인
    if (cardNumber.length === 16) {
      setIsProcessingCard(true);
      console.log('카드 처리 시작 - 1.5초 후 처리');

      // 카드 처리 시뮬레이션
      setTimeout(() => {
        console.log('카드 결제 처리 시작:', cardNumber);
        try {
          // 카드 결제 처리 전달
          onCardPayment(cardNumber);
          console.log('카드 결제 처리 완료');
        } catch (error) {
          console.error('카드 결제 처리 오류:', error);
        } finally {
          setIsProcessingCard(false);
          setCardNumber('');
        }
      }, 1500);
    }
  };

  // 결제 방법 선택 UI
  const renderPaymentMethodSelection = () => {
    return (
      <div className="payment-method-selection">
        <h3>결제 방법 선택</h3>
        <div className="payment-methods">
          <button
            className="payment-method-btn cash-btn"
            onClick={() => onSelectPaymentMethod('CASH')}
          >
            현금 결제
          </button>
          <button
            className="payment-method-btn card-btn"
            onClick={() => onSelectPaymentMethod('CARD')}
          >
            카드 결제
          </button>
        </div>
      </div>
    );
  };

  // 현금 결제 UI
  const renderCashPayment = () => {
    return (
      <div className="cash-payment">
        <h3>현금 투입</h3>
        <div className="cash-options">
          {CASH_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`cash-option-btn ${userCash[option.type] <= 0 ? 'disabled' : ''}`}
              onClick={() => onCashInsert(option.type)}
              disabled={userCash[option.type] <= 0}
            >
              {option.label}
              <span className="cash-count-badge">{userCash[option.type]}</span>
            </button>
          ))}
        </div>
        <div className="payment-actions">
          <div className="payment-amount">
            <span>투입 금액:</span>
            <span className="amount-value">{insertedAmount}원</span>
          </div>
          <div className="payment-required">
            <span>필요 금액:</span>
            <span className="amount-value">{totalAmount}원</span>
          </div>
          <button
            className="confirm-btn"
            disabled={selectedProducts.length === 0 || insertedAmount < totalAmount}
            onClick={onCashConfirm}
          >
            결제 확인
          </button>
        </div>
      </div>
    );
  };

  // 카드 결제 UI
  const renderCardPayment = () => {
    // 카드 결제 시에는 금액만 표시하고 한도는 결제 시점에 체크

    return (
      <div className="card-payment">
        <h3>카드 결제</h3>
        <div className="card-limit-info">
          <div className="purchase-amount">
            <span>구매 금액:</span>
            <span className="purchase-amount-value">{totalAmount.toLocaleString()}원</span>
          </div>
        </div>
        <form onSubmit={handleCardSubmit}>
          <div className="form-group">
            <label htmlFor="cardNumber">카드 번호</label>
            <input
              type="text"
              id="cardNumber"
              value={formatCardNumber(cardNumber)}
              onChange={handleCardNumberChange}
              placeholder="1111-2222-3333-4444"
              disabled={isProcessingCard}
              required
            />
          </div>
          <button
            type="submit"
            className="confirm-btn"
            disabled={cardNumber.length !== 16 || isProcessingCard}
          >
            {isProcessingCard ? '처리 중...' : '결제 하기'}
          </button>
        </form>
      </div>
    );
  };

  return (
    <>
      {machineState !== VendingMachineState.IDLE &&
        machineState !== VendingMachineState.DISPENSING && (
          <div className="payment-panel">
            {/* 상품이 선택되었고 결제 대기 상태가 아닐 때 결제 방법 선택 UI 표시 */}
            {selectedProducts.length > 0 &&
              machineState === VendingMachineState.PRODUCT_SELECTED &&
              renderPaymentMethodSelection()}

            {/* 결제 대기 상태일 때 선택된 결제 방법에 맞는 UI 표시 */}
            {machineState === VendingMachineState.PAYMENT_PENDING && (
              <>
                {selectedPaymentMethod === 'CASH' && renderCashPayment()}
                {selectedPaymentMethod === 'CARD' && renderCardPayment()}
              </>
            )}

            {/* 오류 상태일 때는 메시지만 표시하고 취소 버튼은 표시하지 않음 */}
            {machineState === VendingMachineState.ERROR && (
              <div className="error-message">
                <p>오류가 발생했습니다.</p>
                <p>5초 후 초기 상태로 돌아갑니다.</p>
              </div>
            )}

            {/* 취소 버튼 (오류 상태가 아닐 때만 표시) */}
            {machineState !== VendingMachineState.ERROR && (
              <button
                className="cancel-btn"
                onClick={onCancel}
              >
                취소
              </button>
            )}
          </div>
        )}
    </>
  );
};

export default PaymentPanel;
