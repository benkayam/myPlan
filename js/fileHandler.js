/**
 * ============================================
 * File Handler Module
 * ============================================
 * 
 * Handles file uploads, validation, and reading.
 * Uses SheetJS (xlsx) library to parse Excel files.
 * 
 * @module fileHandler
 */

export class FileHandler {
    constructor() {
        this.allowedExtensions = ['.xlsx', '.xls'];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
    }

    /**
     * Validate uploaded file
     * @param {File} file - The file to validate
     * @returns {boolean} - True if valid
     */
    validateFile(file) {
        // Check if file exists
        if (!file) {
            alert('לא נבחר קובץ');
            return false;
        }

        // Check file extension
        const fileName = file.name.toLowerCase();
        const isValidExtension = this.allowedExtensions.some(ext => 
            fileName.endsWith(ext)
        );
        
        if (!isValidExtension) {
            alert('סוג קובץ לא נתמך. אנא העלה קובץ Excel (.xlsx או .xls)');
            return false;
        }

        // Check file size
        if (file.size > this.maxFileSize) {
            alert('הקובץ גדול מדי. גודל מקסימלי: 10MB');
            return false;
        }

        return true;
    }

    /**
     * Read Excel file and return workbook object
     * @param {File} file - The Excel file to read
     * @returns {Promise<Object>} - SheetJS workbook object
     */
    readExcelFile(file) {
        return new Promise((resolve, reject) => {
            if (!this.validateFile(file)) {
                reject(new Error('File validation failed'));
                return;
            }

            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { 
                        type: 'array',
                        cellDates: true,
                        cellNF: false,
                        cellText: false
                    });
                    
                    resolve(workbook);
                } catch (error) {
                    reject(new Error('שגיאה בקריאת הקובץ: ' + error.message));
                }
            };

            reader.onerror = () => {
                reject(new Error('שגיאה בטעינת הקובץ'));
            };

            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Get file metadata
     * @param {File} file - The file object
     * @returns {Object} - File metadata
     */
    getFileMetadata(file) {
        return {
            name: file.name,
            size: file.size,
            sizeFormatted: this.formatFileSize(file.size),
            type: file.type,
            lastModified: new Date(file.lastModified).toLocaleString('he-IL')
        };
    }

    /**
     * Format file size to human readable format
     * @param {number} bytes - Size in bytes
     * @returns {string} - Formatted size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}

