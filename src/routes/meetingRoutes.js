const express = require('express');
const router = express.Router();
const meetingModel = require('../models/meetingModel');

// GET /api/meetings - Get all meetings with filters
router.get('/', async (req, res) => {
  try {
    const { user_id, status, search, from_date, to_date, limit, offset } = req.query;
    
    const result = await meetingModel.getAllMeetings({
      user_id,
      status,
      search,
      from_date,
      to_date,
      limit: limit || 50,
      offset: offset || 0
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch meetings',
      error: error.message
    });
  }
});

// GET /api/meetings/user/:userId - Get meetings by user ID
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, search, from_date, to_date, limit, offset } = req.query;
    
    const result = await meetingModel.getMeetingsByUserId(userId, {
      status,
      search,
      from_date,
      to_date,
      limit: limit || 50,
      offset: offset || 0
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fetching user meetings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user meetings',
      error: error.message
    });
  }
});

// GET /api/meetings/user/:userId/upcoming - Get upcoming meetings
router.get('/user/:userId/upcoming', async (req, res) => {
  try {
    const { userId } = req.params;
    const { days } = req.query;
    
    const meetings = await meetingModel.getUpcomingMeetings(userId, days || 7);

    res.json({
      success: true,
      data: meetings,
      count: meetings.length
    });
  } catch (error) {
    console.error('Error fetching upcoming meetings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming meetings',
      error: error.message
    });
  }
});

// GET /api/meetings/:id - Get meeting by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await meetingModel.getMeetingById(id);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    res.json({
      success: true,
      data: meeting
    });
  } catch (error) {
    console.error('Error fetching meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch meeting',
      error: error.message
    });
  }
});

// GET /api/meetings/:id/participants - Get meeting participants
router.get('/:id/participants', async (req, res) => {
  try {
    const { id } = req.params;
    const participants = await meetingModel.getMeetingParticipants(id);

    res.json({
      success: true,
      data: participants,
      count: participants.length
    });
  } catch (error) {
    console.error('Error fetching meeting participants:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch meeting participants',
      error: error.message
    });
  }
});

// POST /api/meetings - Create a meeting
router.post('/', async (req, res) => {
  try {
    const { 
      organizer_id, 
      title, 
      description, 
      meeting_time,
      duration,
      location,
      meeting_url,
      status,
      participants
    } = req.body;

    // Validation
    if (!organizer_id || !title || !meeting_time) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: organizer_id, title, meeting_time'
      });
    }

    const meeting = await meetingModel.createMeeting({
      organizer_id,
      title,
      description,
      meeting_time,
      duration,
      location,
      meeting_url,
      status,
      participants
    });

    res.status(201).json({
      success: true,
      data: meeting,
      message: 'Meeting created successfully'
    });
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create meeting',
      error: error.message
    });
  }
});

// PUT /api/meetings/:id - Update meeting
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      meeting_time,
      duration,
      location,
      meeting_url,
      status
    } = req.body;

    const meeting = await meetingModel.updateMeeting(id, {
      title,
      description,
      meeting_time,
      duration,
      location,
      meeting_url,
      status
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    res.json({
      success: true,
      data: meeting,
      message: 'Meeting updated successfully'
    });
  } catch (error) {
    console.error('Error updating meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update meeting',
      error: error.message
    });
  }
});

// PATCH /api/meetings/:id/status - Update meeting status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'status is required'
      });
    }

    const meeting = await meetingModel.updateMeeting(id, { status });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    res.json({
      success: true,
      data: meeting,
      message: 'Meeting status updated successfully'
    });
  } catch (error) {
    console.error('Error updating meeting status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update meeting status',
      error: error.message
    });
  }
});

// DELETE /api/meetings/:id - Delete meeting
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await meetingModel.deleteMeeting(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    res.json({
      success: true,
      message: 'Meeting deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete meeting',
      error: error.message
    });
  }
});

// POST /api/meetings/:id/participants - Add participant to meeting
router.post('/:id/participants', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required'
      });
    }

    const success = await meetingModel.addParticipant(id, user_id);

    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'Participant already added or meeting not found'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Participant added successfully'
    });
  } catch (error) {
    console.error('Error adding participant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add participant',
      error: error.message
    });
  }
});

// DELETE /api/meetings/:id/participants/:userId - Remove participant from meeting
router.delete('/:id/participants/:userId', async (req, res) => {
  try {
    const { id, userId } = req.params;
    const success = await meetingModel.removeParticipant(id, userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found in this meeting'
      });
    }

    res.json({
      success: true,
      message: 'Participant removed successfully'
    });
  } catch (error) {
    console.error('Error removing participant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove participant',
      error: error.message
    });
  }
});

// PATCH /api/meetings/:id/participants/:userId/response - Update participant response
router.patch('/:id/participants/:userId/response', async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { response_status } = req.body;

    if (!response_status) {
      return res.status(400).json({
        success: false,
        message: 'response_status is required (accepted, declined, tentative)'
      });
    }

    const success = await meetingModel.updateParticipantResponse(id, userId, response_status);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found in this meeting'
      });
    }

    res.json({
      success: true,
      message: 'Participant response updated successfully'
    });
  } catch (error) {
    console.error('Error updating participant response:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update participant response',
      error: error.message
    });
  }
});

module.exports = router;
