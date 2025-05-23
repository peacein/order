import React, { useState, useEffect } from 'react';
import '../styles/AdminPage.css'; // 어드민 페이지용 CSS (나중에 생성)

const API_BASE_URL = 'http://localhost:3000/api';

// 유틸리티 함수들 (OrderHistoryPage에서 가져옴)
const getStatusText = (status) => {
  switch (status) {
    case 'pending': return '주문 대기';
    case 'preparing': return '준비 중';
    case 'completed': return '완료';
    case 'cancelled': return '취소됨';
    default: return status;
  }
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
};

const AdminPage = () => {
  // 재고 관리 관련 상태
  const [menuItems, setMenuItems] = useState([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [errorMenu, setErrorMenu] = useState(null);
  const [editStockMode, setEditStockMode] = useState({});

  // 주문 내역 관련 상태
  const [orders, setOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [errorOrders, setErrorOrders] = useState(null);

  // 메뉴 데이터 및 주문 데이터 가져오기
  useEffect(() => {
    const fetchAdminData = async () => {
      // 메뉴 데이터 가져오기
      setIsLoadingMenu(true);
      try {
        const menuResponse = await fetch(`${API_BASE_URL}/menu`);
        if (!menuResponse.ok) throw new Error('메뉴 목록을 불러오는데 실패했습니다.');
        const menuData = await menuResponse.json();
        setMenuItems(menuData);
        const initialEditStock = {};
        menuData.forEach(item => { initialEditStock[item.id] = item.stock; });
        setEditStockMode(initialEditStock);
      } catch (err) {
        setErrorMenu(err.message);
      } finally {
        setIsLoadingMenu(false);
      }

      // 주문 데이터 가져오기
      setIsLoadingOrders(true);
      try {
        const ordersResponse = await fetch(`${API_BASE_URL}/orders`);
        if (!ordersResponse.ok) throw new Error('주문 내역을 불러오는데 실패했습니다.');
        const ordersData = await ordersResponse.json();
        setOrders(ordersData);
      } catch (err) {
        setErrorOrders(err.message);
      } finally {
        setIsLoadingOrders(false);
      }
    };
    fetchAdminData();
  }, []);

  const handleStockChange = (menuId, value) => {
    const newStock = parseInt(value, 10);
    setEditStockMode(prev => ({ ...prev, [menuId]: isNaN(newStock) ? 0 : newStock }));
  };

  const handleStockUpdate = async (menuId) => {
    const newStock = editStockMode[menuId];
    if (newStock === undefined || newStock < 0) {
      alert('유효한 재고 수량을 입력하세요.');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/admin/menu/${menuId}/stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock })
      });
      if (!response.ok) {
        let errorMessage = '재고 업데이트에 실패했습니다.';
        try { const errorData = await response.json(); errorMessage = errorData.message || errorMessage; }
        catch (jsonError) { const textResponse = await response.text(); console.error('Server returned non-JSON error response:', textResponse); errorMessage = `서버 오류 (${response.status}). 콘솔 확인`; }
        throw new Error(errorMessage);
      }
      const result = await response.json();
      alert(result.message);
      setMenuItems(prevItems => prevItems.map(item => item.id === menuId ? { ...item, stock: newStock } : item));
      setEditStockMode(prevEditStock => ({ ...prevEditStock, [menuId]: newStock }));
    } catch (err) { alert(`오류: ${err.message}`); }
  };
  
  // 주문 상태 변경 핸들러 (추가)
  const handleOrderStatusChange = async (orderId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '주문 상태 변경 중 서버 오류 발생'}));
        throw new Error(errorData.message || '주문 상태 변경 실패');
      }
      const updatedOrder = await response.json();
      setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? updatedOrder : o));
      alert(`주문번호 ${orderId}의 상태가 ${getStatusText(newStatus)}(으)로 변경되었습니다.`);
    } catch (err) {
      alert(`오류: ${err.message}`);
    }
  };

  return (
    <div className="admin-page">
      <h1>관리자 페이지</h1>
      
      <section className="admin-section">
        <h2>메뉴 재고 관리</h2>
        {isLoadingMenu && <div>메뉴 목록 로딩 중...</div>}
        {errorMenu && <div className="error-message">메뉴 목록 로딩 오류: {errorMenu}</div>}
        {!isLoadingMenu && !errorMenu && (
          <table>
            <thead>
              <tr><th>ID</th><th>메뉴명</th><th>현재 재고</th><th>새 재고 입력</th><th>작업</th></tr>
            </thead>
            <tbody>
              {menuItems.map(item => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.name}</td>
                  <td>{item.stock}</td>
                  <td><input type="number" value={editStockMode[item.id] || 0} onChange={(e) => handleStockChange(item.id, e.target.value)} min="0"/></td>
                  <td><button onClick={() => handleStockUpdate(item.id)}>재고 업데이트</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="admin-section">
        <h2>주문 내역 관리</h2>
        {isLoadingOrders && <div>주문 내역 로딩 중...</div>}
        {errorOrders && <div className="error-message">주문 내역 로딩 오류: {errorOrders}</div>}
        {!isLoadingOrders && !errorOrders && orders.length === 0 && <p>주문 내역이 없습니다.</p>}
        {!isLoadingOrders && !errorOrders && orders.length > 0 && (
          <div className="orders-list-admin"> {/* OrderHistoryPage.css의 스타일과 충돌 피하기 위해 클래스명 변경 고려 */}
            {orders.sort((a, b) => b.id - a.id).map((order) => ( // 최신 주문이 위로 오도록 정렬
              <div key={order.id} className="order-card-admin">
                <div className="order-header">
                  <span className="order-id">주문번호: {order.id}</span>
                  <span className="order-date">{formatDate(order.createdAt)}</span>
                  <span className={`order-status ${order.status}`}>{getStatusText(order.status)}</span>
                </div>
                <div className="order-items">
                  {order.items.map((item, index) => (
                    <div key={index} className="order-item">
                      <span className="item-name">
                        {item.name}
                        {item.options?.shot && ' (샷 추가)'}
                        {item.options?.syrup && ' (시럽 추가)'}
                        x {item.quantity}
                      </span>
                      <span className="item-price">{item.totalPrice.toLocaleString()}원</span>
                    </div>
                  ))}
                </div>
                <div className="order-total"><strong>총 금액: {order.totalAmount.toLocaleString()}원</strong></div>
                <div className="order-actions-admin">
                  <span>상태 변경: </span>
                  <select 
                    value={order.status} 
                    onChange={(e) => handleOrderStatusChange(order.id, e.target.value)}
                  >
                    <option value="pending">주문 대기</option>
                    <option value="preparing">준비 중</option>
                    <option value="completed">완료</option>
                    <option value="cancelled">취소됨</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminPage; 