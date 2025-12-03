const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Get all reports with filters
const getAllReports = async (filters = {}) => {
  const { search, category_id, status, limit = 50, offset = 0 } = filters;
  
  let query = `
    SELECT r.*, c.name as category_name
    FROM reports r
    LEFT JOIN categories c ON r.category_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    query += ' AND r.title LIKE ?';
    params.push(`%${search}%`);
  }

  if (category_id) {
    query += ' AND r.category_id = ?';
    params.push(category_id);
  }

  if (status) {
    query += ' AND r.status = ?';
    params.push(status);
  }

  query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const [rows] = await pool.query(query, params);
  
  // Get total count
  let countQuery = `
    SELECT COUNT(*) as total FROM reports r WHERE 1=1
  `;
  const countParams = [];
  
  if (search) {
    countQuery += ' AND r.title LIKE ?';
    countParams.push(`%${search}%`);
  }
  if (category_id) {
    countQuery += ' AND r.category_id = ?';
    countParams.push(category_id);
  }
  if (status) {
    countQuery += ' AND r.status = ?';
    countParams.push(status);
  }

  const [countResult] = await pool.query(countQuery, countParams);
  
  return {
    data: rows,
    total: countResult[0].total,
    limit: parseInt(limit),
    offset: parseInt(offset)
  };
};

// Get report by ID
const getReportById = async (id) => {
  const [rows] = await pool.query(`
    SELECT r.*, c.name as category_name
    FROM reports r
    LEFT JOIN categories c ON r.category_id = c.id
    WHERE r.id = ?
  `, [id]);
  return rows[0];
};

// Get report by UUID
const getReportByUuid = async (uuid) => {
  const [rows] = await pool.query(`
    SELECT r.*, c.name as category_name
    FROM reports r
    LEFT JOIN categories c ON r.category_id = c.id
    WHERE r.uuid = ?
  `, [uuid]);
  return rows[0];
};

// Create report
const createReport = async (data) => {
  const uuid = uuidv4();
  const {
    title,
    category_id,
    chu_tri,
    phoi_hop,
    file_count = 0,
    link_url,
    status = 'chua_xu_ly',
    result,
    created_by
  } = data;

  const [insertResult] = await pool.query(`
    INSERT INTO reports 
    (uuid, title, category_id, chu_tri, phoi_hop, file_count, link_url, status, result, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [uuid, title, category_id, chu_tri, phoi_hop, file_count, link_url, status, result, created_by]);

  return getReportById(insertResult.insertId);
};

// Update report
const updateReport = async (id, data) => {
  const {
    title,
    category_id,
    chu_tri,
    phoi_hop,
    file_count,
    link_url,
    status,
    result
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
  if (chu_tri !== undefined) {
    updates.push('chu_tri = ?');
    params.push(chu_tri);
  }
  if (phoi_hop !== undefined) {
    updates.push('phoi_hop = ?');
    params.push(phoi_hop);
  }
  if (file_count !== undefined) {
    updates.push('file_count = ?');
    params.push(file_count);
  }
  if (link_url !== undefined) {
    updates.push('link_url = ?');
    params.push(link_url);
  }
  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
  }
  if (result !== undefined) {
    updates.push('result = ?');
    params.push(result);
  }

  if (updates.length === 0) {
    return getReportById(id);
  }

  params.push(id);
  await pool.query(`UPDATE reports SET ${updates.join(', ')} WHERE id = ?`, params);
  
  return getReportById(id);
};

// Delete report
const deleteReport = async (id) => {
  const [result] = await pool.query('DELETE FROM reports WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

module.exports = {
  getAllReports,
  getReportById,
  getReportByUuid,
  createReport,
  updateReport,
  deleteReport
};
