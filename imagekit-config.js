class ImageKitService {
  constructor() {
    this.publicKey = "public_lP5Vb+5SXLUjuoliJDp19GPOU6s=";
    this.urlEndpoint = "https://ik.imagekit.io/48l5ydkzy";
    this.authenticationEndpoint = "https://imagekit-auth-server-uafl.onrender.com/auth";
    this.imagekit = null;
    this.initialize();
  }

  async initialize() {
    if (typeof ImageKit !== 'undefined') {
      this.imagekit = new ImageKit({
        publicKey: this.publicKey,
        urlEndpoint: this.urlEndpoint,
        authenticationEndpoint: this.authenticationEndpoint
      });
    } else {
      // Load ImageKit SDK dynamically
      await this.loadSDK();
      this.imagekit = new ImageKit({
        publicKey: this.publicKey,
        urlEndpoint: this.urlEndpoint,
        authenticationEndpoint: this.authenticationEndpoint
      });
    }
  }

  loadSDK() {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src*="imagekit.io"]')) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/imagekit-javascript/dist/imagekit.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async upload(file, fileName, tags = []) {
    try {
      if (!this.imagekit) {
        await this.initialize();
      }

      return new Promise((resolve, reject) => {
        this.imagekit.upload({
          file: file,
          fileName: fileName,
          tags: tags,
          useUniqueFileName: true
        }, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              url: result.url,
              fileId: result.fileId,
              name: result.name
            });
          }
        });
      });
    } catch (error) {
      console.error("ImageKit upload error:", error);
      throw error;
    }
  }

  getUrl(url, transformations = []) {
    if (!this.imagekit) {
      this.initialize();
    }
    return this.imagekit.url({
      src: url,
      transformation: transformations
    });
  }

  async uploadProfilePicture(file, userId) {
    const fileName = `profile_${userId}_${Date.now()}.${file.name.split('.').pop()}`;
    const result = await this.upload(file, fileName, ['profile', 'user']);
    return result.url;
  }

  async uploadChatMedia(file, chatId) {
    const fileName = `chat_${chatId}_${Date.now()}.${file.name.split('.').pop()}`;
    const result = await this.upload(file, fileName, ['chat', 'media']);
    return {
      url: result.url,
      type: file.type.startsWith('image/') ? 'image' : 'video'
    };
  }

  async uploadZyneMedia(file, userId) {
    const fileName = `zyne_${userId}_${Date.now()}.${file.name.split('.').pop()}`;
    const result = await this.upload(file, fileName, ['zyne', 'status']);
    return {
      url: result.url,
      type: file.type.startsWith('image/') ? 'image' : 'video'
    };
  }

  async uploadGroupMedia(file, groupId) {
    const fileName = `group_${groupId}_${Date.now()}.${file.name.split('.').pop()}`;
    const result = await this.upload(file, fileName, ['group', 'media']);
    return {
      url: result.url,
      type: file.type.startsWith('image/') ? 'image' : 'video'
    };
  }
}

// Create global instance
const imageKitService = new ImageKitService();

export default imageKitService;
