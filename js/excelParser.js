/**
 * ============================================
 * Excel Parser Module
 * ============================================
 * 
 * Parses Excel workbook structure and extracts data.
 * Each sheet represents one employee.
 * 
 * Expected structure:
 * - Sheet name = Employee name
 * - Rows contain: Feature name, dates, status indicators, project info
 * 
 * @module excelParser
 */

export class ExcelParser {
    constructor() {
        this.workbook = null;
        this.structure = null;
    }

    /**
     * Parse entire workbook
     * @param {Object} workbook - SheetJS workbook object
     * @returns {Object} - Parsed data structure
     */
    parse(workbook) {
        this.workbook = workbook;
        
        const parsedData = {
            fileName: workbook.Props?.Title || 'myPlan',
            sheetCount: workbook.SheetNames.length,
            sheets: [],
            employees: [],
            metadata: {
                parsedAt: new Date().toISOString(),
                sheetNames: workbook.SheetNames
            }
        };

        // Parse each sheet (employee)
        workbook.SheetNames.forEach((sheetName, index) => {
            console.log(`📊 Parsing sheet ${index + 1}/${workbook.SheetNames.length}: ${sheetName}`);
            
            const sheet = workbook.Sheets[sheetName];
            const employeeData = this.parseSheet(sheet, sheetName);
            
            parsedData.sheets.push({
                name: sheetName,
                index: index,
                data: employeeData
            });
            
            parsedData.employees.push(employeeData);
        });

        console.log('✅ All sheets parsed');
        return parsedData;
    }

    /**
     * Parse single sheet (employee)
     * @param {Object} sheet - SheetJS sheet object
     * @param {string} sheetName - Name of the sheet
     * @returns {Object} - Parsed employee data
     */
    parseSheet(sheet, sheetName) {
        // Convert sheet to JSON
        const jsonData = XLSX.utils.sheet_to_json(sheet, { 
            header: 1,
            defval: '',
            blankrows: false
        });

        const employeeData = {
            name: sheetName,
            rowCount: jsonData.length,
            features: [],
            projects: new Set(),
            versions: new Set(),
            rawRows: jsonData,
            structure: this.analyzeSheetStructure(jsonData)
        };

        // Try to identify and parse features
        jsonData.forEach((row, rowIndex) => {
            const featureInfo = this.extractFeatureInfo(row, rowIndex);
            if (featureInfo) {
                employeeData.features.push(featureInfo);
                
                // Collect projects and versions
                if (featureInfo.project) {
                    employeeData.projects.add(featureInfo.project);
                }
                if (featureInfo.version) {
                    employeeData.versions.add(featureInfo.version);
                }
            }
        });

        // Convert Sets to Arrays
        employeeData.projects = Array.from(employeeData.projects);
        employeeData.versions = Array.from(employeeData.versions);

        return employeeData;
    }

    /**
     * Analyze sheet structure to understand layout
     * @param {Array} rows - Array of row data
     * @returns {Object} - Structure analysis
     */
    analyzeSheetStructure(rows) {
        const structure = {
            totalRows: rows.length,
            totalColumns: 0,
            nonEmptyRows: 0,
            headers: [],
            dateColumns: [],
            textColumns: []
        };

        if (rows.length === 0) return structure;

        // Find max columns
        structure.totalColumns = Math.max(...rows.map(row => row.length));

        // Count non-empty rows
        structure.nonEmptyRows = rows.filter(row => 
            row.some(cell => cell !== null && cell !== '')
        ).length;

        // Analyze first row as potential headers
        if (rows[0]) {
            structure.headers = rows[0].map((cell, idx) => ({
                index: idx,
                value: cell,
                type: this.detectColumnType(rows, idx)
            }));
        }

        return structure;
    }

    /**
     * Detect column type based on content
     * @param {Array} rows - All rows
     * @param {number} colIndex - Column index
     * @returns {string} - Column type
     */
    detectColumnType(rows, colIndex) {
        const samples = rows.slice(0, 10).map(row => row[colIndex]).filter(val => val);
        
        if (samples.length === 0) return 'empty';
        
        const datePattern = /\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/;
        const numberPattern = /^\d+$/;
        
        const hasDate = samples.some(val => datePattern.test(String(val)));
        const hasNumber = samples.some(val => numberPattern.test(String(val)));
        
        if (hasDate) return 'date';
        if (hasNumber) return 'number';
        return 'text';
    }

