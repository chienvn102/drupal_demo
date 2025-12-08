const { pool } = require('../config/database');

// Get all meetings with filters
const getAllMeetings = async (filters = {}) => {
  const { user_id, status, search, from_date, to_date, limit = 50, offset = 0 } = filters;
  
  let query = `
    SELECT 
      m.id,
      m.title,
      m.description,
      m.organizer_id,
      u.username as organizer_username,
      u.full_name as organizer_name,
      m.meeting_time,
      m.duration,
      m.location,
      m.meeting_url,
      m.status,
      m.created_at,
      m.updated_at
    FROM meetings m
    LEFT JOIN users u ON m.organizer_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (user_id) {
    query += ` AND (m.organizer_id = ? OR m.id IN (
      SELECT meeting_id FROM meeting_participants WHERE user_id = ?
    ))`;
    params.push(user_id, user_id);
  }

  if (status) {
    query += ' AND m.status = ?';
    params.push(status);
  }

  if (search) {
    query += ' AND (m.title LIKE ? OR m.description LIKE ? OR m.location LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (from_date) {
    query += ' AND m.meeting_time >= ?';
    params.push(from_date);
  }

  if (to_date) {
    query += ' AND m.meeting_time <= ?';
    params.push(to_date);
  }

  query += ' ORDER BY m.meeting_time ASC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const [rows] = await pool.query(query, params);
  
  // Get participants for each meeting
  for (let meeting of rows) {
    const participants = await getMeetingParticipants(meeting.id);
    meeting.participants = participants;
  }
  
  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM meetings m WHERE 1=1';
  const countParams = [];
  
  if (user_id) {
    countQuery += ` AND (m.organizer_id = ? OR m.id IN (
      SELECT meeting_id FROM meeting_participants WHERE user_id = ?
    ))`;
    countParams.push(user_id, user_id);
  }
  if (status) {
    countQuery += ' AND m.status = ?';
    countParams.push(status);
  }
  if (search) {
    countQuery += ' AND (m.title LIKE ? OR m.description LIKE ? OR m.location LIKE ?)';
    countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (from_date) {
    countQuery += ' AND m.meeting_time >= ?';
    countParams.push(from_date);
  }
  if (to_date) {
    countQuery += ' AND m.meeting_time <= ?';
    countParams.push(to_date);
  }

  const [countResult] = await pool.query(countQuery, countParams);

  return {
    data: rows,
    total: countResult[0].total,
    limit: parseInt(limit),
    offset: parseInt(offset)
  };
};

// Get meeting by ID
const getMeetingById = async (id) => {
  const query = `
    SELECT 
      m.id,
      m.title,
      m.description,
      m.organizer_id,
      u.username as organizer_username,
      u.full_name as organizer_name,
      m.meeting_time,
      m.duration,
      m.location,
      m.meeting_url,
      m.status,
      m.created_at,
      m.updated_at
    FROM meetings m
    LEFT JOIN users u ON m.organizer_id = u.id
    WHERE m.id = ?
  `;
  const [rows] = await pool.query(query, [id]);
  
  if (rows[0]) {
    const participants = await getMeetingParticipants(id);
    rows[0].participants = participants;
  }
  
  return rows[0] || null;
};

// Get meeting participants
const getMeetingParticipants = async (meetingId) => {
  const query = `
    SELECT 
      mp.id,
      mp.user_id,
      u.username,
      u.full_name,
      u.email,
      mp.response_status,
      mp.joined_at
    FROM meeting_participants mp
    LEFT JOIN users u ON mp.user_id = u.id
    WHERE mp.meeting_id = ?
    ORDER BY mp.created_at ASC
  `;
  const [rows] = await pool.query(query, [meetingId]);
  return rows;
};

// Create meeting
const createMeeting = async (data) => {
  const { 
    organizer_id, 
    title, 
    description, 
    meeting_time,
    duration = 60,
    location,
    meeting_url,
    status = 'scheduled',
    participants = []
  } = data;

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Insert meeting
    const query = `
      INSERT INTO meetings 
      (organizer_id, title, description, meeting_time, duration, location, meeting_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await connection.query(query, [
      organizer_id,
      title,
      description,
      meeting_time,
      duration,
      location,
      meeting_url,
      status
    ]);

    const meetingId = result.insertId;

    // Add participants
    if (participants.length > 0) {
      const participantQuery = `
        INSERT INTO meeting_participants (meeting_id, user_id)
        VALUES (?, ?)
      `;
      
      for (let userId of participants) {
        await connection.query(participantQuery, [meetingId, userId]);
      }
    }

    await connection.commit();
    return getMeetingById(meetingId);
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Update meeting
const updateMeeting = async (id, data) => {
  const { 
    title, 
    description, 
    meeting_time,
    duration,
    location,
    meeting_url,
    status
  } = data;

  let query = 'UPDATE meetings SET updated_at = NOW()';
  const params = [];

  if (title !== undefined) {
    query += ', title = ?';
    params.push(title);
  }
  if (description !== undefined) {
    query += ', description = ?';
    params.push(description);
  }
  if (meeting_time !== undefined) {
    query += ', meeting_time = ?';
    params.push(meeting_time);
  }
  if (duration !== undefined) {
    query += ', duration = ?';
    params.push(duration);
  }
  if (location !== undefined) {
    query += ', location = ?';
    params.push(location);
  }
  if (meeting_url !== undefined) {
    query += ', meeting_url = ?';
    params.push(meeting_url);
  }
  if (status !== undefined) {
    query += ', status = ?';
    params.push(status);
  }

  query += ' WHERE id = ?';
  params.push(id);

  const [result] = await pool.query(query, params);
  
  if (result.affectedRows === 0) {
    return null;
  }

  return getMeetingById(id);
};

// Delete meeting
const deleteMeeting = async (id) => {
  const query = 'DELETE FROM meetings WHERE id = ?';
  const [result] = await pool.query(query, [id]);
  return result.affectedRows > 0;
};

// Add participant to meeting
const addParticipant = async (meetingId, userId) => {
  const query = `
    INSERT INTO meeting_participants (meeting_id, user_id)
    VALUES (?, ?)
  `;
  
  try {
    await pool.query(query, [meetingId, userId]);
    return true;
  } catch (error) {
    // Handle duplicate entry
    if (error.code === 'ER_DUP_ENTRY') {
      return false;
    }
    throw error;
  }
};

// Remove participant from meeting
const removeParticipant = async (meetingId, userId) => {
  const query = 'DELETE FROM meeting_participants WHERE meeting_id = ? AND user_id = ?';
  const [result] = await pool.query(query, [meetingId, userId]);
  return result.affectedRows > 0;
};

// Update participant response
const updateParticipantResponse = async (meetingId, userId, responseStatus) => {
  const query = `
    UPDATE meeting_participants 
    SET response_status = ?, updated_at = NOW()
    WHERE meeting_id = ? AND user_id = ?
  `;
  const [result] = await pool.query(query, [responseStatus, meetingId, userId]);
  return result.affectedRows > 0;
};

// Get upcoming meetings for a user
const getUpcomingMeetings = async (userId, days = 7) => {
  const query = `
    SELECT 
      m.id,
      m.title,
      m.description,
      m.organizer_id,
      u.username as organizer_username,
      u.full_name as organizer_name,
      m.meeting_time,
      m.duration,
      m.location,
      m.meeting_url,
      m.status
    FROM meetings m
    LEFT JOIN users u ON m.organizer_id = u.id
    WHERE m.status = 'scheduled'
    AND m.meeting_time BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? DAY)
    AND (m.organizer_id = ? OR m.id IN (
      SELECT meeting_id FROM meeting_participants WHERE user_id = ?
    ))
    ORDER BY m.meeting_time ASC
  `;
  const [rows] = await pool.query(query, [days, userId, userId]);
  
  // Get participants for each meeting
  for (let meeting of rows) {
    const participants = await getMeetingParticipants(meeting.id);
    meeting.participants = participants;
  }
  
  return rows;
};

// Get meetings by user ID
const getMeetingsByUserId = async (userId, filters = {}) => {
  return getAllMeetings({ ...filters, user_id: userId });
};

module.exports = {
  getAllMeetings,
  getMeetingById,
  getMeetingParticipants,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  addParticipant,
  removeParticipant,
  updateParticipantResponse,
  getUpcomingMeetings,
  getMeetingsByUserId
};
