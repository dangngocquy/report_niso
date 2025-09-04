# REPORT NISO

Hệ thống quản lý đăng nhập và báo cáo nội bộ cho NISO: frontend React, backend Node.js/Express kết nối SQL Server, JSON Server; hỗ trợ CRUD người dùng và nội dung báo cáo từ Power BI, thực thi truy vấn SQL, quản lý tệp trên Windows; bảo mật bằng HTTPS/SSL, Basic Auth và ký dữ liệu khi đăng nhập.

### Tóm tắt hoạt động & lưu trữ

- **Tài khoản**: SQL Server (`databaseAccount`), mật khẩu băm SHA-256.
- **Nội dung**: JSON tại `frontend/src/data/database.json` (backend đọc/ghi).
- **Kết nối/Query**: `backend/connections.json`, `backend/folders.json`; thực thi query có retry/timeout/cache.
- **File system**: Duyệt/đọc/tạo/sửa/xóa/tìm kiếm; khóa đường dẫn (lưu `backend/path_passwords.json`).
- **Bảo mật**: HTTPS (SSL), Basic Auth, ký/xác minh khi đăng nhập.

## 🚀 Tính năng chính

- **Quản trị người dùng**
  - Tạo/sửa/xóa tài khoản, xem danh sách người dùng
  - Lưu mật khẩu dạng băm SHA-256 khi tạo/cập nhật

- **Nội dung báo cáo**
  - Thêm/sửa/xóa/xem nội dung (lưu trong `database.json`)
  - Xem chi tiết nội dung theo `keys`

- **Kết nối CSDL & Thực thi truy vấn**
  - Thêm/xem/xóa/cập nhật cấu hình kết nối SQL Server
  - Kiểm tra kết nối, trạng thái kết nối, ghi nhận thời gian kiểm tra
  - Thực thi query với cơ chế retry, timeout, và cache tạm
  - Tổ chức query theo thư mục, đổi tên/sửa nội dung query
  - Phân quyền truy cập theo `keysUserTime`

- **Hệ thống file (Windows)**
  - Liệt kê ổ đĩa, duyệt thư mục, đọc file (tối ưu ảnh/kích thước lớn)
  - Tạo/sửa/xóa file và thư mục, tìm kiếm đệ quy (bỏ qua thư mục hệ thống)
  - Thực thi/dừng file `.bat`, theo dõi trạng thái
  - Đặt/xóa mật khẩu bảo vệ đường dẫn (file/thư mục)

- **Bảo mật & truyền thông**
  - Basic Auth cho hầu hết API quản trị
  - HTTPS sử dụng chứng chỉ SSL (PFX)
  - Endpoint ký dữ liệu, xác thực chữ ký client-server khi đăng nhập
  - CORS và các HTTP Security Headers (HSTS, X-Frame-Options, v.v.)

- **Giao diện & trải nghiệm**
  - React + Ant Design, trình soạn thảo SQL (CodeMirror)

## 🛠️ Công nghệ sử dụng

### Frontend
- React 18
- Ant Design (UI Framework)
- CodeMirror (SQL Editor)
- Axios (HTTP Client)
- React Router DOM

### Backend
- Node.js + Express
- SQL Server (MSSQL)
- HTTPS với SSL Certificate
- Basic Authentication
- File System APIs

## 📁 Cấu trúc dự án

```
LOGINREPORTNISO/
├─ app.js                      # Entry khởi chạy HTTPS frontend + proxy backend
├─ web.config                  # Cấu hình IIS (deploy Windows)
├─ README.md
├─ SSL/                        # Chứng chỉ SSL
├─ backend/                    # API server (Express, MSSQL, File system)
│  ├─ server.js               # Khởi tạo HTTPS API, route và bảo mật
│  ├─ loginUser.js            # Đăng nhập + ký/xác thực chữ ký
│  ├─ account.js              # CRUD tài khoản người dùng (SQL Server)
│  ├─ add_content.js          # CRUD nội dung (lưu file JSON)
│  ├─ baseniso.js             # Kết nối SQL, quản lý thư mục/query, phân quyền
│  ├─ fileSystem.js           # API quản lý hệ thống file Windows
│  ├─ sql.js                  # Cấu hình kết nối MSSQL
│  ├─ config.js               # Cấu hình Firebase (nếu dùng)
│  ├─ connections.json        # Lưu danh sách kết nối SQL
│  ├─ folders.json            # Lưu thư mục và query theo connection
│  └─ app.bat                 # Script tiện ích (Windows)
├─ frontend/                   # Ứng dụng React (giao diện)
│  ├─ package.json
│  ├─ config-overrides.js     # Tùy biến CRA qua react-app-rewired
│  ├─ corsWeb.js              # Cấu hình CORS (nếu dùng)
│  ├─ public/                 # Tài nguyên tĩnh, index.html
│  └─ src/
│     ├─ index.js             # Điểm vào ứng dụng React
│     ├─ App.js               # Root component
│     ├─ axios.js             # Cấu hình Axios
│     ├─ api.js               # Định nghĩa endpoint helper
│     ├─ component/           # Các màn hình/chức năng chính
│     │  ├─ AdminWeb.jsx
│     │  ├─ AddAccount.jsx
│     │  ├─ AddContent.jsx
│     │  ├─ base/             # Query editor/list/tabs cho admin
│     │  ├─ base_user/        # Giao diện truy cập/đọc query cho user
│     │  └─ webadmin/         # Duyệt/đọc/chỉnh sửa file hệ thống
│     ├─ components/          # Thành phần dùng chung
│     ├─ data/database.json   # Dữ liệu nội dung (backend đọc/ghi)
│     └─ utils/               # Tiện ích dùng chung
├─ vesion/                     # Lưu các bản đóng gói RAR
└─ node_modules/
```

