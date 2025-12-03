-- ============================================
-- DEMO DATABASE SCHEMA
-- Hệ thống quản lý công việc - Trung tâm CNTT
-- ============================================

-- Xóa database nếu tồn tại và tạo mới
DROP DATABASE IF EXISTS demo_drupal;
CREATE DATABASE demo_drupal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE demo_drupal;

-- ============================================
-- BẢNG 1: DANH MỤC (categories)
-- ============================================
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT 'Tên danh mục',
    slug VARCHAR(255) NOT NULL UNIQUE COMMENT 'Đường dẫn URL',
    description TEXT COMMENT 'Mô tả danh mục',
    parent_id INT DEFAULT NULL COMMENT 'ID danh mục cha (nếu có)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- BẢNG 2: VĂN BẢN - TÀI LIỆU (documents)
-- ============================================
CREATE TABLE documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE COMMENT 'UUID cho API',
    title VARCHAR(500) NOT NULL COMMENT 'Tiêu đề văn bản',
    category_id INT NOT NULL COMMENT 'ID danh mục',
    content TEXT COMMENT 'Tóm tắt nội dung',
    is_important TINYINT(1) DEFAULT 0 COMMENT 'Đánh dấu quan trọng',
    document_type ENUM('thong_bao', 'van_ban', 'tai_lieu', 'mau_vb') DEFAULT 'van_ban' COMMENT 'Loại văn bản',
    file_url VARCHAR(500) COMMENT 'Đường dẫn file đính kèm',
    link_url VARCHAR(500) COMMENT 'Liên kết URL',
    created_by VARCHAR(100) COMMENT 'Người tạo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    INDEX idx_category (category_id),
    INDEX idx_document_type (document_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- BẢNG 3: BÁO CÁO - CÔNG VIỆC (reports)
-- ============================================
CREATE TABLE reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE COMMENT 'UUID cho API',
    title VARCHAR(500) NOT NULL COMMENT 'Tiêu đề báo cáo',
    category_id INT NOT NULL COMMENT 'ID danh mục',
    chu_tri VARCHAR(100) COMMENT 'Chủ trì xử lý',
    phoi_hop VARCHAR(255) COMMENT 'Phối hợp xử lý',
    file_count INT DEFAULT 0 COMMENT 'Số lượng file gắn kèm',
    link_url VARCHAR(500) COMMENT 'Liên kết',
    status ENUM('chua_xu_ly', 'dang_xu_ly', 'hoan_thanh') DEFAULT 'chua_xu_ly' COMMENT 'Trạng thái xử lý',
    result TEXT COMMENT 'Kết quả xử lý',
    created_by VARCHAR(100) COMMENT 'Người tạo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    INDEX idx_category (category_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DỮ LIỆU MẪU - CATEGORIES
-- ============================================
INSERT INTO categories (id, name, slug, description, parent_id) VALUES
-- Danh mục cha
(1, 'Văn bản - Tài liệu', 'van-ban-tai-lieu', 'Quản lý văn bản và tài liệu', NULL),
(2, 'Quản lý công việc', 'quan-ly-cong-viec', 'Quản lý báo cáo và công việc', NULL),

-- Danh mục con của "Văn bản - Tài liệu"
(3, 'Văn bản quan trọng', 'van-ban-quan-trong', 'Các văn bản quan trọng cần lưu ý', 1),
(4, 'Tài liệu kỹ thuật', 'tai-lieu-ky-thuat', 'Tài liệu hướng dẫn kỹ thuật', 1),
(5, 'Thông tin danh mục', 'thong-tin-danh-muc', 'Thông tin các danh mục', 1),
(6, 'Mẫu văn bản', 'mau-van-ban', 'Các mẫu văn bản chuẩn', 1),

-- Danh mục con của "Quản lý công việc"
(7, 'Báo cáo', 'bao-cao', 'Báo cáo công việc', 2),
(8, 'Công việc', 'cong-viec', 'Quản lý công việc', 2),
(9, 'Dự án', 'du-an', 'Quản lý dự án', 2);

-- ============================================
-- DỮ LIỆU MẪU - DOCUMENTS
-- ============================================
INSERT INTO documents (uuid, title, category_id, content, is_important, document_type, link_url, created_by) VALUES
(UUID(), 'Thông tư 22 về thu thập, cập nhật, kết nối dữ liệu trên Hệ thống thông tin quốc gia', 3, 'Quy định về thu thập, cập nhật, kết nối, chia sẻ, quản lý, khai thác, sử dụng dữ liệu trên Hệ thống thông tin quốc gia về khoa học, công nghệ và đổi mới sáng tạo.', 1, 'van_ban', 'https://example.com/thongtu22', 'admin'),

(UUID(), 'AI chat GPT theo chủ đề', 4, 'Hướng dẫn sử dụng AI ChatGPT trong công việc', 0, 'tai_lieu', NULL, 'linh'),

(UUID(), 'Văn bản đã tham mưu (P.QL&KTDL)', 3, 'Danh sách văn bản đã tham mưu của phòng Quản lý và Khai thác dữ liệu', 0, 'van_ban', NULL, 'admin'),

(UUID(), 'Danh mục mã định danh các cơ quan, đơn vị, địa phương', 5, 'Danh mục mới ban hành tại Quyết định số 241/QĐ-SKHCN ngày 24/06/2025 của Sở Khoa học và Công nghệ tỉnh Bắc Ninh.', 1, 'van_ban', NULL, 'admin'),

(UUID(), 'Bản quyền Liferay', 4, 'Thông tin về bản quyền sử dụng Liferay Portal', 0, 'tai_lieu', NULL, 'admin'),

(UUID(), 'Khung kiến trúc tổng thể quốc gia số', 3, 'Tài liệu về khung kiến trúc tổng thể quốc gia số của Việt Nam', 1, 'van_ban', 'https://example.com/kientruc', 'admin'),

(UUID(), 'Mẫu Quy trình gói CDT rút gọn', 6, 'Mẫu quy trình chủ đầu tư rút gọn chuẩn', 0, 'mau_vb', NULL, 'admin'),

(UUID(), 'Mẫu Quy trình gói Thường từ 500tr', 6, 'Mẫu quy trình gói thường từ 500 triệu (mua sắm/canh tranh/rộng rãi)', 0, 'mau_vb', NULL, 'admin'),

(UUID(), 'Hướng dẫn AI LM book', 4, 'Tài liệu hướng dẫn sử dụng AI Language Model', 0, 'tai_lieu', NULL, 'admin'),

(UUID(), 'Danh sách lãnh đạo tỉnh và lãnh đạo giám đốc các Sở', 5, 'Thông tin danh sách lãnh đạo các cấp', 0, 'van_ban', NULL, 'admin');

-- ============================================
-- DỮ LIỆU MẪU - REPORTS
-- ============================================
INSERT INTO reports (uuid, title, category_id, chu_tri, phoi_hop, file_count, link_url, status, created_by) VALUES
(UUID(), 'test 2', 7, NULL, NULL, 0, NULL, 'chua_xu_ly', 'test'),

(UUID(), 'Theo dõi nhiệm vụ trung tâm 2025', 8, NULL, NULL, 0, 'https://example.com/theodoi', 'dang_xu_ly', 'admin'),

(UUID(), 'Báo cáo công việc phòng Quản lý và Khai thác dữ liệu (Báo cáo tuần)', 7, 'phuong', 'hang', 0, 'https://example.com/baocao', 'hoan_thanh', 'admin'),

(UUID(), 'Báo cáo trung tâm 2025', 7, NULL, NULL, 0, 'https://example.com/baocao2025', 'dang_xu_ly', 'admin'),

(UUID(), 'Hiện trạng IOC các tỉnh', 8, NULL, NULL, 0, 'https://example.com/ioc', 'chua_xu_ly', 'admin'),

(UUID(), 'Danh sách phần mềm tài sản của trung tâm (2025)', 8, NULL, NULL, 0, 'https://example.com/dspm', 'hoan_thanh', 'admin'),

(UUID(), 'Xây dựng phương pháp quy trình xử lý công việc 2 phòng', 8, 'namnd288', 'thuy, ha', 0, 'https://example.com/quytrinh', 'dang_xu_ly', 'admin'),

(UUID(), 'Báo cáo 95 (98) phần mềm 2 tỉnh sau sát nhập', 7, 'namnd288', NULL, 0, 'https://example.com/bc95', 'hoan_thanh', 'admin'),

(UUID(), 'Tổng hợp tiến độ triển khai các dự án 2025', 9, 'namnd288', NULL, 0, 'https://example.com/duan2025', 'dang_xu_ly', 'admin'),

(UUID(), 'Tổng hợp khảo sát hiện trạng CSDL, Phần mềm trên địa bàn tỉnh', 7, 'linh', NULL, 0, 'https://docs.google.com/spreadsheets/example', 'hoan_thanh', 'linh');

-- ============================================
-- STORED PROCEDURE: Tìm kiếm văn bản
-- ============================================
DELIMITER //
CREATE PROCEDURE search_documents(
    IN search_term VARCHAR(255),
    IN cat_id INT,
    IN doc_type VARCHAR(20)
)
BEGIN
    SELECT d.*, c.name as category_name
    FROM documents d
    LEFT JOIN categories c ON d.category_id = c.id
    WHERE 
        (search_term IS NULL OR search_term = '' OR d.title LIKE CONCAT('%', search_term, '%'))
        AND (cat_id IS NULL OR cat_id = 0 OR d.category_id = cat_id)
        AND (doc_type IS NULL OR doc_type = '' OR d.document_type = doc_type)
    ORDER BY d.created_at DESC;
END //
DELIMITER ;

-- ============================================
-- STORED PROCEDURE: Tìm kiếm báo cáo
-- ============================================
DELIMITER //
CREATE PROCEDURE search_reports(
    IN search_term VARCHAR(255),
    IN cat_id INT,
    IN report_status VARCHAR(20)
)
BEGIN
    SELECT r.*, c.name as category_name
    FROM reports r
    LEFT JOIN categories c ON r.category_id = c.id
    WHERE 
        (search_term IS NULL OR search_term = '' OR r.title LIKE CONCAT('%', search_term, '%'))
        AND (cat_id IS NULL OR cat_id = 0 OR r.category_id = cat_id)
        AND (report_status IS NULL OR report_status = '' OR r.status = report_status)
    ORDER BY r.created_at DESC;
END //
DELIMITER ;

-- Hiển thị kết quả
SELECT 'Database demo_drupal đã được tạo thành công!' as message;
SELECT COUNT(*) as total_categories FROM categories;
SELECT COUNT(*) as total_documents FROM documents;
SELECT COUNT(*) as total_reports FROM reports;
