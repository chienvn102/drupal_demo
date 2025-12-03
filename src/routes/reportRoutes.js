const express = require('express');
const router = express.Router();
const reportModel = require('../models/reportModel');

// GET /api/reports - Get all reports with filters
router.get('/', async (req, res) => {
  try {
    const { search, category_id, status, limit, offset } = req.query;
    
    const result = await reportModel.getAllReports({
      search,
      category_id,
      status,
      limit: limit || 50,
      offset: offset || 0
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
      error: error.message
    });
  }
});

// GET /api/reports/:id - Get report by ID
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let report;

    // Check if ID is UUID or numeric ID
    if (id.includes('-')) {
      report = await reportModel.getReportByUuid(id);
    } else {
      report = await reportModel.getReportById(id);
    }

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report',
      error: error.message
    });
  }
});

// POST /api/reports - Create new report
router.post('/', async (req, res) => {
  try {
    const {
      title,
      category_id,
      chu_tri,
      phoi_hop,
      file_count,
      link_url,
      status,
      result,
      created_by
    } = req.body;

    // Validation
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    if (!category_id) {
      return res.status(400).json({
        success: false,
        message: 'Category ID is required'
      });
    }

    const report = await reportModel.createReport({
      title,
      category_id,
      chu_tri,
      phoi_hop,
      file_count: file_count || 0,
      link_url,
      status: status || 'chua_xu_ly',
      result,
      created_by
    });

    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      data: report
    });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create report',
      error: error.message
    });
  }
});

// PUT /api/reports/:id - Update report
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let existing;

    // Check if ID is UUID or numeric ID
    if (id.includes('-')) {
      existing = await reportModel.getReportByUuid(id);
    } else {
      existing = await reportModel.getReportById(id);
    }

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const {
      title,
      category_id,
      chu_tri,
      phoi_hop,
      file_count,
      link_url,
      status,
      result
    } = req.body;

    const report = await reportModel.updateReport(existing.id, {
      title,
      category_id,
      chu_tri,
      phoi_hop,
      file_count,
      link_url,
      status,
      result
    });

    res.json({
      success: true,
      message: 'Report updated successfully',
      data: report
    });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update report',
      error: error.message
    });
  }
});

// PATCH /api/reports/:id - Partial update report (like Drupal JSON:API)
router.patch('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let existing;

    // Check if ID is UUID or numeric ID
    if (id.includes('-')) {
      existing = await reportModel.getReportByUuid(id);
    } else {
      existing = await reportModel.getReportById(id);
    }

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const report = await reportModel.updateReport(existing.id, req.body);

    res.json({
      success: true,
      message: 'Report updated successfully',
      data: report
    });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update report',
      error: error.message
    });
  }
});

// DELETE /api/reports/:id - Delete report
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let existing;

    // Check if ID is UUID or numeric ID
    if (id.includes('-')) {
      existing = await reportModel.getReportByUuid(id);
    } else {
      existing = await reportModel.getReportById(id);
    }

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    await reportModel.deleteReport(existing.id);

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete report',
      error: error.message
    });
  }
});

module.exports = router;