    /**
     * Extract feature information from a row
     * @param {Array} row - Row data
     * @param {number} rowIndex - Row index
     * @returns {Object|null} - Feature info or null
     */
    extractFeatureInfo(row, rowIndex) {
        if (!row || row.length === 0) return null;
        
        // Skip if row is mostly empty
        const nonEmptyCells = row.filter(cell => cell !== null && cell !== '').length;
        if (nonEmptyCells < 2) return null;

        const feature = {
            rowIndex: rowIndex,
            rawData: row,
            taskName: null,
            project: null,
            startDate: null,
            endDate: null,
            durationDays: null,
            status: 'gray',
            dates: [],
            allDates: [], // כל התאריכים בין התחלה לסיום
            metadata: {}
        };

        // Try to extract information from cells
        row.forEach((cell, colIndex) => {
            if (!cell) return;
            
            const cellStr = String(cell);
            
            // Look for project identifiers (e.g., "DEV-12345")
            const projectMatch = cellStr.match(/[A-Z]+-\d+/);
            if (projectMatch && !feature.project) {
                feature.project = projectMatch[0];
            }
            
            // Look for dates
            if (this.isDate(cell)) {
                feature.dates.push({
                    column: colIndex,
                    value: cell,
                    formatted: this.formatDate(cell)
                });
            }
            
            // First non-empty cell is task name (אפיון, פיתוח, וכו')
            if (!feature.taskName && cellStr.length > 1 && colIndex < 3) {
                feature.taskName = cellStr;
            }
        });

        // Extract start and end dates
        if (feature.dates.length >= 2) {
            feature.startDate = feature.dates[0].formatted;
            feature.endDate = feature.dates[feature.dates.length - 1].formatted;
            
            // Generate all dates between start and end (for overlap detection)
            feature.allDates = this.generateDateRange(feature.startDate, feature.endDate);
        }

        // Try to extract duration from cells
        const durationCell = row.find(cell => 
            typeof cell === 'number' && cell > 0 && cell < 365
        );
        if (durationCell) {
            feature.durationDays = durationCell;
        }

        // Determine status
        feature.status = this.determineStatus(row);

        return feature.taskName ? feature : null;
    }
    
    /**
     * Generate array of all dates between start and end
     * @param {string} startDate - Start date (DD-MM-YYYY)
     * @param {string} endDate - End date (DD-MM-YYYY)
     * @returns {Array} - Array of date strings
     */
    generateDateRange(startDate, endDate) {
        const dates = [];
        const start = this.parseDate(startDate);
        const end = this.parseDate(endDate);
        
        if (!start || !end) return dates;
        
        const current = new Date(start);
        while (current <= end) {
            // Only work days (Sunday-Thursday in Israel)
            const day = current.getDay();
            if (day >= 0 && day <= 4) {
                dates.push(this.formatDateObject(current));
            }
            current.setDate(current.getDate() + 1);
        }
        
        return dates;
    }
    
    /**
     * Parse date string to Date object
     * @param {string} dateStr - Date string
     * @returns {Date|null} - Date object or null
     */
    parseDate(dateStr) {
        if (!dateStr) return null;
        
        // Try to parse DD-MM-YYYY or DD/MM/YYYY
        const parts = dateStr.split(/[-/]/);
        if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1; // 0-based
            const year = parseInt(parts[2]);
            return new Date(year, month, day);
        }
        
        return null;
    }
    
    /**
     * Format Date object to string
     * @param {Date} date - Date object
     * @returns {string} - Formatted date
     */
    formatDateObject(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    }

    /**
     * Check if value is a date
     * @param {*} value - Value to check
     * @returns {boolean} - True if date
     */
    isDate(value) {
        if (value instanceof Date) return true;
        
        const datePattern = /\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/;
        return datePattern.test(String(value));
    }

    /**
     * Format date to standard format
     * @param {*} date - Date value
     * @returns {string} - Formatted date
     */
    formatDate(date) {
        if (date instanceof Date) {
            return date.toLocaleDateString('he-IL');
        }
        return String(date);
    }

    /**
     * Determine feature status from row data
     * @param {Array} row - Row data
     * @returns {string} - Status (green, yellow, red, gray)
     */
    determineStatus(row) {
        const rowStr = row.join(' ').toLowerCase();
        
        // Look for status indicators
        if (rowStr.includes('נמסר') || rowStr.includes('הושלם') || rowStr.includes('green')) {
            return 'green';
        }
        if (rowStr.includes('עיכוב') || rowStr.includes('חשש') || rowStr.includes('yellow')) {
            return 'yellow';
        }
        if (rowStr.includes('אדום') || rowStr.includes('דחוף') || rowStr.includes('red')) {
            return 'red';
        }
        
        // Default
        return 'gray';
    }

    /**
     * Get workbook metadata
     * @returns {Object} - Metadata
     */
    getMetadata() {
        if (!this.workbook) return null;
        
        return {
            sheetNames: this.workbook.SheetNames,
            sheetCount: this.workbook.SheetNames.length,
            properties: this.workbook.Props || {}
        };
    }
}

