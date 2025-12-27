/**
 * ============================================
 * myPlan Dashboard - Main Controller
 * ============================================
 * 
 * Main entry point for the application.
 * Coordinates all modules and handles user interactions.
 * 
 * @module main
 * @author myPlan Development Team
 * @date December 2025
 */

import { FileHandler } from './fileHandler.js';
import { ExcelParser } from './excelParser.js';
import { DataAnalyzer } from './dataAnalyzer.js';
import { UIRenderer } from './uiRenderer.js';

class MyPlanApp {
    constructor() {
        this.fileHandler = new FileHandler();
        this.excelParser = new ExcelParser();
        this.dataAnalyzer = new DataAnalyzer();
        this.uiRenderer = new UIRenderer();
        
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        console.log('🚀 myPlan Dashboard initializing...');
        this.setupEventListeners();
        console.log('✅ myPlan Dashboard ready');
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        const uploadBtn = document.getElementById('uploadBtn');
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.getElementById('uploadArea');

        // Click to upload
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });

        // File selected
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFile(file);
            }
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            
            const file = e.dataTransfer.files[0];
            if (file && this.fileHandler.validateFile(file)) {
                this.handleFile(file);
            }
        });
    }

    /**
     * Handle file upload and processing
     * @param {File} file - The uploaded Excel file
     */
    async handleFile(file) {
        try {
            console.log('📄 Processing file:', file.name);
            
            // Show file info
            this.uiRenderer.showFileInfo(file);
            
            // Show progress
            this.uiRenderer.showProgress('קורא את הקובץ...', 10);
            
            // Read file
            const workbook = await this.fileHandler.readExcelFile(file);
            console.log('✅ File read successfully');
            
            this.uiRenderer.updateProgress('מנתח מבנה...', 30);
            
            // Parse Excel structure
            const parsedData = this.excelParser.parse(workbook);
            console.log('✅ Excel parsed:', parsedData);
            
            this.uiRenderer.updateProgress('מעבד נתונים...', 60);
            
            // Analyze data
            const analysis = this.dataAnalyzer.analyze(parsedData);
            console.log('✅ Data analyzed:', analysis);
            
            this.uiRenderer.updateProgress('בונה דשבורד...', 90);
            
            // Render dashboard
            await this.uiRenderer.renderDashboard(analysis, parsedData);
            console.log('✅ Dashboard rendered');
            
            this.uiRenderer.updateProgress('הושלם!', 100);
            
            // Hide progress after a short delay
            setTimeout(() => {
                this.uiRenderer.hideProgress();
            }, 500);
            
        } catch (error) {
            console.error('❌ Error processing file:', error);
            alert('שגיאה בעיבוד הקובץ: ' + error.message);
            this.uiRenderer.hideProgress();
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.myPlanApp = new MyPlanApp();
});

