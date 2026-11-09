const profileRepository = require('../repositories/profileRepository');

class ProfileService {
  async getProfile(userId, userEmail = '', userMetadata = {}) {
    let email = typeof userEmail === 'string' ? userEmail : (userEmail?.email || '');
    let metadata = (typeof userEmail === 'object' && userEmail?.user_metadata) ? userEmail.user_metadata : (userMetadata || {});

    let profile = await profileRepository.getById(userId);
    if (!profile) {
      const name =
        metadata.full_name ||
        metadata.name ||
        (email && typeof email === 'string' && email.includes('@') ? email.split('@')[0] : 'Student');
      // Auto-initialize profile using actual metadata from Supabase
      profile = await profileRepository.upsert({
        id: userId,
        name,
        class: metadata.class || 'Class 12th',
        exam: metadata.exam || 'NEET',
        email,
        avatar_url: metadata.avatar_url || metadata.picture || null,
      });
    } else {
      // Enrich existing profile if Google provides avatar or real name
      const googlePic = metadata.avatar_url || metadata.picture;
      const googleName = metadata.full_name || metadata.name;
      const updates = {};
      if (googlePic && !profile.avatar_url) {
        updates.avatar_url = googlePic;
      }
      if (googleName && (!profile.name || profile.name === 'Student')) {
        updates.name = googleName;
      }
      if (Object.keys(updates).length > 0) {
        profile = await profileRepository.update(userId, updates);
      }
    }
    return profile;
  }

  async updateProfile(userId, updates) {
    return await profileRepository.update(userId, updates);
  }
}

module.exports = new ProfileService();
