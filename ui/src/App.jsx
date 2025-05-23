import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import MenuPage from './pages/MenuPage';
// import OrderHistoryPage from './pages/OrderHistoryPage'; // 삭제
import AdminPage from './pages/AdminPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="nav">
          <Link to="/" className="nav-link">메뉴</Link>
          {/* <Link to="/orders" className="nav-link">주문 내역</Link> */}{/* 삭제 */}
          <Link to="/admin" className="nav-link">관리자</Link>
        </nav>
        <Routes>
          <Route path="/" element={<MenuPage />} />
          {/* <Route path="/orders" element={<OrderHistoryPage />} /> */}{/* 삭제 */}
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
