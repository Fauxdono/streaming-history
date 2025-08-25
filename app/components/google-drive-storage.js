"use client";

// Google Drive Storage Service for Large Dataset Persistence
// Handles OAuth authentication and file operations with Google Drive API

class GoogleDriveStorage {
  constructor() {
    this.isInitialized = false;
    this.isSignedIn = false;
    this.gapi = null;
    this.appFolderName = 'StreamingHistoryAnalyzer';
    this.appFolderId = null;
  }

  // Initialize Google Drive API
  async initialize() {
    if (this.isInitialized) return true;

    try {
      console.log('🔧 Initializing Google Drive API...');
      
      // Load Google API with timeout
      await Promise.race([
        this.loadGoogleAPI(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Google API script load timeout')), 10000)
        )
      ]);
      console.log('✅ Google API script loaded');
      
      // Initialize the API with timeout
      await Promise.race([
        new Promise((resolve, reject) => {
          window.gapi.load('client:auth2', {
            callback: resolve,
            onerror: reject
          });
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Google API client load timeout')), 10000)
        )
      ]);
      console.log('✅ Google API client loaded');

      // Check for required environment variables
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      
      console.log('🔍 Checking environment variables...', { 
        hasApiKey: !!apiKey, 
        hasClientId: !!clientId,
        apiKeyValue: apiKey?.substring(0, 10) + '...' || 'undefined',
        clientIdValue: clientId?.substring(0, 10) + '...' || 'undefined'
      });
      
      if (!apiKey || apiKey === 'your_google_api_key_here') {
        throw new Error('Google API Key not configured. Please set NEXT_PUBLIC_GOOGLE_API_KEY in .env.local');
      }
      
      if (!clientId || clientId === 'your_google_oauth_client_id_here') {
        throw new Error('Google Client ID not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.local');
      }

      // Configure the client with timeout
      console.log('🔧 Configuring Google API client...');
      await Promise.race([
        window.gapi.client.init({
          apiKey: apiKey,
          clientId: clientId,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
          scope: 'https://www.googleapis.com/auth/drive.file'
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Google API client init timeout')), 15000)
        )
      ]);
      console.log('✅ Google API client configured');

      this.gapi = window.gapi;
      this.isInitialized = true;
      
      // Check if already signed in
      const authInstance = this.gapi.auth2.getAuthInstance();
      this.isSignedIn = authInstance.isSignedIn.get();
      
      console.log('✅ Google Drive API initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Google Drive API:', error);
      throw new Error(`Google Drive initialization failed: ${error.message}`);
    }
  }

  // Load Google API script
  loadGoogleAPI() {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Sign in to Google
  async signIn() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log('🔐 Signing in to Google Drive...');
      const authInstance = this.gapi.auth2.getAuthInstance();
      await authInstance.signIn();
      this.isSignedIn = true;
      
      const user = authInstance.currentUser.get();
      const profile = user.getBasicProfile();
      console.log('✅ Signed in as:', profile.getEmail());
      
      return {
        email: profile.getEmail(),
        name: profile.getName(),
        imageUrl: profile.getImageUrl()
      };
    } catch (error) {
      console.error('❌ Google Drive sign-in failed:', error);
      throw new Error(`Sign-in failed: ${error.message}`);
    }
  }

  // Sign out
  async signOut() {
    if (!this.isInitialized) return;

    try {
      const authInstance = this.gapi.auth2.getAuthInstance();
      await authInstance.signOut();
      this.isSignedIn = false;
      console.log('📤 Signed out of Google Drive');
    } catch (error) {
      console.error('❌ Sign-out failed:', error);
    }
  }

  // Check if signed in
  isAuthenticated() {
    return this.isSignedIn;
  }

  // Get or create app folder
  async getAppFolder() {
    if (this.appFolderId) return this.appFolderId;

    try {
      console.log('📁 Looking for app folder...');
      
      // Search for existing folder
      const response = await this.gapi.client.drive.files.list({
        q: `name='${this.appFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        spaces: 'drive'
      });

      if (response.result.files.length > 0) {
        this.appFolderId = response.result.files[0].id;
        console.log('📁 Found existing app folder:', this.appFolderId);
        return this.appFolderId;
      }

      // Create new folder
      console.log('📁 Creating new app folder...');
      const createResponse = await this.gapi.client.drive.files.create({
        resource: {
          name: this.appFolderName,
          mimeType: 'application/vnd.google-apps.folder'
        }
      });

      this.appFolderId = createResponse.result.id;
      console.log('✅ Created app folder:', this.appFolderId);
      return this.appFolderId;
    } catch (error) {
      console.error('❌ Failed to get/create app folder:', error);
      throw error;
    }
  }

  // Save processed data to Google Drive
  async saveProcessedData(data) {
    if (!this.isSignedIn) {
      throw new Error('Not signed in to Google Drive');
    }

    try {
      console.log('💾 Saving data to Google Drive...', {
        tracks: data.processedTracks?.length || 0,
        artists: data.topArtists?.length || 0,
        albums: data.topAlbums?.length || 0
      });

      const folderId = await this.getAppFolder();
      const fileName = `streaming-analysis-${new Date().toISOString().split('T')[0]}.json`;
      
      // Prepare data with metadata
      const saveData = {
        ...data,
        metadata: {
          savedAt: new Date().toISOString(),
          version: '1.0',
          totalTracks: data.processedTracks?.length || 0,
          dataSize: JSON.stringify(data).length
        }
      };

      const jsonString = JSON.stringify(saveData, null, 2);
      const sizeInMB = (jsonString.length / (1024 * 1024)).toFixed(2);
      
      console.log(`📤 Uploading ${sizeInMB}MB to Google Drive...`);

      // Check for existing file and update, or create new
      const existingFile = await this.findFile(fileName, folderId);
      
      let response;
      if (existingFile) {
        console.log('🔄 Updating existing file...');
        response = await this.updateFile(existingFile.id, jsonString);
      } else {
        console.log('📝 Creating new file...');
        response = await this.createFile(fileName, jsonString, folderId);
      }

      console.log('✅ Data saved to Google Drive successfully');
      return {
        fileId: response.result.id,
        fileName: fileName,
        size: sizeInMB + ' MB',
        savedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Failed to save to Google Drive:', error);
      throw error;
    }
  }

  // Load processed data from Google Drive
  async loadProcessedData() {
    if (!this.isSignedIn) {
      throw new Error('Not signed in to Google Drive');
    }

    try {
      console.log('📥 Loading data from Google Drive...');
      const folderId = await this.getAppFolder();
      
      // Find the most recent analysis file
      const response = await this.gapi.client.drive.files.list({
        q: `parents in '${folderId}' and name contains 'streaming-analysis' and trashed=false`,
        orderBy: 'modifiedTime desc',
        pageSize: 1
      });

      if (response.result.files.length === 0) {
        console.log('📭 No saved data found on Google Drive');
        return null;
      }

      const file = response.result.files[0];
      console.log('📄 Found saved file:', file.name);

      // Download file content
      const fileContent = await this.gapi.client.drive.files.get({
        fileId: file.id,
        alt: 'media'
      });

      const data = JSON.parse(fileContent.body);
      console.log('✅ Data loaded from Google Drive:', {
        tracks: data.processedTracks?.length || 0,
        savedAt: data.metadata?.savedAt || 'unknown'
      });

      return data;
    } catch (error) {
      console.error('❌ Failed to load from Google Drive:', error);
      throw error;
    }
  }

  // Helper: Find file by name in folder
  async findFile(fileName, folderId) {
    const response = await this.gapi.client.drive.files.list({
      q: `parents in '${folderId}' and name='${fileName}' and trashed=false`
    });
    return response.result.files.length > 0 ? response.result.files[0] : null;
  }

  // Helper: Create new file
  async createFile(fileName, content, folderId) {
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const metadata = {
      name: fileName,
      parents: [folderId],
      mimeType: 'application/json'
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      content +
      close_delim;

    return await this.gapi.client.request({
      path: 'https://www.googleapis.com/upload/drive/v3/files',
      method: 'POST',
      params: { uploadType: 'multipart' },
      headers: {
        'Content-Type': 'multipart/related; boundary="' + boundary + '"'
      },
      body: multipartRequestBody
    });
  }

  // Helper: Update existing file
  async updateFile(fileId, content) {
    return await this.gapi.client.request({
      path: `https://www.googleapis.com/upload/drive/v3/files/${fileId}`,
      method: 'PATCH',
      params: { uploadType: 'media' },
      headers: {
        'Content-Type': 'application/json'
      },
      body: content
    });
  }

  // Get storage info
  async getStorageInfo() {
    if (!this.isSignedIn) return null;

    try {
      const folderId = await this.getAppFolder();
      const response = await this.gapi.client.drive.files.list({
        q: `parents in '${folderId}' and trashed=false`,
        fields: 'files(id,name,size,modifiedTime)'
      });

      let totalSize = 0;
      const files = response.result.files.map(file => {
        const size = parseInt(file.size) || 0;
        totalSize += size;
        return {
          name: file.name,
          size: size,
          sizeFormatted: (size / (1024 * 1024)).toFixed(2) + ' MB',
          modifiedTime: new Date(file.modifiedTime)
        };
      });

      return {
        fileCount: files.length,
        totalSize: totalSize,
        totalSizeFormatted: (totalSize / (1024 * 1024)).toFixed(2) + ' MB',
        files: files
      };
    } catch (error) {
      console.error('❌ Failed to get storage info:', error);
      return null;
    }
  }
}

// Create singleton instance
const googleDriveStorage = new GoogleDriveStorage();

export default googleDriveStorage;