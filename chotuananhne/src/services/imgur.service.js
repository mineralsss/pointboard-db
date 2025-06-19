const appConfig = require('../configs/app.config');
const APIError = require('../utils/APIError');
const imgur = require('imgur');

// For imgur v1.0.2, initialize the client this way:
imgur.setClientId(appConfig.imgur.clientID);

class ImgurService {
  uploadImage = async (imageFile) => {
    try {
      // Use the imgur.upload method directly for version 1.0.2
      const response = await imgur.uploadBase64(imageFile.buffer.toString('base64'));
      return response.data.link;
    } catch (error) {
      console.error('Imgur upload error:', error);
      throw new APIError(400, 'Upload image failed');
    }
  };
}

module.exports = new ImgurService();
