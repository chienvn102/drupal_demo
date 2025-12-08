-- Bảng users
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    fcm_token VARCHAR(500), -- Firebase Cloud Messaging token cho push notification
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bảng tasks (Công việc)
CREATE TABLE tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    due_date DATETIME NOT NULL,
    completed_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_due_date (user_id, due_date),
    INDEX idx_status (status)
);

-- Bảng meetings (Cuộc họp)
CREATE TABLE meetings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    organizer_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    meeting_time DATETIME NOT NULL,
    duration INT DEFAULT 60, -- Thời lượng (phút)
    location VARCHAR(255),
    meeting_url VARCHAR(500), -- Link meeting online (Zoom, Google Meet, etc.)
    status ENUM('scheduled', 'ongoing', 'completed', 'cancelled') DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_meeting_time (meeting_time),
    INDEX idx_status (status)
);

-- Bảng meeting_participants (Người tham gia cuộc họp)
CREATE TABLE meeting_participants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    meeting_id INT NOT NULL,
    user_id INT NOT NULL,
    response_status ENUM('pending', 'accepted', 'declined', 'tentative') DEFAULT 'pending',
    joined_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_participant (meeting_id, user_id)
);

-- Bảng notification_types
CREATE TABLE notification_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type_code VARCHAR(50) NOT NULL UNIQUE, -- 'meeting', 'task_deadline', 'reminder', etc.
    type_name VARCHAR(100) NOT NULL,
    icon VARCHAR(50), -- tên icon để hiển thị trong app
    color VARCHAR(20), -- màu sắc cho từng loại thông báo
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng notifications
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    type_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    scheduled_time DATETIME NOT NULL, -- Thời gian thông báo sẽ được gửi
    sent_at DATETIME, -- Thời gian đã gửi thực tế
    is_read BOOLEAN DEFAULT FALSE,
    is_sent BOOLEAN DEFAULT FALSE,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    action_url VARCHAR(500), -- Deep link trong app (ví dụ: app://meetings/123)
    metadata JSON, -- Dữ liệu bổ sung (meeting_id, task_id, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (type_id) REFERENCES notification_types(id),
    INDEX idx_user_scheduled (user_id, scheduled_time),
    INDEX idx_sent_status (is_sent, scheduled_time)
);

-- Bảng notification_logs (lưu lại lịch sử gửi notification)
CREATE TABLE notification_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    notification_id INT NOT NULL,
    status ENUM('success', 'failed', 'pending') DEFAULT 'pending',
    error_message TEXT,
    sent_via ENUM('push', 'email', 'sms') DEFAULT 'push',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
);

-- Insert dữ liệu mẫu cho notification_types
INSERT INTO notification_types (type_code, type_name, icon, color) VALUES
('meeting', 'Cuộc họp', 'calendar', '#4A90E2'),
('task_deadline', 'Công việc đến hạn', 'alert-circle', '#F5A623'),
('reminder', 'Nhắc nhở', 'bell', '#7ED321'),
('system', 'Thông báo hệ thống', 'info', '#9013FE');

-- Insert dữ liệu mẫu cho users
INSERT INTO users (username, email, full_name, fcm_token) VALUES
('user1', 'user1@example.com', 'Nguyễn Văn A', 'fcm_token_sample_123'),
('user2', 'user2@example.com', 'Trần Thị B', 'fcm_token_sample_456'),
('user3', 'user3@example.com', 'Lê Văn C', 'fcm_token_sample_789');

-- Insert dữ liệu mẫu cho tasks
INSERT INTO tasks (user_id, title, description, status, priority, due_date) VALUES
(1, 'Hoàn thành báo cáo dự án', 'Viết và nộp báo cáo dự án Website Redesign', 'in_progress', 'high', '2025-12-10 17:00:00'),
(1, 'Review code của team', 'Kiểm tra và review pull requests của team members', 'pending', 'medium', '2025-12-09 15:00:00'),
(2, 'Chuẩn bị tài liệu họp', 'Chuẩn bị slide và tài liệu cho cuộc họp tuần tới', 'pending', 'high', '2025-12-11 09:00:00'),
(2, 'Update database schema', 'Cập nhật schema cho module notification', 'completed', 'medium', '2025-12-07 16:00:00'),
(3, 'Testing tính năng mới', 'Test các tính năng mới trên môi trường staging', 'in_progress', 'urgent', '2025-12-09 18:00:00');

