const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

// Check if Supabase is configured
const isSupabaseConfigured = supabaseUrl && supabaseKey;

const supabase = isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseKey)
    : null;

const BUCKET_NAME = 'simka-uploads';

/**
 * Upload a file to Supabase Storage
 * @param {Object} file - Multer file object
 * @param {string} folder - Target folder in bucket (optional)
 * @returns {Promise<Object>} - Upload result with public URL
 */
const uploadFile = async (file, folder = 'documents') => {
    if (!isSupabaseConfigured) {
        throw new Error('Supabase storage is not configured');
    }

    try {
        const fileExt = path.extname(file.originalname);
        const fileName = `${folder}/${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExt}`;

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileName);

        return {
            path: data.path,
            publicUrl: publicUrl,
            filename: fileName
        };
    } catch (error) {
        console.error('Supabase upload error:', error);
        throw new Error(`Failed to upload file: ${error.message}`);
    }
};

/**
 * Delete a file from Supabase Storage
 * @param {string} filePath - Path of file in bucket
 * @returns {Promise<void>}
 */
const deleteFile = async (filePath) => {
    if (!isSupabaseConfigured) return;

    try {
        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([filePath]);

        if (error) throw error;
    } catch (error) {
        console.error('Supabase delete error:', error);
        // Don't throw here, just log it. File deletion failure shouldn't block other operations.
    }
};

module.exports = {
    uploadFile,
    deleteFile,
    isSupabaseConfigured
};
