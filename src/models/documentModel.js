const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Get all documents with filters
const getAllDocuments = async (filters = {}) => {
  const { search, category_id, document_type, limit = 50, offset = 0 } = filters;
  
  let query = `
    SELECT d.*, c.name as category_name
    FROM documents d
    LEFT JOIN categories c ON d.category_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    query += ' AND d.title LIKE ?';
    params.push(`%${search}%`);
  }

  if (category_id) {
    query += ' AND d.category_id = ?';
    params.push(category_id);
  }

  if (document_type) {
    query += ' AND d.document_type = ?';
    params.push(document_type);
  }

  query += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const [rows] = await pool.query(query, params);
  
  // Get total count
  let countQuery = `
    SELECT COUNT(*) as total FROM documents d WHERE 1=1
  `;
  const countParams = [];
  
  if (search) {
    countQuery += ' AND d.title LIKE ?';
    countParams.push(`%${search}%`);
  }
  if (category_id) {
    countQuery += ' AND d.category_id = ?';
    countParams.push(category_id);
  }
  if (document_type) {
    countQuery += ' AND d.document_type = ?';
    countParams.push(document_type);
  }

  const [countResult] = await pool.query(countQuery, countParams);
  
  return {
    data: rows,
    total: countResult[0].total,
    limit: parseInt(limit),
    offset: parseInt(offset)
  };
};

// Get document by ID
const getDocumentById = async (id) => {
  const [rows] = await pool.query(`
    SELECT d.*, c.name as category_name
    FROM documents d
    LEFT JOIN categories c ON d.category_id = c.id
    WHERE d.id = ?
  `, [id]);
  return rows[0];
};

// Get document by UUID
const getDocumentByUuid = async (uuid) => {
  const [rows] = await pool.query(`
    SELECT d.*, c.name as category_name
    FROM documents d
    LEFT JOIN categories c ON d.category_id = c.id
    WHERE d.uuid = ?
  `, [uuid]);
  return rows[0];
};

// Create document
const createDocument = async (data) => {
  const uuid = uuidv4();
  const {
    title,
    category_id,
    content,
    is_important = 0,
    document_type = 'van_ban',
    file_url,
    link_url,
    created_by
  } = data;

  const [result] = await pool.query(`
    INSERT INTO documents 
    (uuid, title, category_id, content, is_important, document_type, file_url, link_url, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [uuid, title, category_id, content, is_important, document_type, file_url, link_url, created_by]);

  return getDocumentById(result.insertId);
};

// Update document
const updateDocument = async (id, data) => {
  const {
    title,
    category_id,
    content,
    is_important,
    document_type,
    file_url,
    link_url
  } = data;

  const updates = [];
  const params = [];

  if (title !== undefined) {
    updates.push('title = ?');
    params.push(title);
  }
  if (category_id !== undefined) {
    updates.push('category_id = ?');
    params.push(category_id);
  }
  if (content !== undefined) {
    updates.push('content = ?');
    params.push(content);
  }
  if (is_important !== undefined) {
    updates.push('is_important = ?');
    params.push(is_important);
  }
  if (document_type !== undefined) {
    updates.push('document_type = ?');
    params.push(document_type);
  }
  if (file_url !== undefined) {
    updates.push('file_url = ?');
    params.push(file_url);
  }
  if (link_url !== undefined) {
    updates.push('link_url = ?');
    params.push(link_url);
  }

  if (updates.length === 0) {
    return getDocumentById(id);
  }

  params.push(id);
  await pool.query(`UPDATE documents SET ${updates.join(', ')} WHERE id = ?`, params);
  
  return getDocumentById(id);
};

// Delete document
const deleteDocument = async (id) => {
  const [result] = await pool.query('DELETE FROM documents WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

module.exports = {
  getAllDocuments,
  getDocumentById,
  getDocumentByUuid,
  createDocument,
  updateDocument,
  deleteDocument
};
