/**
 * ============================================
 * UI Renderer Module
 * ============================================
 * 
 * Handles all UI rendering and updates.
 * Displays dashboard, charts, and data visualizations.
 * 
 * @module uiRenderer
 */

export class UIRenderer {
    constructor() {
        this.elements = {
            fileInfo: document.getElementById('fileInfo'),
            progressSection: document.getElementById('progressSection'),
            progressFill: document.getElementById('progressFill'),
            progressText: document.getElementById('progressText'),
            dashboardSection: document.getElementById('dashboardSection'),
            
            // Dashboard elements
            totalEmployees: document.getElementById('totalEmployees'),
            totalTasks: document.getElementById('totalTasks'),
            totalOverlaps: document.getElementById('totalOverlaps'),
            
            overlapsAlert: document.getElementById('overlapsAlert'),
            overlapsList: document.getElementById('overlapsList'),
            calendarView: document.getElementById('calendarView'),
            currentWeek: document.getElementById('currentWeek'),
            employeesSummary: document.getElementById('employeesSummary'),
            rawDataViewer: document.getElementById('rawDataViewer')
        };
        
        this.currentWeekStart = null;
        this.calendarData = null;
        this.analysisData = null;
    }

    /**
     * Show file information
     * @param {File} file - Uploaded file
     */
    showFileInfo(file) {
        const fileSize = this.formatFileSize(file.size);
        this.elements.fileInfo.innerHTML = `
            ✅ קובץ נטען: <strong>${file.name}</strong> (${fileSize})
        `;
        this.elements.fileInfo.classList.remove('hidden');
    }

    /**
     * Show progress section
     * @param {string} message - Progress message
     * @param {number} percent - Progress percentage
     */
    showProgress(message, percent) {
        this.elements.progressSection.classList.remove('hidden');
        this.updateProgress(message, percent);
    }

    /**
     * Update progress
     * @param {string} message - Progress message
     * @param {number} percent - Progress percentage
     */
    updateProgress(message, percent) {
        this.elements.progressFill.style.width = `${percent}%`;
        this.elements.progressText.textContent = message;
    }

    /**
     * Hide progress section
     */
    hideProgress() {
        this.elements.progressSection.classList.add('hidden');
    }

    /**
     * Render complete dashboard
     * @param {Object} analysis - Analysis results
     * @param {Object} parsedData - Parsed data
     */
    async renderDashboard(analysis, parsedData) {
        this.analysisData = analysis;
        this.calendarData = analysis.calendar;
        
        // Update summary cards
        this.renderSummaryCards(analysis);

        // Render overlaps alert
        this.renderOverlapsAlert(analysis.overlaps);

        // Render calendar view
        this.renderCalendar(analysis.calendar);
        
        // Setup calendar navigation
        this.setupCalendarNavigation();

        // Render employees summary
        this.renderEmployeesSummary(analysis.employees);

        // Render raw data (for debugging)
        this.renderRawData(parsedData, analysis);

        // Show dashboard
        this.elements.dashboardSection.classList.remove('hidden');
    }

    /**
     * Render summary cards
     * @param {Object} analysis - Analysis results
     */
    renderSummaryCards(analysis) {
        this.elements.totalEmployees.textContent = analysis.summary.totalEmployees;
        this.elements.totalTasks.textContent = analysis.summary.totalFeatures;
        this.elements.totalOverlaps.textContent = analysis.overlaps.length;
        
        // Highlight overlaps card if there are any
        const overlapsCard = this.elements.totalOverlaps.closest('.card');
        if (analysis.overlaps.length > 0) {
            overlapsCard.style.animation = 'pulse 2s infinite';
        }
    }
    
