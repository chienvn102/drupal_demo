const express = require('express');
const router = express.Router();
const categoryModel = require('../models/categoryModel');

// GET /api/categories - Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await categoryModel.getAllCategories();
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
});

// GET /api/categories/:id - Get category by ID
router.get('/:id', async (req, res) => {
  try {
    const category = await categoryModel.getCategoryById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category',
      error: error.message
    });
  }
});

// GET /api/categories/:id/children - Get child categories
router.get('/:id/children', async (req, res) => {
  try {
    const children = await categoryModel.getChildCategories(req.params.id);
    res.json({
      success: true,
      data: children
    });
  } catch (error) {
    console.error('Error fetching child categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch child categories',
      error: error.message
    });
  }
});

// POST /api/categories - Create new category
router.post('/', async (req, res) => {
  try {
    const { name, slug, description, parent_id } = req.body;
    
    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: 'Name and slug are required'
      });
    }

    const category = await categoryModel.createCategory({
      name,
      slug,
      description,
      parent_id
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message
    });
  }
});

// PUT /api/categories/:id - Update category
router.put('/:id', async (req, res) => {
  try {
    const { name, slug, description, parent_id } = req.body;
    
    const existing = await categoryModel.getCategoryById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const category = await categoryModel.updateCategory(req.params.id, {
      name: name || existing.name,
      slug: slug || existing.slug,
      description: description !== undefined ? description : existing.description,
      parent_id: parent_id !== undefined ? parent_id : existing.parent_id
    });

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message
    });
  }
});

// DELETE /api/categories/:id - Delete category
router.delete('/:id', async (req, res) => {
  try {
    const existing = await categoryModel.getCategoryById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    await categoryModel.deleteCategory(req.params.id);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message
    });
  }
});

module.exports = router;
