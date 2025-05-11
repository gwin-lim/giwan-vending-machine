import React from 'react';
import type { StockedProduct } from '../models/Product';
import { VendingMachineState } from '../models/VendingMachine';
import type { VendingMachineResult, SelectedProductItem } from '../models/VendingMachine';
import '../styles/DisplayPanel.css';

interface DisplayPanelProps {
  message: string;
  machineState: VendingMachineState;
  selectedProducts: SelectedProductItem[];
  totalAmount: number;
  insertedAmount: number;
  transactionResult: VendingMachineResult | null;
}

const DisplayPanel: React.FC<DisplayPanelProps> = ({
  message,
  machineState,
  selectedProducts,
  totalAmount,
  insertedAmount,
  transactionResult,
}) => {
  // 현재 상태에 따른 스타일 결정
  const getStatusClass = () => {
    switch (machineState) {
      case VendingMachineState.ERROR:
        return 'status-error';
      case VendingMachineState.DISPENSING:
        return 'status-success';
      default:
        return '';
    }
  };

  // 상태 표시 텍스트
  const getStatusText = () => {
    switch (machineState) {
      case VendingMachineState.IDLE:
        return '대기 중';
      case VendingMachineState.PRODUCT_SELECTED:
        return '상품 선택됨';
      case VendingMachineState.PAYMENT_PENDING:
        return '결제 대기 중';
      case VendingMachineState.PAYMENT_PROCESSING:
        return '결제 처리 중';
      case VendingMachineState.DISPENSING:
        return '상품 배출 중';
      case VendingMachineState.ERROR:
        return '오류 발생';
      default:
        return '';
    }
  };

  return (
    <div className="display-panel">
      <div className={`display-screen ${getStatusClass()}`}>
        <div className="display-status">
          <span className="status-label">상태:</span>
          <span className="status-value">{getStatusText()}</span>
        </div>

        {selectedProducts.length > 0 && (
          <div className="selected-products">
            <div className="selected-products-header">
              <span className="selected-product-label">상품</span>
              <span>수량</span>
              <span className="total-amount">{totalAmount.toLocaleString()}원</span>
            </div>
            <div className="selected-products-list">
              {selectedProducts.map((item) => (
                <div
                  key={item.product.id}
                  className="selected-product-item"
                >
                  <span className="selected-product-name">{item.product.name}</span>
                  <span className="selected-product-quantity">{item.quantity}개</span>
                  <span className="selected-product-price">
                    {(item.product.price * item.quantity).toLocaleString()}원
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {machineState === VendingMachineState.PAYMENT_PENDING && (
          <div className="payment-info">
            <div className="required-amount">
              <span>필요 금액:</span>
              <span>{totalAmount}원</span>
            </div>
            {insertedAmount > 0 && (
              <>
                <div className="inserted-amount">
                  <span>투입 금액:</span>
                  <span>{insertedAmount}원</span>
                </div>
                <div className="remaining-amount">
                  <span>남은 금액:</span>
                  <span>
                    {insertedAmount < totalAmount ? `${totalAmount - insertedAmount}원` : '0원'}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {machineState === VendingMachineState.DISPENSING && transactionResult?.success && (
          <div className="transaction-success">
            <div className="success-animation">✓</div>
            <div>상품이 배출되었습니다!</div>

            {/* 배출된 상품 목록 표시 */}
            {transactionResult.data && transactionResult.data.products && (
              <div className="dispensed-products">
                <div className="dispensed-products-header">배출된 상품:</div>
                <div className="dispensed-products-list">
                  {transactionResult.data.products.map(
                    (item: { product: StockedProduct; quantity: number }, index: number) => (
                      <div
                        key={index}
                        className="dispensed-product-item"
                      >
                        <span>{item.product.name}</span>
                        <span>{item.quantity}개</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* 거스름돈 정보 표시 */}
            {transactionResult.data &&
              transactionResult.data.payment &&
              transactionResult.data.payment.method === 'CASH' &&
              transactionResult.data.payment.change && (
                <div className="change-info">
                  <div className="change-title">거스름돈 내역:</div>
                  <div className="change-list">
                    {Array.from(
                      transactionResult.data.payment.change.entries() as Iterable<
                        [number, number]
                      >
                    ).map(([type, count]) => (
                      <div
                        key={type}
                        className="change-item"
                      >
                        <span className="change-type">{type}원</span>
                        <span className="change-count">{count}개</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}

        <div className="display-message">{message}</div>
      </div>
    </div>
  );
};

export default DisplayPanel;
