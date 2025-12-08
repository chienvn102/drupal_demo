const express = require('express');
const router = express.Router();
const taskModel = require('../models/taskModel');

// GET /api/tasks - Get all tasks with filters
router.get('/', async (req, res) => {
  try {
    const { user_id, status, priority, search, limit, offset } = req.query;
    
    const result = await taskModel.getAllTasks({
      user_id,
      status,
      priority,
      search,
      limit: limit || 50,
      offset: offset || 0
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error.message
    });
  }
});

// GET /api/tasks/user/:userId - Get tasks by user ID
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, priority, search, limit, offset } = req.query;
    
    const result = await taskModel.getTasksByUserId(userId, {
      status,
      priority,
      search,
      limit: limit || 50,
      offset: offset || 0
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fetching user tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user tasks',
      error: error.message
    });
  }
});

// GET /api/tasks/user/:userId/upcoming - Get upcoming tasks
router.get('/user/:userId/upcoming', async (req, res) => {
  try {
    const { userId } = req.params;
    const { days } = req.query;
    
    const tasks = await taskModel.getUpcomingTasks(userId, days || 7);

    res.json({
      success: true,
      data: tasks,
      count: tasks.length
    });
  } catch (error) {
    console.error('Error fetching upcoming tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming tasks',
      error: error.message
    });
  }
});

// GET /api/tasks/user/:userId/overdue - Get overdue tasks
router.get('/user/:userId/overdue', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const tasks = await taskModel.getOverdueTasks(userId);

    res.json({
      success: true,
      data: tasks,
      count: tasks.length
    });
  } catch (error) {
    console.error('Error fetching overdue tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overdue tasks',
      error: error.message
    });
  }
});

// GET /api/tasks/:id - Get task by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const task = await taskModel.getTaskById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task',
      error: error.message
    });
  }
});

// POST /api/tasks - Create a task
router.post('/', async (req, res) => {
  try {
    const { user_id, title, description, status, priority, due_date } = req.body;

    // Validation
    if (!user_id || !title || !due_date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: user_id, title, due_date'
      });
    }

    const task = await taskModel.createTask({
      user_id,
      title,
      description,
      status,
      priority,
      due_date
    });

    res.status(201).json({
      success: true,
      data: task,
      message: 'Task created successfully'
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task',
      error: error.message
    });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, due_date, completed_at } = req.body;

    const task = await taskModel.updateTask(id, {
      title,
      description,
      status,
      priority,
      due_date,
      completed_at
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: task,
      message: 'Task updated successfully'
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task',
      error: error.message
    });
  }
});

// PATCH /api/tasks/:id/status - Update task status
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

    const task = await taskModel.updateTask(id, { status });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: task,
      message: 'Task status updated successfully'
    });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task status',
      error: error.message
    });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await taskModel.deleteTask(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task',
      error: error.message
    });
  }
});

module.exports = router;
