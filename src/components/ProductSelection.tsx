import React from 'react';
import type { StockedProduct } from '../models/Product';
import type { SelectedProductItem } from '../models/VendingMachine';
import '../styles/ProductSelection.css';

interface ProductSelectionProps {
  products: StockedProduct[];
  selectedProducts: SelectedProductItem[];
  onSelectProduct: (productId: string) => void;
  onQuantityChange: (productId: string, quantityChange: number) => void;
  disabled: boolean;
}

const ProductSelection: React.FC<ProductSelectionProps> = ({
  products,
  selectedProducts,
  onSelectProduct,
  onQuantityChange,
  disabled,
}) => {
  // 상품 클릭 시 처리
  const handleProductClick = (productId: string) => {
    console.log('상품 클릭 이벤트', { productId });
    if (!disabled) {
      onSelectProduct(productId);
    }
  };

  // 현재 선택된 상품의 수량 찾기
  const getSelectedQuantity = (productId: string): number => {
    const selectedItem = selectedProducts.find((item) => item.product.id === productId);
    return selectedItem ? selectedItem.quantity : 0;
  };

  // 수량 증가 처리
  const handleIncreaseQuantity = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onQuantityChange(productId, 1);
    }
  };

  // 수량 감소 처리
  const handleDecreaseQuantity = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onQuantityChange(productId, -1);
    }
  };

  return (
    <div className="product-selection">
      <h2>음료 선택</h2>
      <div className="product-grid">
        {products.map((product) => {
          const quantity = getSelectedQuantity(product.id);
          const isSelected = quantity > 0;

          return (
            <button
              key={product.id}
              className={`product-item ${product.stock <= 0 ? 'sold-out' : ''} ${
                disabled ? 'disabled' : ''
              } ${isSelected ? 'selected' : ''}`}
              onClick={() => product.stock > 0 && handleProductClick(product.id)}
            >
              <div className="product-image">
                {/* 실제 이미지는 생략 */}
                <div className="product-icon">{product.name.charAt(0)}</div>
              </div>
              <div className="product-info">
                <div className="product-name">{product.name}</div>
                <div className="product-price">{product.price.toLocaleString()}원</div>
                <div className="product-stock">
                  재고: {product.stock > 0 ? product.stock : '품절'}
                </div>

                {/* 선택된 상품이고 수량이 조절 가능한 상태일 때 버튼 표시 */}
                {!disabled || isSelected ? (
                  <div className="quantity-controls">
                    <button
                      className="quantity-btn decrease"
                      onClick={(e) => handleDecreaseQuantity(product.id, e)}
                      disabled={disabled || quantity <= 0}
                    >
                      -
                    </button>
                    <span className="quantity-display">{quantity}</span>
                    <button
                      className="quantity-btn increase"
                      onClick={(e) => handleIncreaseQuantity(product.id, e)}
                      disabled={disabled || quantity >= product.stock}
                    >
                      +
                    </button>
                  </div>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProductSelection;