    /**
     * Render overlaps alert
     * @param {Array} overlaps - Array of overlaps
     */
    renderOverlapsAlert(overlaps) {
        if (overlaps.length === 0) {
            this.elements.overlapsAlert.classList.add('hidden');
            return;
        }
        
        this.elements.overlapsAlert.classList.remove('hidden');
        
        let html = '<div class="overlaps-list">';
        overlaps.forEach(overlap => {
            html += `
                <div class="overlap-item">
                    <strong>${overlap.employee}</strong> - ${overlap.date}
                    <div class="overlap-details">
                        עובד על ${overlap.taskCount} משימות ביום אחד:
                        <ul>
                            ${overlap.tasks.map(t => `<li>${t.name} (${t.project || 'ללא פרויקט'})</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        this.elements.overlapsList.innerHTML = html;
    }
    
    /**
     * Render calendar view
     * @param {Object} calendarData - Calendar data
     */
    renderCalendar(calendarData) {
        if (!calendarData || !calendarData.calendar) {
            this.elements.calendarView.innerHTML = '<p>אין נתונים להצגה</p>';
            return;
        }
        
        // Get all dates sorted
        const allDates = Object.keys(calendarData.calendar).sort((a, b) => {
            return this.parseDate(a) - this.parseDate(b);
        });
        
        if (allDates.length === 0) {
            this.elements.calendarView.innerHTML = '<p>לא נמצאו תאריכים</p>';
            return;
        }
        
        // Set initial week to first date
        if (!this.currentWeekStart) {
            this.currentWeekStart = this.parseDate(allDates[0]);
        }
        
        // Render week view
        this.renderWeekView(calendarData, allDates);
    }
    
    /**
     * Render week view of calendar
     * @param {Object} calendarData - Calendar data
     * @param {Array} allDates - All available dates
     */
    renderWeekView(calendarData, allDates) {
        // Get 7 days starting from currentWeekStart (only work days)
        const weekDates = [];
        const current = new Date(this.currentWeekStart);
        
        while (weekDates.length < 5) {  // 5 work days
            const day = current.getDay();
            if (day >= 0 && day <= 4) {  // Sunday-Thursday
                weekDates.push(this.formatDateObject(current));
            }
            current.setDate(current.getDate() + 1);
        }
        
        // Update week label
        const weekStart = weekDates[0];
        const weekEnd = weekDates[weekDates.length - 1];
        this.elements.currentWeek.textContent = `${weekStart} - ${weekEnd}`;
        
        // Build table
        let html = '<table class="calendar-table">';
        
        // Header row - dates
        html += '<thead><tr><th>עובד</th>';
        weekDates.forEach(date => {
            const dateObj = this.parseDate(date);
            const dayName = this.getDayName(dateObj);
            html += `<th><div class="date-header">${dayName}<br>${date}</div></th>`;
        });
        html += '</tr></thead>';
        
        // Body rows - employees
        html += '<tbody>';
        calendarData.employees.forEach(empName => {
            html += `<tr><td class="employee-name">${empName}</td>`;
            
            weekDates.forEach(date => {
                const tasks = calendarData.calendar[date]?.[empName] || [];
                const hasOverlap = tasks.length > 1;
                const cellClass = hasOverlap ? 'calendar-cell has-overlap' : 'calendar-cell';
                
                html += `<td class="${cellClass}">`;
                if (tasks.length > 0) {
                    tasks.forEach(task => {
                        const statusClass = task.status || 'gray';
                        html += `
                            <div class="task-badge ${statusClass}" title="${task.project || 'ללא פרויקט'}">
                                ${task.task}
                            </div>
                        `;
                    });
                    if (hasOverlap) {
                        html += `<div class="overlap-badge">⚠️ חפיפה!</div>`;
                    }
                } else {
                    html += '<div class="no-task">-</div>';
                }
                html += '</td>';
            });
            
            html += '</tr>';
        });
        html += '</tbody></table>';
        
        this.elements.calendarView.innerHTML = html;
    }
    
    /**
     * Setup calendar navigation buttons
     */
    setupCalendarNavigation() {
        document.getElementById('prevWeek').onclick = () => {
            const current = new Date(this.currentWeekStart);
            current.setDate(current.getDate() - 7);
            this.currentWeekStart = current;
            this.renderCalendar(this.calendarData);
        };
        
        document.getElementById('nextWeek').onclick = () => {
            const current = new Date(this.currentWeekStart);
            current.setDate(current.getDate() + 7);
            this.currentWeekStart = current;
            this.renderCalendar(this.calendarData);
        };
    }
    
    /**
     * Render employees summary
     * @param {Array} employees - Employee analysis
     */
    renderEmployeesSummary(employees) {
        let html = '';
        
        employees.forEach(emp => {
            html += `
                <div class="employee-summary-card">
                    <h3>${emp.name}</h3>
                    <div class="employee-stats">
                        <span>📋 ${emp.featureCount} משימות</span>
                        <span>📦 ${emp.projectCount} פרויקטים</span>
                    </div>
                </div>
            `;
        });
        
        this.elements.employeesSummary.innerHTML = html;
    }
    
    /**
     * Parse date string to Date object
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
     * Format Date object to string
     */
    formatDateObject(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    }
    
    /**
     * Get Hebrew day name
     */
    getDayName(date) {
        const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
        return days[date.getDay()];
    }

    /**
     * Render file structure analysis
     * @param {Object} parsedData - Parsed data
     */
    renderFileStructure(parsedData) {
        let html = '<div class="structure-info">';
        html += `<h3>📊 מבנה הקובץ</h3>`;
        html += `<p><strong>מספר גיליונות:</strong> ${parsedData.sheetCount}</p>`;
        html += `<p><strong>עובדים:</strong> ${parsedData.employees.map(e => e.name).join(', ')}</p>`;
        html += '</div>';

        parsedData.sheets.forEach((sheet, index) => {
            html += `
                <div class="sheet-info">
                    <div class="sheet-name">גיליון ${index + 1}: ${sheet.name}</div>
                    <div>שורות: ${sheet.data.rowCount}</div>
                    <div>פיצ'רים זוהו: ${sheet.data.features.length}</div>
                    <div>פרויקטים: ${sheet.data.projects.length > 0 ? sheet.data.projects.join(', ') : 'לא זוהו'}</div>
                    <div>גרסאות: ${sheet.data.versions.length > 0 ? sheet.data.versions.join(', ') : 'לא זוהו'}</div>
                </div>
            `;
        });

        this.elements.fileStructure.innerHTML = html;
    }

    /**
     * Render delivery timeline
     * @param {Array} timeline - Timeline items
     */
    renderDeliveryTimeline(timeline) {
        if (timeline.length === 0) {
            this.elements.deliveryTimeline.innerHTML = '<p>לא נמצאו תאריכי מסירה</p>';
            return;
        }

        let html = '';
        timeline.forEach(item => {
            const statusClass = item.overallStatus;
            const statusEmoji = this.getStatusEmoji(item.overallStatus);
            
            html += `
                <div class="timeline-item">
                    <div class="timeline-date">${item.date}</div>
                    <div class="timeline-content">
                        <strong>${item.features.length} פיצ'רים למסירה</strong><br>
                        <small>עובדים: ${item.employees.join(', ')}</small><br>
                        ${item.projects.length > 0 ? `<small>פרויקטים: ${item.projects.join(', ')}</small>` : ''}
                    </div>
                    <div class="timeline-badge ${statusClass}" title="${this.getStatusLabel(item.overallStatus)}">
                        ${statusEmoji}
                    </div>
                </div>
            `;
        });

        this.elements.deliveryTimeline.innerHTML = html;
    }

    /**
     * Render features summary by version
     * @param {Array} versions - Version analysis
     */
    renderFeaturesSummary(versions) {
        if (versions.length === 0) {
            this.elements.featuresSummary.innerHTML = '<p>לא נמצאו גרסאות</p>';
            return;
        }

        let html = '';
        versions.forEach(version => {
            html += `
                <div class="version-block">
                    <div class="version-header">
                        <div class="version-name">גרסה ${version.name}</div>
                        <div class="version-status ${version.overallStatus}" 
                             title="${this.getStatusLabel(version.overallStatus)}"></div>
                    </div>
                    <div class="version-stats">
                        <span>📦 ${version.featureCount} פיצ'רים</span> | 
                        <span>👥 ${version.employeeCount} עובדים</span> | 
                        <span>🎯 ${version.projectCount} פרויקטים</span>
                    </div>
                    <div class="status-breakdown">
                        <span>🟢 ${version.statusCounts.green}</span>
                        <span>🟡 ${version.statusCounts.yellow}</span>
                        <span>🔴 ${version.statusCounts.red}</span>
                        <span>⚪ ${version.statusCounts.gray}</span>
                    </div>
                    <div class="version-features">
                        ${version.features.slice(0, 5).map(f => `
                            <div class="feature-item">
                                <div class="feature-status-dot ${f.status}"></div>
                                <div>${f.featureName || 'ללא שם'}</div>
                            </div>
                        `).join('')}
                        ${version.features.length > 5 ? `<small>ועוד ${version.features.length - 5} פיצ'רים...</small>` : ''}
                    </div>
                </div>
            `;
        });

        this.elements.featuresSummary.innerHTML = html;
    }

    /**
     * Render employee details
     * @param {Array} employees - Employee analysis
     */
    renderEmployeeDetails(employees) {
        let html = '';
        
        employees.forEach(emp => {
            html += `
                <div class="employee-card">
                    <div class="employee-name">${emp.name}</div>
                    <div class="employee-stats">
                        <div class="stat-item">
                            <div class="stat-label">פיצ'רים</div>
                            <div class="stat-value">${emp.featureCount}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">פרויקטים</div>
                            <div class="stat-value">${emp.projectCount}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">גרסאות</div>
                            <div class="stat-value">${emp.versionCount}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">עומס</div>
                            <div class="stat-value">${emp.workload}</div>
                        </div>
                    </div>
                    <div class="status-breakdown" style="margin-top: 1rem;">
                        <span>🟢 ירוק: ${emp.statusCounts.green}</span>
                        <span>🟡 צהוב: ${emp.statusCounts.yellow}</span>
                        <span>🔴 אדום: ${emp.statusCounts.red}</span>
                        <span>⚪ אפור: ${emp.statusCounts.gray}</span>
                    </div>
                    ${emp.projects.length > 0 ? `
                        <div style="margin-top: 1rem;">
                            <strong>פרויקטים:</strong> ${emp.projects.join(', ')}
                        </div>
                    ` : ''}
                </div>
            `;
        });

        this.elements.employeesDetails.innerHTML = html;
    }

    /**
     * Render raw data for debugging
     * @param {Object} parsedData - Parsed data
     * @param {Object} analysis - Analysis results
     */
    renderRawData(parsedData, analysis) {
        const data = {
            parsedData: parsedData,
            analysis: analysis
        };
        
        this.elements.rawDataViewer.textContent = JSON.stringify(data, null, 2);
    }

    /**
     * Get status emoji
     * @param {string} status - Status
     * @returns {string} - Emoji
     */
    getStatusEmoji(status) {
        const emojis = {
            green: '✅',
            yellow: '⚠️',
            red: '❌',
            gray: '⚪'
        };
        return emojis[status] || '⚪';
    }

    /**
     * Get status label
     * @param {string} status - Status
     * @returns {string} - Label
     */
    getStatusLabel(status) {
        const labels = {
            green: 'נמסר בזמן',
            yellow: 'חשש לעיכוב',
            red: 'צפוי לעכב',
            gray: 'עומד בלוז'
        };
        return labels[status] || 'לא ידוע';
    }

    /**
     * Format file size
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

