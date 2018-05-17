const { AsyncResource } = require("async_hooks");

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const passport = require("passport");
//Load validation middleware
const validateProfileInput = require("../../validation/profile");
const validateExperienceInput = require("../../validation/experience");
const validateEducationInput = require("../../validation/education");

//Load Profile Model
const Profile = require("../../models/Profile");
const User = require("../../models/User");

// @route GET api/profile/test
// @desc Tests profile route
// @acess Public
router.get("/test", (req, res) => res.json({ msg: "Profile Works" }));

// @route   GET api/profile
// @desc    Get current users profile
// @access  Private
router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const errors = {};

    Profile.findOne({ user: req.user.id })
      .populate("user", ["name", "avatar"])
      .then(profile => {
        if (!profile) {
          errors.noprofile = "There is no profile for this user";
          return res.status(404).json(errors);
        }
        res.json(profile);
      })
      .catch(err => res.status(404).json(err));
  }
);

// @route GET api/profile
// @desc Get currrent users profile
// @acess Public
router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { errors, isValid } = validateProfileInput(req.body);
    // Check Validation
    if (!isValid) {
      // Return any errors with 400 status
      return res.status(400).json(errors);
    }
    //Format our data to match out model's architecture.
    const profileFields = {};
    profileFields.user = req.user.id;
    if (req.body.handle) profileFields.handle = req.body.handle;
    if (req.body.company) profileFields.company = req.body.company;
    if (req.body.website) profileFields.website = req.body.website;
    if (req.body.location) profileFields.location = req.body.location;
    if (req.body.bio) profileFields.bio = req.body.bio;
    if (req.body.status) profileFields.status = req.body.status;
    if (req.body.githubusername)
      profileFields.githubusername = req.body.githubusername;
    // Skills - Spilt into array
    if (typeof req.body.skills !== "undefined") {
      profileFields.skills = req.body.skills.split(",");
    }
    // Social
    profileFields.social = {};
    if (req.body.youtube) profileFields.social.youtube = req.body.youtube;
    if (req.body.twitter) profileFields.social.twitter = req.body.twitter;
    if (req.body.facebook) profileFields.social.facebook = req.body.facebook;
    if (req.body.linkedin) profileFields.social.linkedin = req.body.linkedin;
    if (req.body.instagram) profileFields.social.instagram = req.body.instagram;

    const profile = await Profile.findOne({ user: req.user.id });

    if (!profile) {
      // If there's no profile, then create one.
      //  Check if handle exists. We want unique handles.
      const handle = await Profile.findOne({ handle: profileFields.handle });
      if (handle) {
        errors.handle = "That handle already exists";
        res.status(400).json(errors);
      }
      const newProfile = await new Profile(profileFields).save();
      res.json(newProfile);
    }
    const updatedProfile = await Profile.findOneAndUpdate(
      { user: req.user.id },
      { $set: profileFields },
      { new: true }
    );
    res.json(updatedProfile);
  }
);

// @route GET api/profile/all
// @desc Get all profiles
// @access Public

router.get("/all", async (req, res) => {
  try {
    let errors = {};

    const profiles = await Profile.find().populate("user", ["name", "avatar"]);
    if (!profiles) {
      errors.noprofile = "There are no profiles, website DEAD";
      return res.status(404).json(errors);
    }
    res.json(profiles);
  } catch (errors) {
    res.status(404).json({ profile: "There are no profiles" });
  }
});

// @route GET api/profile/handle/:handle
// @desc Get profile by handle
// @access Public

router.get("/handle/:handle", async (req, res) => {
  let errors = {};
  console.log(req.body);
  const profile = await Profile.findOne({ handle: req.params.handle }).populate(
    "user",
    ["name", "avatar"]
  );
  if (!profile) {
    errors.noprofile = "There is no profile for this user";
    res.status(404).json(errors);
  }
  res.json(profile);
});

// @route GET api/profile/user/:user_id
// @desc Get profile by user ID
// @access Public

router.get("/user/:user_id", async (req, res) => {
  let errors = {};
  const profile = await Profile.findOne({ user: req.params.user_id }).populate(
    "user",
    ["name", "avatar"]
  );
  if (!profile) {
    errors.noprofile = "There is no profile for this user";
    res.status(404).json(errors);
  }
  res.json(profile);
});

// @route POST api/profile/experience
// @desc Add experience to profile
// @access Private

router.post(
  "/experience",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { errors, isValid } = validateExperienceInput(req.body);
    const profile = await Profile.findOne({ user: req.user.id });

    if (!isValid) {
      return res.status(400).json(errors);
    }

    const newExp = {
      title: req.body.title,
      company: req.body.company,
      location: req.body.location,
      from: req.body.from,
      to: req.body.to,
      current: req.body.current,
      description: req.body.description
    };
    //  Add to exp array
    profile.experience.unshift(newExp);
    await profile.save();
    res.json(profile);
  }
);

// @route POST api/profile/education
// @desc Add education to profile
// @access Private

router.post(
  "/education",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { errors, isValid } = validateEducationInput(req.body);
    const profile = await Profile.findOne({ user: req.user.id });

    if (!isValid) {
      return res.status(400).json(errors);
    }
    console.log(req.body.field);

    const newEdu = {
      school: req.body.school,
      degree: req.body.degree,
      field: req.body.field,
      from: req.body.from,
      to: req.body.to,
      current: req.body.current,
      description: req.body.description
    };
    //  Add to exp array

    profile.education.unshift(newEdu);
    await profile.save();
    res.json(profile);
  }
);

// @route DELETE api/profile/experience/:exp_id
// @desc Delete experience from profile
// @access Private

router.delete(
  "/experience/:exp_id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const profile = await Profile.findOne({ user: req.user.id });
    const removeIndex = profile.experience
      .map(item => item.id)
      .indexOf(req.params.exp_id);
    //  Splice out of array
    profile.experience.splice(removeIndex, 1);

    //  Save
    await profile.save();
    res.json(profile);
  }
);

// @route DELETE api/profile/education/:edu_id
// @desc Delete experience from education
// @access Private

router.delete(
  "/education/:edu_id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const profile = await Profile.findOne({ user: req.user.id });
    const removeIndex = profile.education
      .map(item => item.id)
      .indexOf(req.params.edu_id);
    //  Splice out of array
    profile.education.splice(removeIndex, 1);

    //  Save
    await profile.save();
    res.json(profile);
  }
);

// @route DELETE api/profile
// @desc Delete experience from education
// @access Private

router.delete(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const profile = await Profile.findOneAndRemove({ user: req.user.id });
    const user = await User.findOneAndRemove({ _id: req.user.id });
    res.json({ success: true });
  }
);

module.exports = router;
