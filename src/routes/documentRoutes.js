const express = require('express');
const router = express.Router();
const documentModel = require('../models/documentModel');

// GET /api/documents - Get all documents with filters
router.get('/', async (req, res) => {
  try {
    const { search, category_id, document_type, limit, offset } = req.query;
    
    const result = await documentModel.getAllDocuments({
      search,
      category_id,
      document_type,
      limit: limit || 50,
      offset: offset || 0
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents',
      error: error.message
    });
  }
});

// GET /api/documents/:id - Get document by ID
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let document;

    // Check if ID is UUID or numeric ID
    if (id.includes('-')) {
      document = await documentModel.getDocumentByUuid(id);
    } else {
      document = await documentModel.getDocumentById(id);
    }

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document',
      error: error.message
    });
  }
});

// POST /api/documents - Create new document
router.post('/', async (req, res) => {
  try {
    const {
      title,
      category_id,
      content,
      is_important,
      document_type,
      file_url,
      link_url,
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

    const document = await documentModel.createDocument({
      title,
      category_id,
      content,
      is_important: is_important ? 1 : 0,
      document_type: document_type || 'van_ban',
      file_url,
      link_url,
      created_by
    });

    res.status(201).json({
      success: true,
      message: 'Document created successfully',
      data: document
    });
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create document',
      error: error.message
    });
  }
});

// PUT /api/documents/:id - Update document
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let existing;

    // Check if ID is UUID or numeric ID
    if (id.includes('-')) {
      existing = await documentModel.getDocumentByUuid(id);
    } else {
      existing = await documentModel.getDocumentById(id);
    }

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const {
      title,
      category_id,
      content,
      is_important,
      document_type,
      file_url,
      link_url
    } = req.body;

    const document = await documentModel.updateDocument(existing.id, {
      title,
      category_id,
      content,
      is_important: is_important !== undefined ? (is_important ? 1 : 0) : undefined,
      document_type,
      file_url,
      link_url
    });

    res.json({
      success: true,
      message: 'Document updated successfully',
      data: document
    });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update document',
      error: error.message
    });
  }
});

// PATCH /api/documents/:id - Partial update document (like Drupal JSON:API)
router.patch('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let existing;

    // Check if ID is UUID or numeric ID
    if (id.includes('-')) {
      existing = await documentModel.getDocumentByUuid(id);
    } else {
      existing = await documentModel.getDocumentById(id);
    }

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const document = await documentModel.updateDocument(existing.id, req.body);

    res.json({
      success: true,
      message: 'Document updated successfully',
      data: document
    });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update document',
      error: error.message
    });
  }
});

// DELETE /api/documents/:id - Delete document
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let existing;

    // Check if ID is UUID or numeric ID
    if (id.includes('-')) {
      existing = await documentModel.getDocumentByUuid(id);
    } else {
      existing = await documentModel.getDocumentById(id);
    }

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    await documentModel.deleteDocument(existing.id);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document',
      error: error.message
    });
  }
});

module.exports = router;
