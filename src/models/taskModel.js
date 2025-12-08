const { pool } = require('../config/database');

// Get all tasks with filters
const getAllTasks = async (filters = {}) => {
  const { user_id, status, priority, search, limit = 50, offset = 0 } = filters;
  
  let query = `
    SELECT 
      t.id,
      t.title,
      t.description,
      t.user_id,
      u.username,
      u.full_name,
      t.status,
      t.priority,
      t.due_date,
      t.completed_at,
      t.created_at,
      t.updated_at
    FROM tasks t
    LEFT JOIN users u ON t.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (user_id) {
    query += ' AND t.user_id = ?';
    params.push(user_id);
  }

  if (status) {
    query += ' AND t.status = ?';
    params.push(status);
  }

  if (priority) {
    query += ' AND t.priority = ?';
    params.push(priority);
  }

  if (search) {
    query += ' AND (t.title LIKE ? OR t.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY t.due_date ASC, t.priority DESC, t.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const [rows] = await pool.query(query, params);
  
  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM tasks t WHERE 1=1';
  const countParams = [];
  
  if (user_id) {
    countQuery += ' AND t.user_id = ?';
    countParams.push(user_id);
  }
  if (status) {
    countQuery += ' AND t.status = ?';
    countParams.push(status);
  }
  if (priority) {
    countQuery += ' AND t.priority = ?';
    countParams.push(priority);
  }
  if (search) {
    countQuery += ' AND (t.title LIKE ? OR t.description LIKE ?)';
    countParams.push(`%${search}%`, `%${search}%`);
  }

  const [countResult] = await pool.query(countQuery, countParams);

  return {
    data: rows,
    total: countResult[0].total,
    limit: parseInt(limit),
    offset: parseInt(offset)
  };
};

// Get task by ID
const getTaskById = async (id) => {
  const query = `
    SELECT 
      t.id,
      t.title,
      t.description,
      t.user_id,
      u.username,
      u.full_name,
      t.status,
      t.priority,
      t.due_date,
      t.completed_at,
      t.created_at,
      t.updated_at
    FROM tasks t
    LEFT JOIN users u ON t.user_id = u.id
    WHERE t.id = ?
  `;
  const [rows] = await pool.query(query, [id]);
  return rows[0] || null;
};

// Create task
const createTask = async (data) => {
  const { 
    user_id, 
    title, 
    description, 
    status = 'pending',
    priority = 'medium',
    due_date
  } = data;

  const query = `
    INSERT INTO tasks 
    (user_id, title, description, status, priority, due_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  const [result] = await pool.query(query, [
    user_id,
    title,
    description,
    status,
    priority,
    due_date
  ]);

  return getTaskById(result.insertId);
};

// Update task
const updateTask = async (id, data) => {
  const { 
    title, 
    description, 
    status,
    priority,
    due_date,
    completed_at
  } = data;

  let query = 'UPDATE tasks SET updated_at = NOW()';
  const params = [];

  if (title !== undefined) {
    query += ', title = ?';
    params.push(title);
  }
  if (description !== undefined) {
    query += ', description = ?';
    params.push(description);
  }
  if (status !== undefined) {
    query += ', status = ?';
    params.push(status);
    
    // Auto set completed_at if status is completed
    if (status === 'completed' && !completed_at) {
      query += ', completed_at = NOW()';
    }
  }
  if (priority !== undefined) {
    query += ', priority = ?';
    params.push(priority);
  }
  if (due_date !== undefined) {
    query += ', due_date = ?';
    params.push(due_date);
  }
  if (completed_at !== undefined) {
    query += ', completed_at = ?';
    params.push(completed_at);
  }

  query += ' WHERE id = ?';
  params.push(id);

  const [result] = await pool.query(query, params);
  
  if (result.affectedRows === 0) {
    return null;
  }

  return getTaskById(id);
};

// Delete task
const deleteTask = async (id) => {
  const query = 'DELETE FROM tasks WHERE id = ?';
  const [result] = await pool.query(query, [id]);
  return result.affectedRows > 0;
};

// Get tasks by user ID
const getTasksByUserId = async (userId, filters = {}) => {
  return getAllTasks({ ...filters, user_id: userId });
};

// Get upcoming tasks (due soon)
const getUpcomingTasks = async (userId, days = 7) => {
  const query = `
    SELECT 
      t.id,
      t.title,
      t.description,
      t.user_id,
      t.status,
      t.priority,
      t.due_date,
      t.created_at
    FROM tasks t
    WHERE t.user_id = ?
    AND t.status != 'completed'
    AND t.due_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? DAY)
    ORDER BY t.due_date ASC, t.priority DESC
  `;
  const [rows] = await pool.query(query, [userId, days]);
  return rows;
};

// Get overdue tasks
const getOverdueTasks = async (userId) => {
  const query = `
    SELECT 
      t.id,
      t.title,
      t.description,
      t.user_id,
      t.status,
      t.priority,
      t.due_date,
      t.created_at
    FROM tasks t
    WHERE t.user_id = ?
    AND t.status != 'completed'
    AND t.due_date < NOW()
    ORDER BY t.due_date ASC
  `;
  const [rows] = await pool.query(query, [userId]);
  return rows;
};

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getTasksByUserId,
  getUpcomingTasks,
  getOverdueTasks
};
