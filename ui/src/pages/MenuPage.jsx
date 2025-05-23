import { useState, useEffect } from 'react'
import '../styles/MenuPage.css'

// 이미지 import
import americanoImg from '../assets/images/americano.jpg'
import icedAmericanoImg from '../assets/images/iced-americano.jpg'
import latteImg from '../assets/images/latte.jpg'

const API_BASE_URL = 'http://localhost:3000/api';

const MenuPage = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [selectedQuantities, setSelectedQuantities] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 메뉴 데이터 가져오기
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/menu`);
        if (!response.ok) {
          throw new Error('메뉴를 불러오는데 실패했습니다.');
        }
        const data = await response.json();
        // 이미지 경로 추가
        const menuWithImages = data.map(item => ({
          ...item,
          image: item.name === '아메리카노' ? americanoImg :
                 item.name === '아이스 아메리카노' ? icedAmericanoImg :
                 latteImg
        }));
        setMenuItems(menuWithImages);
        // 메뉴 로딩 후 각 아이템의 기본 수량을 1로 설정
        const initialQuantities = {};
        data.forEach(item => {
          initialQuantities[item.id] = 1;
        });
        setSelectedQuantities(initialQuantities);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenu();
  }, []);

  const options = {
    shot: { name: '샷 추가', price: 500 },
    syrup: { name: '시럽 추가', price: 300 }
  }

  const handleOptionChange = (menuId, optionType, checked) => {
    setSelectedOptions(prev => ({
      ...prev,
      [menuId]: {
        ...prev[menuId],
        [optionType]: checked
      }
    }))
  }

  // 수량 변경 핸들러
  const handleQuantityChange = (menuId, delta) => {
    const currentItem = menuItems.find(item => item.id === menuId);
    if (!currentItem) return;

    setSelectedQuantities(prev => {
      const currentQuantity = prev[menuId] || 1;
      const newQuantity = currentQuantity + delta;
      // 최소 수량은 1, 최대 수량은 현재 아이템의 재고(stock)
      return {
        ...prev,
        [menuId]: Math.max(1, Math.min(newQuantity, currentItem.stock))
      };
    });
  };

  const addToCart = async (item) => {
    const quantity = selectedQuantities[item.id] || 1;

    if (quantity > item.stock) {
      alert(`${item.name}의 현재 재고(${item.stock}개)를 초과하여 담을 수 없습니다.`);
      setSelectedQuantities(prev => ({
        ...prev,
        [item.id]: item.stock 
      }));
      return;
    }

    const menuOptions = selectedOptions[item.id] || {};
    
    try {
      const response = await fetch(`${API_BASE_URL}/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          menuId: item.id,
          quantity: quantity, 
          options: menuOptions
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '장바구니 추가 중 서버 오류가 발생했습니다.' }));
        alert(errorData.message || '장바구니에 추가하는데 실패했습니다.');
        return;
      }

      const newCartItem = await response.json();
      const existingCartItemIndex = cart.findIndex(
        cItem => cItem.menuId === newCartItem.menuId && 
                 JSON.stringify(cItem.options) === JSON.stringify(newCartItem.options)
      );

      if (existingCartItemIndex > -1) {
        const updatedCart = cart.map((cItem, index) => 
          index === existingCartItemIndex ? { ...cItem, quantity: newCartItem.quantity, totalPrice: newCartItem.totalPrice } : cItem
        );
        setCart(updatedCart);
      } else {
        setCart(prevCart => [...prevCart, newCartItem]);
      }

      // 장바구니에 담은 후 해당 아이템의 수량 선택을 1로 초기화
      setSelectedQuantities(prevQuantities => ({
        ...prevQuantities,
        [item.id]: 1 
      }));
      // (선택 사항) 해당 아이템의 선택된 옵션도 초기화하려면 아래 주석 해제
      // setSelectedOptions(prevOptions => ({
      //   ...prevOptions,
      //   [item.id]: {}
      // }));

    } catch (err) {
      alert(err.message);
    }
  };

  // 장바구니에서 아이템 삭제 핸들러
  const removeFromCart = async (cartItemId, serverCartId) => { // serverCartId는 서버 API와 연동 시 사용
    // 클라이언트 측 장바구니 업데이트
    setCart(prevCart => prevCart.filter(item => item.id !== cartItemId));

    // 서버 측 장바구니 아이템 삭제 API 호출 (선택적, 현재 MenuPage의 cart는 클라이언트 상태에 더 의존적)
    // 실제 서버 ID (e.g., newCartItem.id from POST /api/cart)를 사용해야 함
    // 아래는 예시이며, 실제 서버 응답의 cart 아이템 ID를 사용해야 합니다.
    if (serverCartId) { // 여기서 serverCartId는 POST /api/cart 응답에서 받은 id여야 합니다.
        try {
            const response = await fetch(`${API_BASE_URL}/cart/${serverCartId}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                // 실패 시 사용자에게 알리거나, 롤백 로직 고려
                console.error('서버에서 장바구니 아이템 삭제 실패');
            }
        } catch (error) {
            console.error('장바구니 아이템 삭제 API 호출 중 오류:', error);
        }
    }
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.totalPrice, 0);
  }

  const handleOrder = async () => {
    if (cart.length === 0) {
      alert('장바구니가 비어있습니다.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cart,
          totalAmount: getTotalPrice()
        })
      });

      if (!response.ok) {
        throw new Error('주문 처리에 실패했습니다.');
      }

      const order = await response.json();
      alert('주문이 완료되었습니다!');
      setCart([]);
    } catch (err) {
      alert(err.message);
    }
  }

  const getOptionText = (options) => {
    const optionTexts = [];
    if (options?.shot) optionTexts.push('샷 추가');
    if (options?.syrup) optionTexts.push('시럽 추가');
    return optionTexts.length > 0 ? `(${optionTexts.join(', ')})` : '';
  }

  if (isLoading) return <div>로딩 중...</div>;
  if (error) return <div>에러: {error}</div>;

  return (
    <div className="menu-page">
      <h1>커피 메뉴</h1>
      <div className="menu-grid">
        {menuItems.map((item) => (
          <div key={item.id} className={`menu-item ${item.stock === 0 ? 'sold-out' : ''}`}>
            <div className="menu-item-image">
              <img src={item.image} alt={item.name} />
            </div>
            <h3>{item.name}</h3>
            <p>{item.price.toLocaleString()}원</p>
            {item.stock === 0 ? (
              <p className="sold-out-text">Sold Out</p>
            ) : (
              <>
                <div className="menu-options">
                  <label className="option-label">
                    <input
                      type="checkbox"
                      checked={selectedOptions[item.id]?.shot || false}
                      onChange={(e) => handleOptionChange(item.id, 'shot', e.target.checked)}
                    />
                    {options.shot.name} (+{options.shot.price.toLocaleString()}원)
                  </label>
                  <label className="option-label">
                    <input
                      type="checkbox"
                      checked={selectedOptions[item.id]?.syrup || false}
                      onChange={(e) => handleOptionChange(item.id, 'syrup', e.target.checked)}
                    />
                    {options.syrup.name} (+{options.syrup.price.toLocaleString()}원)
                  </label>
                </div>
                <div className="quantity-selector">
                  <button onClick={() => handleQuantityChange(item.id, -1)}>-</button>
                  <span>{selectedQuantities[item.id] || 1}</span>
                  <button onClick={() => handleQuantityChange(item.id, 1)}>+</button>
                </div>
                <button onClick={() => addToCart(item)} disabled={item.stock === 0}>
                  {item.stock === 0 ? 'Sold Out' : '담기'}
                </button>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="cart-summary">
        <h2>주문 내역</h2>
        <div className="cart-items">
          {cart.map((cartItemData) => (
            <div key={cartItemData.id} className="cart-item">
              <span>
                {cartItemData.name} {getOptionText(cartItemData.options)} x {cartItemData.quantity}
              </span>
              <div className="cart-item-controls">
                <span>
                  {cartItemData.totalPrice.toLocaleString()}원
                </span>
                <button 
                  onClick={() => removeFromCart(cartItemData.id, cartItemData.id)}
                  className="remove-cart-item-button"
                >
                  X
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="cart-total">
          <strong>총 금액: {getTotalPrice().toLocaleString()}원</strong>
        </div>
        <button className="order-button" onClick={handleOrder}>주문하기</button>
      </div>
    </div>
  )
}

export default MenuPage 