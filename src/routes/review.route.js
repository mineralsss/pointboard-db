const express = require("express");
const router = express.Router();
const Review = require("../models/review.model");
const auth = require("../middlewares/auth.middleware");

// GET all reviews (public)
router.get("/", async (req, res) => {
  try {
    const reviews = await Review.find({})
      .populate('user', 'firstName lastName email')
      .populate('product', 'name')
      .populate('order', 'orderNumber');
    res.status(200).json({ success: true, reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// GET review by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('product', 'name')
      .populate('order', 'orderNumber');
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    res.status(200).json({ success: true, review });
  } catch (error) {
    console.error('Error fetching review:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// POST a new review (authenticated)
router.post('/', auth(), async (req, res) => {
  try {
    const { product, order, rating, comment } = req.body;
    if (!product || !order || !rating) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const review = new Review({
      user: req.user._id,
      product,
      order,
      rating,
      comment
    });
    await review.save();
    res.status(201).json({ success: true, review });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router; 