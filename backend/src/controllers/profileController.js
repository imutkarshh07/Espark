const profileService = require('../services/profileService');
const { successResponse } = require('../utils/response');

const getProfile = async (req, res, next) => {
  try {
    const profile = await profileService.getProfile(
      req.user.id,
      req.user.email,
      req.user.user_metadata || {}
    );
    return successResponse(res, profile);
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const updated = await profileService.updateProfile(req.user.id, req.body);
    return successResponse(res, updated, 200, 'Profile updated successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProfile,
  updateProfile,
};
