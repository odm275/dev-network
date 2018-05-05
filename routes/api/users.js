const express = require("express");
const router = express.Router();
const gravatar = require("gravatar");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const keys = require("../../config/keys");
const passport = require("passport");

//  Load Input validation
const validateRegisterInput = require("../../validation/register");
const validateLoginInput = require("../../validation/login");

const User = require("../../models/User");

// @route GET api/users/test
// @desc Tests users route
// @acess Public

router.get("/test", (req, res) => res.json({ msg: "Users Works" }));

// @route GET api/users/register
// @desc Register user
// @acess Public
router.post("/register", async (req, res) => {
  const { errors, isValid } = validateRegisterInput(req.body);
  // Check Validation
  if (!isValid) {
    return res.status(400).json(errors);
  }

  const { name, email, password } = req.body;
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    errors.email = "Email already exists";
    return res.status(400).json(errors);
  }

  const avatar = gravatar.url(email, {
    s: "200", // Size
    r: "pg", // Rating
    d: "mm" // Default
  });

  const user = new User({
    name,
    email,
    avatar,
    password
  });

  try {
    // generate a salt
    const salt = await bcrypt.genSalt(10);

    // hash the password along with our new salt
    const hash = await bcrypt.hash(user.password, salt);

    // override the cleartext password with the hashed one
    user.password = hash;

    // save the new user
    const newUser = await user.save();

    return res.json(newUser);
  } catch (error) {
    throw error;
  }
});
// @route GET api/users/login
// @desc login user / Returning JWToken
// @access Public

router.post("/login", async (req, res) => {
  const { errors, isValid } = validateLoginInput(req.body);
  //Check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }

  const email = req.body.email;
  const password = req.body.password;

  //Find user by email
  const user = await User.findOne({ email });
  if (!user) {
    errors.email = "User not found";
    return res.status(404).json({ errors });
  }
  //Matched user, now check password
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    errors.password = "Password incorrect";
    return res.status(404).json({ password: "Password incorrect" });
  }
  const payload = { id: user.id, name: user.name, avatar: user.avatar }; //JWT payload
  // Sign Token
  jwt.sign(payload, keys.secretOrKey, { expiresIn: 3600 }, (err, token) => {
    res.json({
      success: true,
      token: `Bearer ${token}`
    });
  });
});

// @route GET api/users/current
// @desc  Returning current user
// @access Private aka need token
router.get(
  "/current",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    res.json({
      id: req.user.id,
      name: req.user.name,
      email: req.user.email
    });
  }
);

module.exports = router;