-- Insert dữ liệu mẫu cho meetings
INSERT INTO meetings (organizer_id, title, description, meeting_time, duration, location, meeting_url, status) VALUES
(1, 'Cuộc họp team hàng tuần', 'Review tiến độ và thảo luận kế hoạch tuần tới', '2025-12-09 14:00:00', 60, 'Phòng họp A', 'https://meet.google.com/abc-defg-hij', 'scheduled'),
(1, 'Sprint Planning Meeting', 'Lên kế hoạch cho sprint mới', '2025-12-11 10:00:00', 120, 'Phòng họp B', 'https://zoom.us/j/123456789', 'scheduled'),
(2, 'Demo sản phẩm cho khách hàng', 'Trình diễn các tính năng mới', '2025-12-12 15:00:00', 90, 'Online', 'https://teams.microsoft.com/l/meetup-join/xyz', 'scheduled'),
(3, 'Họp tổng kết tháng', 'Đánh giá kết quả công việc tháng 12', '2025-12-15 09:00:00', 60, 'Phòng hội thảo', NULL, 'scheduled');

-- Insert dữ liệu mẫu cho meeting_participants
INSERT INTO meeting_participants (meeting_id, user_id, response_status) VALUES
(1, 2, 'accepted'),
(1, 3, 'accepted'),
(2, 2, 'tentative'),
(2, 3, 'pending'),
(3, 1, 'accepted'),
(3, 3, 'accepted'),
(4, 1, 'accepted'),
(4, 2, 'pending');

-- Insert dữ liệu mẫu cho notifications
INSERT INTO notifications (user_id, type_id, title, message, scheduled_time, priority, action_url, metadata) VALUES
(1, 1, 'Cuộc họp team', 'Cuộc họp team sẽ bắt đầu lúc 14:00 hôm nay tại phòng họp A', '2025-12-09 13:45:00', 'high', 'app://meetings/1', '{"meeting_id": 1, "room": "A", "duration": 60}'),
(1, 2, 'Deadline dự án', 'Dự án website sẽ đến hạn vào 17:00 ngày 10/12', '2025-12-10 16:00:00', 'urgent', 'app://tasks/1', '{"task_id": 1, "project": "Website Redesign"}'),
(2, 3, 'Nhắc nhở', 'Đừng quên chuẩn bị tài liệu họp', '2025-12-10 09:00:00', 'medium', 'app://tasks/3', '{"task_id": 3}'),
(3, 2, 'Công việc khẩn cấp', 'Testing tính năng mới cần hoàn thành trong hôm nay', '2025-12-09 10:00:00', 'urgent', 'app://tasks/5', '{"task_id": 5}');

-- View để lấy thông báo chi tiết
CREATE VIEW notification_details AS
SELECT 
    n.id,
    n.user_id,
    u.username,
    u.email,
    u.fcm_token,
    nt.type_code,
    nt.type_name,
    nt.icon,
    nt.color,
    n.title,
    n.message,
    n.scheduled_time,
    n.sent_at,
    n.is_read,
    n.is_sent,
    n.priority,
    n.action_url,
    n.metadata,
    n.created_at
FROM notifications n
JOIN users u ON n.user_id = u.id
JOIN notification_types nt ON n.type_id = nt.id;

-- Stored procedure để lấy thông báo chưa gửi
DELIMITER //
CREATE PROCEDURE get_pending_notifications()
BEGIN
    SELECT * FROM notification_details
    WHERE is_sent = FALSE 
    AND scheduled_time <= NOW()
    ORDER BY priority DESC, scheduled_time ASC;
END //
DELIMITER ;

-- Stored procedure để đánh dấu thông báo đã đọc
DELIMITER //
CREATE PROCEDURE mark_notification_read(IN notification_id INT)
BEGIN
    UPDATE notifications 
    SET is_read = TRUE, updated_at = NOW()
    WHERE id = notification_id;
END //
DELIMITER ;