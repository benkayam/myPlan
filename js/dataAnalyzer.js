/**
 * ============================================
 * Data Analyzer Module
 * ============================================
 * 
 * Analyzes parsed Excel data and generates insights.
 * Calculates statistics, detects overlaps, identifies issues.
 * 
 * Business Rules:
 * - Work days in Israel: Sunday-Thursday (א'-ה')
 * - Overlaps: Employee with more than 1 work day on same calendar day
 * - Status colors: green (delivered), yellow (risk), red (delay), gray (on track)
 * 
 * @module dataAnalyzer
 */

export class DataAnalyzer {
    constructor() {
        this.workDays = [0, 1, 2, 3, 4]; // Sunday to Thursday
    }

    /**
     * Analyze all parsed data
     * @param {Object} parsedData - Parsed Excel data
     * @returns {Object} - Analysis results
     */
    analyze(parsedData) {
        console.log('🔍 Starting data analysis...');
        
        const analysis = {
            summary: this.generateSummary(parsedData),
            employees: this.analyzeEmployees(parsedData.employees),
            projects: this.analyzeProjects(parsedData),
            timeline: this.generateTimeline(parsedData),
            calendar: this.generateCalendarView(parsedData),
            statusBreakdown: this.analyzeStatuses(parsedData),
            overlaps: this.detectOverlaps(parsedData),
            workload: this.analyzeWorkload(parsedData)
        };

        console.log('✅ Analysis complete:', analysis);
        return analysis;
    }

    /**
     * Generate overall summary
     * @param {Object} parsedData - Parsed data
     * @returns {Object} - Summary statistics
     */
    generateSummary(parsedData) {
        const allProjects = new Set();
        const allVersions = new Set();
        let totalFeatures = 0;

        parsedData.employees.forEach(emp => {
            emp.projects.forEach(p => allProjects.add(p));
            emp.versions.forEach(v => allVersions.add(v));
            totalFeatures += emp.features.length;
        });

        return {
            totalEmployees: parsedData.employees.length,
            totalProjects: allProjects.size,
            totalVersions: allVersions.size,
            totalFeatures: totalFeatures,
            averageFeaturesPerEmployee: totalFeatures / parsedData.employees.length || 0
        };
    }

    /**
     * Analyze individual employees
     * @param {Array} employees - Employee data
     * @returns {Array} - Employee analysis
     */
    analyzeEmployees(employees) {
        return employees.map(emp => {
            const statusCounts = this.countStatuses(emp.features);
            
            return {
                name: emp.name,
                featureCount: emp.features.length,
                projectCount: emp.projects.length,
                versionCount: emp.versions.length,
                statusCounts: statusCounts,
                workload: this.calculateWorkload(emp.features),
                projects: emp.projects,
                versions: emp.versions,
                features: emp.features
            };
        });
    }

    /**
     * Analyze projects across all employees
     * @param {Object} parsedData - Parsed data
     * @returns {Object} - Project analysis
     */
    analyzeProjects(parsedData) {
        const projectMap = {};

        parsedData.employees.forEach(emp => {
            emp.features.forEach(feature => {
                if (feature.project) {
                    if (!projectMap[feature.project]) {
                        projectMap[feature.project] = {
                            name: feature.project,
                            features: [],
                            employees: new Set(),
                            statusCounts: { green: 0, yellow: 0, red: 0, gray: 0 }
                        };
                    }
                    
                    projectMap[feature.project].features.push(feature);
                    projectMap[feature.project].employees.add(emp.name);
                    projectMap[feature.project].statusCounts[feature.status]++;
                }
            });
        });

        // Convert to array and calculate overall status
        return Object.values(projectMap).map(project => ({
            ...project,
            employees: Array.from(project.employees),
            employeeCount: project.employees.size,
            featureCount: project.features.length,
            overallStatus: this.calculateOverallStatus(project.statusCounts)
        }));
    }

    /**
     * Analyze versions across all employees
     * @param {Object} parsedData - Parsed data
     * @returns {Object} - Version analysis
     */
    analyzeVersions(parsedData) {
        const versionMap = {};

        parsedData.employees.forEach(emp => {
            emp.features.forEach(feature => {
                if (feature.version) {
                    if (!versionMap[feature.version]) {
                        versionMap[feature.version] = {
                            name: feature.version,
                            features: [],
                            employees: new Set(),
                            projects: new Set(),
                            statusCounts: { green: 0, yellow: 0, red: 0, gray: 0 }
                        };
                    }
                    
                    versionMap[feature.version].features.push(feature);
                    versionMap[feature.version].employees.add(emp.name);
                    if (feature.project) {
                        versionMap[feature.version].projects.add(feature.project);
                    }
                    versionMap[feature.version].statusCounts[feature.status]++;
                }
            });
        });

        // Convert to array
        return Object.values(versionMap).map(version => ({
            ...version,
            employees: Array.from(version.employees),
            projects: Array.from(version.projects),
            employeeCount: version.employees.size,
            projectCount: version.projects.size,
            featureCount: version.features.length,
            overallStatus: this.calculateOverallStatus(version.statusCounts)
        }));
    }

