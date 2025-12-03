const { pool } = require('../config/database');

// Get all categories
const getAllCategories = async () => {
  const [rows] = await pool.query(`
    SELECT c.*, p.name as parent_name
    FROM categories c
    LEFT JOIN categories p ON c.parent_id = p.id
    ORDER BY c.parent_id IS NULL DESC, c.parent_id, c.id
  `);
  return rows;
};

// Get category by ID
const getCategoryById = async (id) => {
  const [rows] = await pool.query(
    'SELECT * FROM categories WHERE id = ?',
    [id]
  );
  return rows[0];
};

// Get child categories
const getChildCategories = async (parentId) => {
  const [rows] = await pool.query(
    'SELECT * FROM categories WHERE parent_id = ?',
    [parentId]
  );
  return rows;
};

// Create category
const createCategory = async (data) => {
  const { name, slug, description, parent_id } = data;
  const [result] = await pool.query(
    'INSERT INTO categories (name, slug, description, parent_id) VALUES (?, ?, ?, ?)',
    [name, slug, description, parent_id || null]
  );
  return { id: result.insertId, ...data };
};

// Update category
const updateCategory = async (id, data) => {
  const { name, slug, description, parent_id } = data;
  await pool.query(
    'UPDATE categories SET name = ?, slug = ?, description = ?, parent_id = ? WHERE id = ?',
    [name, slug, description, parent_id || null, id]
  );
  return getCategoryById(id);
};

// Delete category
const deleteCategory = async (id) => {
  const [result] = await pool.query(
    'DELETE FROM categories WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
};

module.exports = {
  getAllCategories,
  getCategoryById,
  getChildCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
