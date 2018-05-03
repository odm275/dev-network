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
  //Check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }

  const findUser = await User.findOne({ email: req.body.email });
  if (findUser) {
    errors.email = "Email already exists";
    return res.status(400).json(errors);
  }
  const avatar = gravatar.url(req.body.email, {
    s: "200", // Size,
    r: "pg", // Rating,
    d: "mm"
  });

  const newUser = new User({
    name: req.body.name,
    email: req.body.email,
    avatar,
    password: req.body.password
  });
  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(newUser.password, salt, async (error, hash) => {
      try {
        if (err) throw err;
        newUser.password = hash;
        const user = await newUser.save();
        console.log("user registered succesfully");
      } catch (error) {
        console.log(error);
      }
    });
  });
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