    /**
     * Generate delivery timeline
     * @param {Object} parsedData - Parsed data
     * @returns {Array} - Timeline items
     */
    generateTimeline(parsedData) {
        const timelineMap = {};

        parsedData.employees.forEach(emp => {
            emp.features.forEach(feature => {
                if (feature.endDate) {
                    const dateKey = feature.endDate;
                    
                    if (!timelineMap[dateKey]) {
                        timelineMap[dateKey] = {
                            date: dateKey,
                            features: [],
                            employees: new Set(),
                            projects: new Set(),
                            statusCounts: { green: 0, yellow: 0, red: 0, gray: 0 }
                        };
                    }
                    
                    timelineMap[dateKey].features.push({
                        ...feature,
                        employeeName: emp.name
                    });
                    timelineMap[dateKey].employees.add(emp.name);
                    if (feature.project) {
                        timelineMap[dateKey].projects.add(feature.project);
                    }
                    timelineMap[dateKey].statusCounts[feature.status]++;
                }
            });
        });

        // Convert to array and sort by date
        return Object.values(timelineMap)
            .map(item => ({
                ...item,
                employees: Array.from(item.employees),
                projects: Array.from(item.projects),
                overallStatus: this.calculateOverallStatus(item.statusCounts)
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    /**
     * Analyze status distribution
     * @param {Object} parsedData - Parsed data
     * @returns {Object} - Status counts
     */
    analyzeStatuses(parsedData) {
        const statusCounts = { green: 0, yellow: 0, red: 0, gray: 0 };

        parsedData.employees.forEach(emp => {
            emp.features.forEach(feature => {
                statusCounts[feature.status]++;
            });
        });

        return statusCounts;
    }

    /**
     * Detect overlapping work days for employees
     * @param {Object} parsedData - Parsed data
     * @returns {Array} - Detected overlaps
     */
    detectOverlaps(parsedData) {
        const overlaps = [];

        parsedData.employees.forEach(emp => {
            const dateMap = {};

            // Map all dates to tasks
            emp.features.forEach(feature => {
                if (feature.allDates && feature.allDates.length > 0) {
                    feature.allDates.forEach(date => {
                        if (!dateMap[date]) {
                            dateMap[date] = [];
                        }
                        dateMap[date].push(feature);
                    });
                }
            });

            // Find dates with more than 1 task (OVERLAP!)
            Object.entries(dateMap).forEach(([date, tasks]) => {
                if (tasks.length > 1) {
                    overlaps.push({
                        employee: emp.name,
                        date: date,
                        taskCount: tasks.length,
                        tasks: tasks.map(t => ({
                            name: t.taskName,
                            project: t.project
                        })),
                        severity: 'high'
                    });
                }
            });
        });

        return overlaps;
    }
    
    /**
     * Generate calendar view for all employees
     * @param {Object} parsedData - Parsed data
     * @returns {Object} - Calendar data
     */
    generateCalendarView(parsedData) {
        const calendar = {};
        let minDate = null;
        let maxDate = null;

        parsedData.employees.forEach(emp => {
            emp.features.forEach(feature => {
                if (feature.allDates && feature.allDates.length > 0) {
                    feature.allDates.forEach(date => {
                        if (!calendar[date]) {
                            calendar[date] = {};
                        }
                        
                        if (!calendar[date][emp.name]) {
                            calendar[date][emp.name] = [];
                        }
                        
                        calendar[date][emp.name].push({
                            task: feature.taskName,
                            project: feature.project,
                            status: feature.status
                        });
                        
                        // Track date range
                        const dateObj = this.parseDate(date);
                        if (!minDate || dateObj < minDate) minDate = dateObj;
                        if (!maxDate || dateObj > maxDate) maxDate = dateObj;
                    });
                }
            });
        });

        return {
            calendar,
            dateRange: {
                start: minDate ? this.formatDateObject(minDate) : null,
                end: maxDate ? this.formatDateObject(maxDate) : null
            },
            employees: parsedData.employees.map(e => e.name)
        };
    }
    
    /**
     * Parse date helper
     */
    parseDate(dateStr) {
        if (!dateStr) return null;
        const parts = dateStr.split(/[-/]/);
        if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            const year = parseInt(parts[2]);
            return new Date(year, month, day);
        }
        return null;
    }
    
    /**
     * Format date helper
     */
    formatDateObject(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    }

    /**
     * Analyze workload distribution
     * @param {Object} parsedData - Parsed data
     * @returns {Object} - Workload analysis
     */
    analyzeWorkload(parsedData) {
        const workload = {
            byEmployee: [],
            total: 0,
            average: 0,
            max: 0,
            min: Infinity
        };

        parsedData.employees.forEach(emp => {
            const empWorkload = this.calculateWorkload(emp.features);
            
            workload.byEmployee.push({
                employee: emp.name,
                workload: empWorkload,
                featureCount: emp.features.length
            });

            workload.total += empWorkload;
            workload.max = Math.max(workload.max, empWorkload);
            workload.min = Math.min(workload.min, empWorkload);
        });

        workload.average = workload.total / parsedData.employees.length || 0;
        
        return workload;
    }

    /**
     * Calculate workload for features
     * @param {Array} features - Feature list
     * @returns {number} - Workload score
     */
    calculateWorkload(features) {
        // Simple workload calculation based on feature count
        // Can be enhanced with duration, complexity, etc.
        return features.length;
    }

    /**
     * Count statuses in feature list
     * @param {Array} features - Feature list
     * @returns {Object} - Status counts
     */
    countStatuses(features) {
        const counts = { green: 0, yellow: 0, red: 0, gray: 0 };
        
        features.forEach(feature => {
            counts[feature.status]++;
        });

        return counts;
    }

    /**
     * Calculate overall status based on status counts
     * Priority: red > yellow > gray > green
     * @param {Object} statusCounts - Status counts
     * @returns {string} - Overall status
     */
    calculateOverallStatus(statusCounts) {
        if (statusCounts.red > 0) return 'red';
        if (statusCounts.yellow > 0) return 'yellow';
        if (statusCounts.gray > 0) return 'gray';
        return 'green';
    }

    /**
     * Check if date is a work day in Israel (Sunday-Thursday)
     * @param {Date} date - Date to check
     * @returns {boolean} - True if work day
     */
    isWorkDay(date) {
        const day = date.getDay();
        return this.workDays.includes(day);
    }
}

