const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const passport = require("passport");
router.get("/test", (req, res) => res.json({ msg: "post Works" }));

const Post = require("../../models/Post");
const Profile = require("../../models/Profile");

//  Validation
const validatePostInput = require("../../validation/post");

// @route   GET api/posts
// @desc    Get post
// @access  Public

router.get("/", async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 });
    res.json(posts);
  } catch (error) {
    res.status(404).json({ nopostfound: "No post posts found" });
  }
});

// @route   GET api/post/:id
// @desc    Get post by id
// @access  Public

router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    res.json(post);
  } catch (error) {
    res.status(404).json({ nopostfound: "No post found with that ID" });
  }
});

// @route   POST api/posts
// @desc    Create post
// @access  Private

router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);

    //Check Validation
    if (!isValid) {
      //  if any errors, send 400 with errors object
      return res.status(400).json(errors);
    }
    const newPost = new Post({
      text: req.body.text,
      name: req.body.name,
      avatar: req.body.avatar,
      user: req.user.id
    });
    const post = await newPost.save();
    res.json(post);
  }
);

// @route   POST api/posts/:id
// @desc    Delete post
// @access  Private
router.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const profile = await Profile.findOne({ user: req.user.id });
      const post = await Post.findById(req.params.id);
      //Check post Owner
      if (post.user.toString() !== req.user.id) {
        return res.status(401).json({ notauthorized: "User not authorized" });
      }

      //Delete
      post.remove();
      res.json({ success: true });
    } catch (error) {
      res.status(404).json({ postnotfound: "No post found" });
    }
  }
);

// @route   POST api/posts/like/:id
// @desc    Like post
// @access  Private
router.post(
  "/like/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const profile = await Profile.findOne({ user: req.user.id });
    const post = await Post.findById(req.params.id);
    //Check post Owner
    if (
      post.likes.filter(like => like.user.toString() === req.user.id).length > 0
    ) {
      return res
        .status(400)
        .json({ alreadyliked: "User already liked this post" });
    }
    //  Add user id to likes array
    post.likes.unshift({ user: req.user.id });

    await post.save();
    res.json(post);
  }
);

// @route   POST api/posts/unlike/:id
// @desc    Like post
// @access  Private
router.post(
  "/unlike/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const profile = await Profile.findOne({ user: req.user.id });
    const post = await Post.findById(req.params.id);
    //Check post Owner
    if (
      post.likes.filter(like => like.user.toString() === req.user.id).length ===
      0
    ) {
      return res
        .status(400)
        .json({ notliked: "You have not yet liked this post" });
    }
    //Get removed index
    const removeIndex = post.likes
      .map(item => item.user.toString())
      .indexOf(req.user.id);

    //  Splice out of array
    post.likes.splice(removeIndex, 1);

    await post.save();
    res.json(post);
  }
);

// @route   POST api/posts/comment/:id
// @desc    Add comment to post
// @access  Private
router.post(
  "/comment/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);
    //Check Validation
    if (!isValid) {
      //  if any errors, send 400 with errors object
      return res.status(400).json(errors);
    }

    const post = await Post.findById(req.params.id);
    const newComment = {
      text: req.body.text,
      name: req.body.name,
      avatar: req.body.avatar,
      user: req.user.id
    };

    // Add to comments array
    post.comments.unshift(newComment);

    //  Save
    await post.save();
    res.json(post);
  }
);

// @route   DELETE api/posts/comment/:id/:comment_id
// @desc    Remove comment from post
// @access  Private

router.delete(
  "/comment/:id/:comment_id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);
    //Check to see if comment exists
    const post = await Post.findById(req.params.id);

    if (
      post.comments.filter(
        comment => comment._id.toString() === req.params.comment_id
      ).length === 0
    ) {
      return res
        .status(404)
        .json({ commentnotexists: "Comment does not exists" });
    }

    const removeIndex = post.comments.map(item =>
      item._id.toString().indexOf(req.params.comment_id)
    );
    //  Splice comment out of array
    post.comments.splice(removeIndex, 1);
    await post.save();
    res.json(post);
  }
);

module.exports = router;
