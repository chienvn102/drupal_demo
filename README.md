# Demo Backend API

API Backend demo cho ứng dụng quản lý công việc - Tích hợp Drupal và Mobile

## Cài đặt

```bash
# Clone và cài dependencies
npm install

# Copy file env
cp .env.example .env

# Chỉnh sửa .env với thông tin database của bạn
```

## Cấu hình Database

1. Import file SQL vào MySQL:
```bash
mysql -u root -p < database/schema.sql
```

2. Cập nhật file `.env`:
```
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=demo_drupal
```

## Chạy Server

```bash
# Development mode (với auto-reload)
npm run dev

# Production mode
npm start
```

Server sẽ chạy tại: `http://localhost:4000`

## API Endpoints

### Health Check
- `GET /health` - Kiểm tra server status

### Categories (Danh mục)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/categories` | Lấy danh sách tất cả danh mục |
| GET | `/api/categories/:id` | Lấy chi tiết danh mục |
| GET | `/api/categories/:id/children` | Lấy danh mục con |
| POST | `/api/categories` | Tạo danh mục mới |
| PUT | `/api/categories/:id` | Cập nhật danh mục |
| DELETE | `/api/categories/:id` | Xóa danh mục |

### Documents (Văn bản - Tài liệu)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/documents` | Lấy danh sách văn bản |
| GET | `/api/documents/:id` | Lấy chi tiết văn bản (hỗ trợ ID hoặc UUID) |
| POST | `/api/documents` | Tạo văn bản mới |
| PUT | `/api/documents/:id` | Cập nhật văn bản |
| PATCH | `/api/documents/:id` | Cập nhật một phần văn bản |
| DELETE | `/api/documents/:id` | Xóa văn bản |

**Query Parameters cho GET /api/documents:**
- `search` - Tìm kiếm theo tiêu đề
- `category_id` - Lọc theo danh mục
- `document_type` - Lọc theo loại (thong_bao, van_ban, tai_lieu, mau_vb)
- `limit` - Số lượng kết quả (mặc định: 50)
- `offset` - Vị trí bắt đầu (mặc định: 0)

### Reports (Báo cáo - Công việc)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/reports` | Lấy danh sách báo cáo |
| GET | `/api/reports/:id` | Lấy chi tiết báo cáo (hỗ trợ ID hoặc UUID) |
| POST | `/api/reports` | Tạo báo cáo mới |
| PUT | `/api/reports/:id` | Cập nhật báo cáo |
| PATCH | `/api/reports/:id` | Cập nhật một phần báo cáo |
| DELETE | `/api/reports/:id` | Xóa báo cáo |

**Query Parameters cho GET /api/reports:**
- `search` - Tìm kiếm theo tiêu đề
- `category_id` - Lọc theo danh mục
- `status` - Lọc theo trạng thái (chua_xu_ly, dang_xu_ly, hoan_thanh)
- `limit` - Số lượng kết quả (mặc định: 50)
- `offset` - Vị trí bắt đầu (mặc định: 0)

## Ví dụ Request

### Tạo Document mới
```bash
curl -X POST http://localhost:4000/api/documents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Văn bản test",
    "category_id": 3,
    "content": "Nội dung văn bản test",
    "is_important": true,
    "document_type": "van_ban",
    "created_by": "admin"
  }'
```

### Tạo Report mới
```bash
curl -X POST http://localhost:4000/api/reports \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Báo cáo test",
    "category_id": 7,
    "chu_tri": "nguyen_a",
    "phoi_hop": "tran_b, le_c",
    "status": "dang_xu_ly",
    "created_by": "admin"
  }'
```

### Tìm kiếm Document
```bash
curl "http://localhost:4000/api/documents?search=thong%20tu&document_type=van_ban&limit=10"
```

### Cập nhật Report theo UUID
```bash
curl -X PATCH http://localhost:4000/api/reports/uuid-here \
  -H "Content-Type: application/json" \
  -d '{
    "status": "hoan_thanh",
    "result": "Đã hoàn thành xử lý"
  }'
```

## Deploy lên DigitalOcean

1. SSH vào droplet:
```bash
ssh root@167.172.69.210
```

2. Clone repository:
```bash
cd /var/www
git clone https://github.com/chienvn102/node_demo.git demo_backend
cd demo_backend
```

3. Cài đặt dependencies:
```bash
npm install
```

4. Cấu hình .env:
```bash
cp .env.example .env
nano .env
```

5. Import database:
```bash
mysql -u root -p < database/schema.sql
```

6. Cấu hình PM2:
```bash
pm2 start src/index.js --name "demo-backend"
pm2 save
```

7. Cấu hình Nginx (thêm vào file config):
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

8. Reload Nginx:
```bash
sudo systemctl reload nginx
```

## Response Format

Tất cả API đều trả về JSON với format:

**Success:**
```json
{
  "success": true,
  "data": {...},
  "message": "Action completed successfully"
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (chỉ trong development)"
}
```

**List với pagination:**
```json
{
  "success": true,
  "data": [...],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```
