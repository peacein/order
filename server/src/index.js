require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') }); // 프로젝트 루트의 .env 파일 로드

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./models');
const { Menu, Order } = db;

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// React 앱의 정적 파일 제공 (빌드 폴더를 ui/dist로 수정)
// __dirname은 현재 파일(index.js)이 있는 server/src 디렉터리
// React 빌드 폴더가 D:\\order-new\\ui\\build 라고 가정
app.use(express.static(path.join(__dirname, '../../ui/dist')));

// 데이터베이스 초기화 및 초기 데이터 설정
async function initializeDatabase() {
  try {
    await db.sequelize.sync({ force: true });

    // 초기 메뉴 데이터 추가
    await Menu.bulkCreate([
      { name: '아메리카노', price: 2500, image: 'americano.jpg', stock: 10 },
      { name: '아이스 아메리카노', price: 3000, image: 'iced-americano.jpg', stock: 10 },
      { name: '카페라떼', price: 3500, image: 'latte.jpg', stock: 10 }
    ]);

    console.log('데이터베이스가 초기화되었습니다.');
  } catch (error) {
    console.error('데이터베이스 초기화 중 오류 발생:', error);
  }
}

initializeDatabase();

// 메뉴 API
app.get('/api/menu', async (req, res) => {
  try {
    const menuItems = await Menu.findAll();
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ message: '메뉴를 불러오는데 실패했습니다.' });
  }
});

app.get('/api/menu/:id', async (req, res) => {
  try {
    const menuItem = await Menu.findByPk(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ message: '메뉴를 찾을 수 없습니다.' });
    }
    res.json(menuItem);
  } catch (error) {
    res.status(500).json({ message: '메뉴를 불러오는데 실패했습니다.' });
  }
});

// 장바구니 API
let cart = []; // 임시 장바구니 저장소

app.get('/api/cart', (req, res) => {
  res.json(cart);
});

app.post('/api/cart', async (req, res) => {
  try {
    const { menuId, quantity, options } = req.body;
    const menuItem = await Menu.findByPk(menuId);
    
    if (!menuItem) {
      return res.status(404).json({ message: '메뉴를 찾을 수 없습니다.' });
    }

    const optionPrice = (options?.shot ? 500 : 0) + (options?.syrup ? 300 : 0);
    const cartItem = {
      id: Date.now(),
      menuId,
      name: menuItem.name,
      price: menuItem.price,
      quantity,
      options,
      totalPrice: (menuItem.price + optionPrice) * quantity
    };

    cart.push(cartItem);
    res.status(201).json(cartItem);
  } catch (error) {
    res.status(500).json({ message: '장바구니에 추가하는데 실패했습니다.' });
  }
});

app.put('/api/cart/:id', (req, res) => {
  try {
    const { quantity } = req.body;
    const cartItem = cart.find(item => item.id === parseInt(req.params.id));
    
    if (!cartItem) {
      return res.status(404).json({ message: '장바구니 아이템을 찾을 수 없습니다.' });
    }

    cartItem.quantity = quantity;
    cartItem.totalPrice = (cartItem.price + 
      (cartItem.options?.shot ? 500 : 0) + 
      (cartItem.options?.syrup ? 300 : 0)) * quantity;

    res.json(cartItem);
  } catch (error) {
    res.status(500).json({ message: '장바구니 아이템 수정에 실패했습니다.' });
  }
});

app.delete('/api/cart/:id', (req, res) => {
  try {
    const index = cart.findIndex(item => item.id === parseInt(req.params.id));
    if (index === -1) {
      return res.status(404).json({ message: '장바구니 아이템을 찾을 수 없습니다.' });
    }

    cart.splice(index, 1);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: '장바구니 아이템 삭제에 실패했습니다.' });
  }
});

// 주문 API
app.post('/api/orders', async (req, res) => {
  const transaction = await db.sequelize.transaction(); // 트랜잭션 시작
  try {
    const { items, totalAmount } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ message: '주문할 아이템이 없습니다.' });
    }

    // 재고 확인 및 차감
    for (const item of items) {
      const menuItem = await Menu.findByPk(item.menuId, { transaction });
      if (!menuItem) {
        await transaction.rollback();
        return res.status(404).json({ message: `메뉴를 찾을 수 없습니다: ID ${item.menuId}` });
      }
      if (menuItem.stock < item.quantity) {
        await transaction.rollback();
        return res.status(400).json({ message: `재고 부족: ${menuItem.name} (남은 수량: ${menuItem.stock})` });
      }
      menuItem.stock -= item.quantity;
      await menuItem.save({ transaction });
    }

    const order = await Order.create({
      items,
      totalAmount,
      status: 'pending'
    }, { transaction });

    await transaction.commit(); // 트랜잭션 커밋

    cart = []; // 주문 후 장바구니 비우기 (이 부분은 클라이언트 상태와 동기화 필요)
    res.status(201).json(order);
  } catch (error) {
    await transaction.rollback(); // 오류 발생 시 롤백
    console.error('주문 처리 중 오류 발생:', error); // 서버 로그에 오류 기록
    res.status(500).json({ message: '주문 처리에 실패했습니다.' });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.findAll();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: '주문 목록을 불러오는데 실패했습니다.' });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: '주문을 불러오는데 실패했습니다.' });
  }
});

app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByPk(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }

    order.status = status;
    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: '주문 상태 업데이트에 실패했습니다.' });
  }
});

// 관리자용 API: 메뉴 재고 업데이트
app.put('/api/admin/menu/:id/stock', async (req, res) => {
  // !!! 실제 운영 환경에서는 이 API에 관리자 인증 로직이 반드시 필요합니다 !!!
  try {
    const { stock } = req.body;
    const menuId = req.params.id;

    if (stock === undefined || stock < 0) {
      return res.status(400).json({ message: '유효한 재고 수량을 입력하세요.' });
    }

    const menuItem = await Menu.findByPk(menuId);
    if (!menuItem) {
      return res.status(404).json({ message: '메뉴를 찾을 수 없습니다.' });
    }

    menuItem.stock = parseInt(stock, 10);
    await menuItem.save();

    res.json({ message: `메뉴 [${menuItem.name}] 재고가 ${menuItem.stock}(으)로 업데이트되었습니다.`, menuItem });
  } catch (error) {
    console.error('메뉴 재고 업데이트 중 오류 발생:', error);
    res.status(500).json({ message: '메뉴 재고 업데이트에 실패했습니다.' });
  }
});

// 모든 API 라우트들 이후, React 앱의 index.html을 제공 (빌드 폴더를 ui/dist로 수정)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../ui/dist/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  console.log('React 앱은 이 서버를 통해 제공됩니다.');
}); 