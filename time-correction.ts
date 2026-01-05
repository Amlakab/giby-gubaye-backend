// cloudinary-time-fix.ts - Save this in root directory
console.log('⏰ Cloudinary Time Fix Loading...');

// Check current system time
const currentYear = new Date().getFullYear();
console.log(`⏰ Current Year: ${currentYear}`);

if (currentYear >= 2026) {
  console.log('⚠️  System time is in the future! Creating Cloudinary timestamp adjustment...');
  
  // Calculate offset (2026 - 2024 = 2 years in milliseconds)
  const offsetYears = currentYear - 2024;
  const offsetMs = offsetYears * 365 * 24 * 60 * 60 * 1000;
  const offsetSeconds = Math.floor(offsetMs / 1000);
  
  console.log(`⏰ Time offset: ${offsetYears} years (${offsetSeconds} seconds)`);
  
  // Store original cloudinary
  const cloudinary = require('cloudinary').v2;
  
  // Patch the upload function
  const originalUpload = cloudinary.uploader.upload;
  cloudinary.uploader.upload = function(path: string, options: any, callback: any) {
    if (options && typeof options === 'object') {
      // Use corrected timestamp (current - offset)
      options.timestamp = Math.floor(Date.now() / 1000) - offsetSeconds;
    }
    return originalUpload.call(this, path, options, callback);
  };
  
  // Patch the upload_stream function
  const originalUploadStream = cloudinary.uploader.upload_stream;
  cloudinary.uploader.upload_stream = function(options: any, callback: any) {
    if (options && typeof options === 'object') {
      options.timestamp = Math.floor(Date.now() / 1000) - offsetSeconds;
    }
    return originalUploadStream.call(this, options, callback);
  };
  
  console.log('✅ Cloudinary upload functions patched with corrected timestamps');
} else {
  console.log('✅ System time is correct, no fix needed');
}

export {};