## 🚀 Cách chạy dự án

### Yêu cầu hệ thống
- Node.js 16+
- SQL Server
- SSL Certificate

### Khởi chạy

1. **Cài đặt dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Chạy backend:**
   ```bash
   node backend/server.js
   ```

3. **Chạy frontend:**
   ```bash
   cd frontend
   npm start
   ```

4. **Hoặc chạy toàn bộ ứng dụng:**
   ```bash
   node app.js
   ```

## 🔐 Bảo mật

- **Basic Auth**: Username: `Niso`, Password: `Niso@123`
- **HTTPS**: Sử dụng SSL certificate cho kết nối bảo mật
- **CORS**: Cấu hình Cross-Origin Resource Sharing
- **Security Headers**: X-Frame-Options, XSS Protection, HSTS

## 📝 API Endpoints

### Authentication
- `POST /login` - Đăng nhập người dùng

### User Management
- `GET /users/all` - Lấy danh sách tất cả người dùng
- `POST /users/add` - Thêm người dùng mới
- `PUT /users/update/:keys` - Cập nhật người dùng
- `DELETE /users/delete/:keys` - Xóa người dùng

### Content Management
- `GET /content/all` - Lấy tất cả nội dung
- `POST /content/add` - Thêm nội dung mới
- `PUT /content/update/:keys` - Cập nhật nội dung
- `DELETE /content/delete/:keys` - Xóa nội dung

### File System
- `GET /api/filesystem/drives` - Lấy danh sách ổ đĩa
- `GET /api/filesystem/folders` - Lấy nội dung thư mục
- `POST /api/filesystem/savefile` - Lưu file

## 📂 Mô tả file và thư mục

- `app.js`: Khởi động backend (`backend/server.js`), cấu hình proxy các route API sang backend và phục vụ frontend dạng HTTPS (tải chứng chỉ từ `SSL/`).
- `web.config`: Cấu hình IIS khi deploy trên Windows Server/IIS.
- `SSL/`: Lưu chứng chỉ SSL/PFX và khóa. Đã được bỏ qua khi push Git.

- `backend/server.js`: Ứng dụng Express HTTPS cho API, nạp chứng chỉ từ `SSL/`, bật CORS, cấu hình Basic Auth, định nghĩa các route `/login`, `/users/*`, `/content/*`, `/api/connections`, `/api/filesystem/*`, và endpoint ký dữ liệu `/sign`.
- `backend/loginUser.js`: Xử lý đăng nhập. Đọc khóa trong `SSL/`, ký dữ liệu, so khớp chữ ký client-server, trả về thông tin người dùng nếu hợp lệ.
- `backend/account.js`: CRUD tài khoản người dùng với SQL Server (bảng `databaseAccount`), băm mật khẩu bằng SHA-256 khi tạo/cập nhật.
- `backend/add_content.js`: CRUD dữ liệu nội dung lưu tại `frontend/src/data/database.json` (thêm/sửa/xóa/xem theo `keys`).
- `backend/baseniso.js`: Quản lý kết nối SQL (thêm/xem/xóa/cập nhật), kiểm tra kết nối, lưu trữ vào `connections.json`. Quản lý thư mục và query trong `folders.json` (tạo/sửa/đổi tên/xóa), phân quyền theo `keysUserTime`, thực thi query với cơ chế retry/timeout và cache tạm.
- `backend/fileSystem.js`: API làm việc với hệ thống file Windows: liệt kê ổ đĩa, đọc thư mục, đọc nội dung file (tối ưu ảnh, kích thước lớn), tìm kiếm đệ quy (bỏ qua thư mục hệ thống), chạy/dừng `.bat`, tạo/sửa/xóa file/thư mục, đặt/xóa mật khẩu bảo vệ đường dẫn.
- `backend/sql.js`: Nạp biến môi trường từ `frontend/.env.local`, cấu hình kết nối SQL Server (msnodesqlv8) với `trustServerCertificate`.
- `backend/config.js`: Cấu hình Firebase (Auth/Firestore/Storage) qua biến môi trường (nếu dùng).
- `backend/connections.json`: Lưu danh sách kết nối SQL và trạng thái.
- `backend/folders.json`: Lưu cây thư mục và danh sách query theo `connectionId`.
- `backend/app.bat`: Script tiện ích chạy trên Windows (nếu dùng).

- `frontend/`: Ứng dụng React.
  - `src/App.js`, `src/index.js`: Điểm khởi động ứng dụng.
  - `src/component/`: Các màn hình và thành phần chính.
    - `AdminWeb.jsx`: Trang quản trị.
    - `AddAccount.jsx`, `AddContent.jsx`: Form thêm tài khoản/nội dung.
    - `base/`: Công cụ chạy query (danh sách/query editor/tab...).
    - `base_user/`: Phiên bản cho người dùng (viewer, query file/user list...).
    - `webadmin/`: Quản lý file hệ thống (DriveList, FolderView, ReadFile, PasswordModal...).
    - `Login.jsx`, `Header.jsx`, `Body.jsx`, `NotFound.jsx`, `ViewDetail.jsx`, `Loading*.jsx`.
  - `src/utils/`: Tiện ích dùng chung cho frontend.
  - `src/axios.js`, `src/api.js`: Cấu hình gọi API.
  - `src/data/database.json`: Nguồn dữ liệu nội dung dùng bởi backend.
  - `public/`: Tài nguyên tĩnh và `exportWorker.js` phục vụ export.
  - `config-overrides.js`: Tùy biến CRA qua react-app-rewired.
  - `corsWeb.js`, `setupProxy.js`: Cấu hình CORS/proxy (nếu cần trong dev).

## 📄 License

ISC License

## 👥 Tác giả

Đặng Ngọc Quý
