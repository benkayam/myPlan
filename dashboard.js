// Global State
let workbookData = null;
let versionsData = null; // New: versions with features and statuses
let currentStartDate = new Date();
let currentFileName = null;

// DOM Elements
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const dropZone = document.getElementById('dropZone');
const dashboard = document.getElementById('dashboard');
const emptyState = document.getElementById('emptyState');
const fileInfo = document.getElementById('fileInfo');
const globalTooltip = document.getElementById('globalTooltip');
const employeeFilter = document.getElementById('employeeFilter');
const taskSearch = document.getElementById('taskSearch');

// Event Listeners
uploadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileUpload);
document.getElementById('prevMonth')?.addEventListener('click', () => navigateMonth(-1));
document.getElementById('nextMonth')?.addEventListener('click', () => navigateMonth(1));

// Drag & Drop Event Listeners
dropZone.addEventListener('dragover', handleDragOver);
dropZone.addEventListener('dragleave', handleDragLeave);
dropZone.addEventListener('drop', handleDrop);

// Prevent default drag behaviors on document
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Drag & Drop Handlers
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
    const overlay = dropZone.querySelector('.drop-zone-overlay');
    if (overlay) overlay.classList.remove('hidden');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    // Only remove if we're leaving the drop zone entirely
    if (e.target === dropZone) {
        dropZone.classList.remove('drag-over');
        const overlay = dropZone.querySelector('.drop-zone-overlay');
        if (overlay) overlay.classList.add('hidden');
    }
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    dropZone.classList.remove('drag-over');
    const overlay = dropZone.querySelector('.drop-zone-overlay');
    if (overlay) overlay.classList.add('hidden');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        // Check if it's an Excel file
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            // Create a new FileList-like object
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;
            
            // Trigger the change event
            handleFileUpload({ target: { files: [file] } });
        } else {
            alert('אנא העלה קובץ Excel (.xlsx או .xls)');
        }
    }
}

// Filter listeners
if (employeeFilter) {
    employeeFilter.addEventListener('change', applyTaskFilters);
}
if (taskSearch) {
    taskSearch.addEventListener('input', applyTaskFilters);
}

// Load data from localStorage on page load
window.addEventListener('DOMContentLoaded', loadFromLocalStorage);

// Excel date conversion (Excel stores dates as numbers starting from 1900-01-01)
function excelDateToJSDate(excelDate) {
    if (!excelDate || typeof excelDate !== 'number') return null;
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const excelEpoch = new Date(1899, 11, 30); // Excel epoch
    return new Date(excelEpoch.getTime() + excelDate * millisecondsPerDay);
}

// Format date
function formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Format short date
function formatShortDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
}

// Map color to status
function getStatusFromColor(cellStyle) {
    if (!cellStyle || !cellStyle.fgColor) return 'unknown';
    
    const color = cellStyle.fgColor;
    
    // Yellow - warning (חשש לעיכוב)
    if (color.rgb === 'FFFF00') return 'warning';
    
    // Green - delivered (נמסר בזמן)
    if (color.rgb === 'A9D18E' || (color.theme === 9 && color.tint > 0)) return 'delivered';
    
    // Gray - on track (עומד בלוז)
    if (color.theme === 0 && color.tint && color.tint < 0) return 'ontrack';
    if (color.rgb === 'D9D9D9' || color.rgb === 'BFBFBF') return 'ontrack';
    
    // Red - delayed (צפוי לעכב)
    if (color.rgb && (color.rgb.startsWith('FF') && color.rgb !== 'FFFF00')) return 'delayed';
    if (color.rgb === 'FFC7CE' || color.rgb === 'FF0000') return 'delayed';
    
    return 'unknown';
}

// Get status display name
function getStatusName(status) {
    const names = {
        'ontrack': 'עומד בלוז',
        'warning': 'חשש לעיכוב',
        'delayed': 'צפוי לעכב',
        'delivered': 'נמסר בזמן',
        'unknown': 'לא ידוע'
    };
    return names[status] || 'לא ידוע';
}

// Handle file upload
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    currentFileName = file.name;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            console.log('📋 מתחיל לטעון קובץ...');
            const data = new Uint8Array(e.target.result);
            
            console.log('📖 קורא אקסל...');
            const workbook = XLSX.read(data, { type: 'array', cellStyles: true });
            console.log('✅ אקסל נקרא בהצלחה');
            
            console.log('🔄 מפרסר משימות...');
            workbookData = parseWorkbook(workbook);
            console.log(`✅ נמצאו ${workbookData.length} עובדים`);
            
            console.log('🔄 מפרסר גרסאות...');
            versionsData = parseVersions(workbook);
            console.log(`✅ נמצאו ${versionsData ? versionsData.length : 0} גרסאות`);
            
            console.log('💾 שומר ב-localStorage...');
            saveToLocalStorage();
            console.log('✅ נשמר בהצלחה');
            
            console.log('🎨 מציג דשבורד...');
            displayDashboard();
            console.log('✅ סיים!');
            
        } catch (error) {
            console.error('❌ שגיאה בקריאת הקובץ:', error);
            console.error(error.stack);
            alert('שגיאה בקריאת הקובץ: ' + error.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

// Save data to localStorage
function saveToLocalStorage() {
    try {
        const dataToSave = {
            workbookData: workbookData,
            versionsData: versionsData,
            fileName: currentFileName,
            savedAt: new Date().toISOString()
        };
        
        localStorage.setItem('myPlan_data', JSON.stringify(dataToSave));
        console.log('✅ נתונים נשמרו ב-localStorage');
    } catch (error) {
        console.error('❌ שגיאה בשמירה ל-localStorage:', error);
        // If quota exceeded, try to clear old data
        if (error.name === 'QuotaExceededError') {
            console.warn('⚠️ localStorage מלא, מנסה לנקות...');
            localStorage.removeItem('myPlan_data');
            // Try again
            try {
                localStorage.setItem('myPlan_data', JSON.stringify(dataToSave));
                console.log('✅ נשמר בהצלחה אחרי ניקוי');
            } catch (e) {
                console.error('❌ לא ניתן לשמור - הקובץ גדול מדי');
            }
        }
    }
}

// Load data from localStorage
function loadFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('myPlan_data');
        
        if (!savedData) {
            console.log('ℹ️ אין נתונים שמורים');
            return;
        }
        
        console.log('📂 מוצא נתונים שמורים...');
        const data = JSON.parse(savedData);
        
        // Restore dates (they were converted to strings in JSON)
        if (data.workbookData) {
            data.workbookData.forEach(employee => {
                employee.tasks.forEach(task => {
                    if (task.startDate) task.startDate = new Date(task.startDate);
                    if (task.endDate) task.endDate = new Date(task.endDate);
                });
            });
        }
        
        if (data.versionsData) {
            data.versionsData.forEach(version => {
                version.features.forEach(feature => {
                    if (feature.qaDate) feature.qaDate = new Date(feature.qaDate);
                });
            });
        }
        
        workbookData = data.workbookData;
        versionsData = data.versionsData;
        currentFileName = data.fileName;
        
        console.log(`✅ נתונים נטענו מ-localStorage (${currentFileName})`);
        console.log(`   נשמר בתאריך: ${new Date(data.savedAt).toLocaleString('he-IL')}`);
        
        displayDashboard();
        
    } catch (error) {
        console.error('❌ שגיאה בטעינה מ-localStorage:', error);
        localStorage.removeItem('myPlan_data');
    }
}

// Clear localStorage
function clearLocalStorage() {
    if (confirm('האם למחוק את הנתונים השמורים?')) {
        localStorage.removeItem('myPlan_data');
        console.log('✅ נתונים נמחקו');
        location.reload();
    }
}

// Parse versions with features and statuses
function parseVersions(workbook) {
    const versions = new Map(); // version name -> { features: [], employees: [] }
    
    workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        
        // Collect all features first, then find version
        const features = [];
        let versionName = null;
        let versionStatus = null;
        let currentFeature = null;
        
        for (let row = 1; row <= range.e.r; row++) {
            const cellA = worksheet[XLSX.utils.encode_cell({r: row, c: 0})];
            const cellC = worksheet[XLSX.utils.encode_cell({r: row, c: 2})];
            const cellD = worksheet[XLSX.utils.encode_cell({r: row, c: 3})];
            
            // Feature/Version row: A has value, C is empty
            if (cellA && cellA.v && (!cellC || !cellC.v)) {
                const text = cellA.v;
                const status = getStatusFromColor(cellA.s);
                
                // Skip header
                if (text === 'דרישה') continue;
                
                // Check if it's a version (usually contains "גרסה" or last row)
                if (text.includes('גרסה') || text.includes('גולדן') || text.includes('version')) {
                    versionName = text;
                    versionStatus = status;
                } 
                // It's a feature
                else {
                    currentFeature = {
                        name: text,
                        status: status,
                        employee: sheetName,
                        qaDate: null
                    };
                    features.push(currentFeature);
                }
            }
            // QA date row
            else if (cellC && cellC.v && (cellC.v === 'העברה לqa' || cellC.v === 'העברה ל-qa')) {
                if (currentFeature && cellD && cellD.v) {
                    currentFeature.qaDate = excelDateToJSDate(cellD.v);
                }
            }
        }
        
        // Add to versions map
        if (versionName) {
            if (!versions.has(versionName)) {
                versions.set(versionName, {
                    name: versionName,
                    status: versionStatus,
                    features: [],
                    employees: new Set()
                });
            }
            
            const version = versions.get(versionName);
            version.employees.add(sheetName);
            
            // Add features to version
            features.forEach(feature => {
                const existingFeature = version.features.find(f => f.name === feature.name);
                if (existingFeature) {
                    existingFeature.employees = existingFeature.employees || [existingFeature.employee];
                    if (!existingFeature.employees.includes(sheetName)) {
                        existingFeature.employees.push(sheetName);
                    }
                } else {
                    version.features.push(feature);
                }
            });
        }
    });
    
    // Convert to array and calculate overall status
    return Array.from(versions.values()).map(version => {
        version.employees = Array.from(version.employees);
        
        // Calculate overall version status based on features
        if (version.features.length > 0) {
            const statuses = version.features.map(f => f.status);
            if (statuses.includes('delayed')) {
                version.overallStatus = 'delayed';
            } else if (statuses.includes('warning')) {
                version.overallStatus = 'warning';
            } else if (statuses.every(s => s === 'delivered')) {
                version.overallStatus = 'delivered';
            } else if (statuses.every(s => s === 'ontrack' || s === 'delivered')) {
                version.overallStatus = 'ontrack';
            } else {
                version.overallStatus = 'unknown';
            }
        } else {
            version.overallStatus = version.status || 'unknown';
        }
        
        return version;
    });
}

// Parse workbook data
function parseWorkbook(workbook) {
    const employees = [];
    
    workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const tasks = [];
        
        // Get the range of the worksheet
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        
        // Track current feature and requirement
        let currentRequirement = '';
        let currentTask = '';
        
        // Start from row 2 (skip header row 1)
        for (let row = 1; row <= range.e.r; row++) {
            // Get cell references
            const cellA = worksheet[XLSX.utils.encode_cell({r: row, c: 0})]; // דרישה
            const cellB = worksheet[XLSX.utils.encode_cell({r: row, c: 1})]; // משימה
            const cellC = worksheet[XLSX.utils.encode_cell({r: row, c: 2})]; // תתי-משימה
            const cellD = worksheet[XLSX.utils.encode_cell({r: row, c: 3})]; // Duration
            const cellE = worksheet[XLSX.utils.encode_cell({r: row, c: 4})]; // Effort
            const cellF = worksheet[XLSX.utils.encode_cell({r: row, c: 5})]; // תאריך התחלה
            const cellG = worksheet[XLSX.utils.encode_cell({r: row, c: 6})]; // תאריך סיום
            const cellH = worksheet[XLSX.utils.encode_cell({r: row, c: 7})]; // הערות
            const cellI = worksheet[XLSX.utils.encode_cell({r: row, c: 8})]; // תקצוב מקורי
            const cellJ = worksheet[XLSX.utils.encode_cell({r: row, c: 9})]; // תקצוב בפועל
            
            // Skip feature title rows (only A has value, and C doesn't start with a task)
            const subTaskValue = cellC ? cellC.v : '';
            if (subTaskValue === 'העברה לqa' || subTaskValue === 'העברה ל-qa') {
                // Skip QA transfer rows
                continue;
            }
            
            // Update current requirement if A has value
            if (cellA && cellA.v) {
                currentRequirement = cellA.v;
            }
            
            // Update current task if B has value
            if (cellB && cellB.v) {
                currentTask = cellB.v;
            }
            
            // Only process rows with sub-task, start date, and end date
            if (cellC && cellC.v && cellF && cellF.v && cellG && cellG.v) {
                const startDate = excelDateToJSDate(cellF.v);
                const endDate = excelDateToJSDate(cellG.v);
                
                // Valid dates check
                if (startDate && endDate && startDate <= endDate) {
                    // Sanity check: reject dates before 2020 or after 2030
                    const minDate = new Date(2020, 0, 1);
                    const maxDate = new Date(2030, 11, 31);
                    
                    if (startDate >= minDate && startDate <= maxDate && 
                        endDate >= minDate && endDate <= maxDate) {
                        tasks.push({
                            requirement: currentRequirement,
                            task: currentTask,
                            subTask: cellC.v,
                            duration: cellD && cellD.v ? cellD.v : 0,
                            effort: cellE && cellE.v ? cellE.v : 0,
                            startDate: startDate,
                            endDate: endDate,
                            notes: cellH && cellH.v ? cellH.v : '',
                        });
                    } else {
                        console.warn(`תאריכים לא סבירים עבור ${sheetName}: ${cellC.v} (${startDate} - ${endDate})`);
                    }
                }
            }
        }
        
        if (tasks.length > 0) {
            employees.push({
                name: sheetName,
                tasks: tasks
            });
        }
    });
    
    return employees;
}

// Display dashboard
function displayDashboard() {
    try {
        console.log('  → מציג דשבורד...');
        dashboard.classList.remove('hidden');
        
        // Hide drop zone, show file info
        dropZone.style.display = 'none';
        
        console.log('  → מעדכן file info...');
        fileInfo.classList.remove('hidden');
        
        // Show file name and clear button
        fileInfo.innerHTML = `
            <span>📄 ${currentFileName || 'קובץ נטען'}</span>
            <button class="btn-clear-data" onclick="clearLocalStorage()" title="מחק נתונים ורענן">🗑️</button>
        `;
        
        console.log('  → מציג מצב גרסה...');
        renderVersionStatus();
        
        console.log('  → מציג גרף עומס...');
        renderWorkloadChart();
        
        console.log('  → מציג ציר זמן...');
        renderTimeline();
        
        console.log('  → מציג משימות היום...');
        renderTodayTasks();
        
        console.log('  → מציג פרטי עובדים...');
        renderEmployeeDetails();
        
        console.log('  ✅ displayDashboard הושלם');
    } catch (error) {
        console.error('❌ שגיאה ב-displayDashboard:', error);
        console.error(error.stack);
        throw error;
    }
}

// Check if date is a work day (Sunday-Thursday in Israel)
function isWorkDay(date) {
    const day = date.getDay();
    return day >= 0 && day <= 4; // 0=Sunday, 4=Thursday
}

// Calculate effort for a specific date
function getEffortForDate(tasks, date) {
    const dateStr = date.toDateString();
    return tasks
        .filter(task => {
            const start = new Date(task.startDate).toDateString();
            const end = new Date(task.endDate).toDateString();
            return task.startDate <= date && task.endDate >= date;
        })
        .reduce((sum, task) => {
            // Calculate how many work days in the task period
            const workDaysInTask = countWorkDays(task.startDate, task.endDate);
            // Distribute effort across work days
            const effortPerDay = workDaysInTask > 0 ? task.effort / workDaysInTask : 0;
            return sum + effortPerDay;
        }, 0);
}

// Count work days between two dates
function countWorkDays(startDate, endDate) {
    let count = 0;
    let current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
        if (isWorkDay(current)) {
            count++;
        }
        current.setDate(current.getDate() + 1);
    }
    
    return count || 1; // At least 1 to avoid division by zero
}

// Find dates with overlapping tasks (more than 1 day of work)
function findOverlappingDates(employee) {
    const overlaps = [];
    const dateMap = new Map();
    
    // Safety check
    if (!employee.tasks || employee.tasks.length === 0) {
        return [];
    }
    
    // Get all unique dates from all tasks
    employee.tasks.forEach(task => {
        // Validate dates
        if (!task.startDate || !task.endDate) return;
        
        let current = new Date(task.startDate);
        const end = new Date(task.endDate);
        
        // Safety: prevent infinite loop if dates are invalid
        if (current > end || isNaN(current.getTime()) || isNaN(end.getTime())) {
            console.warn(`תאריכים לא תקינים עבור ${employee.name}:`, task);
            return;
        }
        
        // Safety: limit iterations to prevent infinite loop
        let iterations = 0;
        const MAX_ITERATIONS = 1000;
        
        while (current <= end && iterations < MAX_ITERATIONS) {
            if (isWorkDay(current)) {
                const dateStr = current.toDateString();
                const effort = getEffortForDate(employee.tasks, current);
                
                if (effort > 1.0) {
                    dateMap.set(dateStr, {
                        date: new Date(current),
                        effort: effort
                    });
                }
            }
            current.setDate(current.getDate() + 1);
            iterations++;
        }
        
        if (iterations >= MAX_ITERATIONS) {
            console.error(`נמנע לולאה אינסופית עבור ${employee.name}`);
        }
    });
    
    return Array.from(dateMap.values());
}

// Calculate average daily effort
function calculateAverageEffort(employee) {
    if (employee.tasks.length === 0) return 0;
    const totalEffort = employee.tasks.reduce((sum, task) => sum + (task.effort || 0), 0);
    const totalDuration = employee.tasks.reduce((sum, task) => sum + (task.duration || 1), 0);
    return totalDuration > 0 ? totalEffort / totalDuration : 0;
}

// Render workload chart
function renderWorkloadChart() {
    const container = document.getElementById('workloadChart');
    container.innerHTML = '';
    
    workbookData.forEach(employee => {
        const totalEffort = employee.tasks.reduce((sum, task) => sum + (task.effort || 0), 0);
        const totalTasks = employee.tasks.length;
        const avgEffort = calculateAverageEffort(employee);
        const overlaps = findOverlappingDates(employee);
        
        // Determine status
        let status = 'normal';
        let statusText = 'תקין';
        
        if (overlaps.length > 0) {
            status = 'overlap';
            statusText = `⚠️ חפיפת משימות (${overlaps.length} ימים)`;
        } else if (avgEffort > 1.5) {
            status = 'high';
            statusText = 'עומס גבוה';
        } else if (avgEffort < 0.5) {
            status = 'low';
            statusText = 'עומס נמוך';
        }
        
        const bar = document.createElement('div');
        bar.className = 'workload-bar';
        bar.innerHTML = `
            <div class="workload-info">
                <span class="employee-name">${employee.name}</span>
                <span class="workload-stats">
                    ${totalTasks} משימות | ${totalEffort.toFixed(1)} ימי עבודה | 
                    <span class="status-badge status-${status}">${statusText}</span>
                </span>
            </div>
            <div class="workload-progress">
                <div class="workload-fill workload-${status}" style="width: ${Math.min(avgEffort * 50, 100)}%"></div>
            </div>
        `;
        container.appendChild(bar);
    });
}

// Render timeline
function renderTimeline() {
    const container = document.getElementById('timeline');
    const monthLabel = document.getElementById('currentMonth');
    
    container.innerHTML = '';
    
    // Generate 30 days from current start date
    const days = [];
    for (let i = 0; i < 30; i++) {
        const date = new Date(currentStartDate);
        date.setDate(date.getDate() + i);
        days.push(date);
    }
    
    // Update month label
    monthLabel.textContent = currentStartDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
    
    // Create timeline header
    const header = document.createElement('div');
    header.className = 'timeline-header';
    header.innerHTML = '<div class="timeline-employee-col">עובד</div>';
    
    days.forEach(day => {
        const dayEl = document.createElement('div');
        dayEl.className = 'timeline-day';
        
        if (!isWorkDay(day)) {
            dayEl.classList.add('weekend');
        }
        
        dayEl.innerHTML = `
            <div class="day-number">${day.getDate()}</div>
            <div class="day-name">${day.toLocaleDateString('he-IL', { weekday: 'short' })}</div>
        `;
        if (isToday(day)) {
            dayEl.classList.add('today');
        }
        header.appendChild(dayEl);
    });
    
    container.appendChild(header);
    
    // Create timeline rows for each employee
    workbookData.forEach(employee => {
        const row = document.createElement('div');
        row.className = 'timeline-row';
        
        const nameCell = document.createElement('div');
        nameCell.className = 'timeline-employee-col';
        nameCell.textContent = employee.name;
        row.appendChild(nameCell);
        
        days.forEach(day => {
            const cell = document.createElement('div');
            cell.className = 'timeline-cell';
            
            // Check if it's a work day
            if (!isWorkDay(day)) {
                cell.classList.add('weekend');
                cell.title = 'סוף שבוע';
                row.appendChild(cell);
                return;
            }
            
            // Find tasks for this day
            const tasksForDay = employee.tasks.filter(task => 
                task.startDate <= day && task.endDate >= day
            );
            
            if (tasksForDay.length > 0) {
                const effortForDay = getEffortForDate(employee.tasks, day);
                
                cell.classList.add('has-task');
                
                // Determine cell content
                if (effortForDay > 1.0) {
                    cell.classList.add('overlap-task');
                    cell.textContent = effortForDay.toFixed(1);
                } else if (tasksForDay.length > 1) {
                    cell.classList.add('multiple-tasks');
                    cell.textContent = tasksForDay.length;
                } else {
                    cell.textContent = '✓';
                }
                
                // Add hover events for global tooltip
                cell.addEventListener('mouseenter', () => {
                    // Build tooltip content with full hierarchy
                    let tooltipHTML = '';
                    
                    if (effortForDay > 1.0) {
                        tooltipHTML += `<div class="tooltip-warning">⚠️ חפיפה: ${effortForDay.toFixed(1)} ימי עבודה</div>`;
                    }
                    
                    tooltipHTML += '<div class="tooltip-tasks">';
                    tasksForDay.forEach(t => {
                        const req = t.requirement || 'ללא דרישה';
                        const task = t.task || 'ללא משימה';
                        const subTask = t.subTask || 'ללא תת-משימה';
                        tooltipHTML += `<div class="tooltip-task-item">${req} → ${task} → ${subTask}</div>`;
                    });
                    tooltipHTML += '</div>';
                    
                    globalTooltip.innerHTML = tooltipHTML;
                    globalTooltip.classList.add('visible');
                });
                
                cell.addEventListener('mouseleave', () => {
                    globalTooltip.classList.remove('visible');
                });
            }
            
            if (isToday(day)) {
                cell.classList.add('today');
            }
            
            row.appendChild(cell);
        });
        
        container.appendChild(row);
    });
}

// Check if date is today
function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

// Navigate month
function navigateMonth(direction) {
    currentStartDate.setMonth(currentStartDate.getMonth() + direction);
    renderTimeline();
}

// Render today's tasks
function renderTodayTasks() {
    const container = document.getElementById('todayTasks');
    container.innerHTML = '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    workbookData.forEach(employee => {
        const todayTasks = employee.tasks.filter(task => 
            task.startDate <= today && task.endDate >= today
        );
        
        if (todayTasks.length > 0) {
            todayTasks.forEach(task => {
                const taskCard = document.createElement('div');
                taskCard.className = 'task-card';
                taskCard.innerHTML = `
                    <div class="task-header">
                        <span class="task-employee">${employee.name}</span>
                        ${task.requirement ? `<span class="task-req">${task.requirement}</span>` : ''}
                    </div>
                    <div class="task-title">${task.subTask}</div>
                    ${task.task ? `<div class="task-parent">${task.task}</div>` : ''}
                    <div class="task-meta">
                        <span>${task.effort} ימי עבודה</span>
                        <span>${formatShortDate(task.startDate)} - ${formatShortDate(task.endDate)}</span>
                    </div>
                `;
                container.appendChild(taskCard);
            });
        }
    });
    
    if (container.children.length === 0) {
        container.innerHTML = '<div class="empty-message">אין משימות מתוכננות להיום</div>';
    }
}

// Render version status
function renderVersionStatus() {
    const container = document.getElementById('versionStatus');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!versionsData || versionsData.length === 0) {
        container.innerHTML = '<div class="empty-message">לא נמצאו גרסאות</div>';
        return;
    }
    
    versionsData.forEach(version => {
        const statusClass = version.overallStatus || 'unknown';
        const statusIcon = {
            'delivered': '✅',
            'ontrack': '⚪',
            'warning': '⚠️',
            'delayed': '🔴',
            'unknown': '❓'
        }[statusClass] || '❓';
        
        const versionCard = document.createElement('div');
        versionCard.className = 'version-wrapper';
        versionCard.innerHTML = `
            <div class="version-header">
                <h3 data-status="${statusClass}">${statusIcon} ${version.name}</h3>
                <div class="version-meta">
                    <span>📋 ${version.features.length} פיצ'רים</span>
                    <button class="btn-export-pdf" onclick="exportVersionToPDF('${version.name}')">
                        📄 ייצא ל-PDF
                    </button>
                </div>
            </div>
            <div class="features-grid"></div>
        `;
        
        const featuresGrid = versionCard.querySelector('.features-grid');
        
        // Add feature cards
        version.features.forEach(feature => {
            const featureIcon = {
                'delivered': '✅',
                'ontrack': '⚪',
                'warning': '⚠️',
                'delayed': '🔴',
                'unknown': '❓'
            }[feature.status] || '❓';
            
            const employees = feature.employees || [feature.employee];
            
            const featureCard = document.createElement('div');
            featureCard.className = `feature-card feature-${feature.status}`;
            featureCard.innerHTML = `
                <div class="feature-icon">${featureIcon}</div>
                <div class="feature-content">
                    <div class="feature-name">${feature.name}</div>
                    <div class="feature-meta">
                        <span class="feature-status">${getStatusName(feature.status)}</span>
                        <span class="feature-employees">👤 ${employees.join(', ')}</span>
                        ${feature.qaDate ? `<span class="feature-qa">📅 ${formatShortDate(feature.qaDate)}</span>` : ''}
                    </div>
                </div>
            `;
            featuresGrid.appendChild(featureCard);
        });
        
        container.appendChild(versionCard);
    });
}

// Make functions global for onclick handlers
window.clearLocalStorage = clearLocalStorage;

// Export Version Status to PDF (Global function for onclick)
window.exportVersionToPDF = function(versionName) {
    console.log(`🔄 מתחיל ייצוא PDF עבור: ${versionName}`);
    
    // Find the version data
    const version = versionsData.find(v => v.name === versionName);
    if (!version) {
        alert('לא נמצאה גרסה');
        return;
    }
    
    // Open print dialog with version section
    const printWindow = window.open('', '_blank');
    
    const statusClass = version.overallStatus || 'unknown';
    const statusIcon = {
        'delivered': '✅',
        'ontrack': '⚪',
        'warning': '⚠️',
        'delayed': '🔴',
        'unknown': '❓'
    }[statusClass] || '❓';
    
    const statusColors = {
        'delivered': '#5BA35E',
        'ontrack': '#2A4066',
        'warning': '#E4A23C',
        'delayed': '#D44942',
        'unknown': '#7D8CA3'
    };
    
    let featuresHTML = '';
    version.features.forEach(feature => {
        const featureIcon = {
            'delivered': '✅',
            'ontrack': '⚪',
            'warning': '⚠️',
            'delayed': '🔴',
            'unknown': '❓'
        }[feature.status] || '❓';
        
        const employees = feature.employees || [feature.employee];
        
        featuresHTML += `
            <div class="feature-row">
                <div class="feature-icon">${featureIcon}</div>
                <div class="feature-name">${feature.name}</div>
                <div class="feature-status">${getStatusName(feature.status)}</div>
                <div class="feature-employees">${employees.join(', ')}</div>
                <div class="feature-qa">${feature.qaDate ? formatShortDate(feature.qaDate) : '-'}</div>
            </div>
        `;
    });
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="he" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>מצב גרסה - ${versionName}</title>
            <style>
                @media print {
                    @page { 
                        margin: 1cm;
                        size: A4 portrait;
                    }
                    
                    body {
                        transform: scale(0.95);
                        transform-origin: top right;
                    }
                    
                    .header {
                        page-break-after: avoid;
                    }
                    
                    .summary {
                        page-break-after: avoid;
                        page-break-inside: avoid;
                    }
                    
                    .feature-row {
                        page-break-inside: avoid;
                    }
                }
                
                * {
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Calibri', 'Arial', sans-serif;
                    direction: rtl;
                    padding: 15px;
                    background: #fff;
                    margin: 0;
                    height: 100%;
                    font-size: 13px;
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 15px;
                    padding-bottom: 12px;
                    border-bottom: 3px solid ${statusColors[statusClass]};
                }
                
                .header h1 {
                    font-size: 24px;
                    color: ${statusColors[statusClass]};
                    margin-bottom: 6px;
                    margin-top: 0;
                }
                
                .header .meta {
                    font-size: 12px;
                    color: #5A6B82;
                }
                
                .summary {
                    background: #F4F6F8;
                    padding: 12px;
                    border-radius: 6px;
                    margin-bottom: 15px;
                    display: flex;
                    justify-content: space-around;
                    text-align: center;
                }
                
                .summary-item {
                    flex: 1;
                }
                
                .summary-item .label {
                    font-size: 11px;
                    color: #7D8CA3;
                    margin-bottom: 4px;
                }
                
                .summary-item .value {
                    font-size: 20px;
                    font-weight: bold;
                    color: #2A4066;
                }
                
                .features-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                
                .features-table th {
                    background: #2A4066;
                    color: white;
                    padding: 12px;
                    text-align: right;
                    font-weight: 600;
                }
                
                .table-header {
                    display: grid;
                    grid-template-columns: 30px 2fr 1fr 1.5fr 0.8fr;
                    gap: 8px;
                    padding: 10px;
                    background: #2A4066;
                    color: white;
                    font-weight: 600;
                    border-radius: 6px 6px 0 0;
                }
                
                .feature-row {
                    display: grid;
                    grid-template-columns: 30px 2fr 1fr 1.5fr 0.8fr;
                    gap: 8px;
                    padding: 8px 10px;
                    border-bottom: 1px solid #E7ECF1;
                    align-items: center;
                }
                
                .feature-row:nth-child(even) {
                    background: #FAFBFC;
                }
                
                .feature-icon {
                    font-size: 16px;
                    text-align: center;
                }
                
                .feature-name {
                    font-weight: 600;
                    color: #2A4066;
                    font-size: 13px;
                }
                
                .feature-status {
                    color: #5A6B82;
                    font-size: 12px;
                }
                
                .feature-employees {
                    color: #7D8CA3;
                    font-size: 12px;
                }
                
                .feature-qa {
                    color: #7D8CA3;
                    font-size: 11px;
                }
                
                .footer {
                    margin-top: 15px;
                    text-align: center;
                    color: #7D8CA3;
                    font-size: 10px;
                }
                
                .table-header {
                    display: grid;
                    grid-template-columns: 30px 2fr 1fr 1.5fr 0.8fr;
                    gap: 8px;
                    padding: 10px;
                    background: #2A4066;
                    color: white;
                    font-weight: 600;
                    border-radius: 6px 6px 0 0;
                    font-size: 13px;
                }
                
                .features-container {
                    border: 1px solid #E7ECF1;
                    border-radius: 0 0 6px 6px;
                    border-top: none;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${statusIcon} ${versionName}</h1>
                <div class="meta">נוצר ב-${new Date().toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            
            <div class="summary">
                <div class="summary-item">
                    <div class="label">סטטוס כללי</div>
                    <div class="value" style="color: ${statusColors[statusClass]}">${getStatusName(version.overallStatus)}</div>
                </div>
                <div class="summary-item">
                    <div class="label">פיצ'רים</div>
                    <div class="value">${version.features.length}</div>
                </div>
            </div>
            
            <div class="table-header">
                <div></div>
                <div>פיצ'ר</div>
                <div>סטטוס</div>
                <div>עובדים</div>
                <div>QA</div>
            </div>
            
            <div class="features-container">
                ${featuresHTML}
            </div>
            
        </body>
        </html>
    `);
    
    printWindow.document.close();
    
    // Wait for content to load, then print
    setTimeout(() => {
        printWindow.print();
    }, 500);
    
    console.log('✅ חלון PDF נפתח');
}

// Populate employee filter dropdown
function populateEmployeeFilter() {
    if (!employeeFilter) return;
    
    // Clear existing options except "all"
    employeeFilter.innerHTML = '<option value="all">כל העובדים</option>';
    
    // Add employee options
    workbookData.forEach(employee => {
        const option = document.createElement('option');
        option.value = employee.name;
        option.textContent = employee.name;
        employeeFilter.appendChild(option);
    });
}

// Apply task filters
function applyTaskFilters() {
    const selectedEmployee = employeeFilter ? employeeFilter.value : 'all';
    const searchText = taskSearch ? taskSearch.value.toLowerCase().trim() : '';
    
    const allCards = document.querySelectorAll('#employeeDetails .task-card');
    let visibleCount = 0;
    
    allCards.forEach(card => {
        const employeeName = card.querySelector('.task-employee')?.textContent || '';
        const taskTitle = card.querySelector('.task-title')?.textContent || '';
        const taskParent = card.querySelector('.task-parent')?.textContent || '';
        const taskReq = card.querySelector('.task-req')?.textContent || '';
        
        // Check employee filter
        const employeeMatch = selectedEmployee === 'all' || employeeName === selectedEmployee;
        
        // Check search filter
        const searchMatch = !searchText || 
            taskTitle.toLowerCase().includes(searchText) ||
            taskParent.toLowerCase().includes(searchText) ||
            taskReq.toLowerCase().includes(searchText) ||
            employeeName.toLowerCase().includes(searchText);
        
        // Show/hide card
        if (employeeMatch && searchMatch) {
            card.style.display = '';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Show empty message if no results
    const container = document.getElementById('employeeDetails');
    let emptyMsg = container.querySelector('.filter-empty-message');
    
    if (visibleCount === 0) {
        if (!emptyMsg) {
            emptyMsg = document.createElement('div');
            emptyMsg.className = 'empty-message filter-empty-message';
            emptyMsg.textContent = 'לא נמצאו משימות מתאימות';
            container.appendChild(emptyMsg);
        }
        emptyMsg.style.display = '';
    } else {
        if (emptyMsg) {
            emptyMsg.style.display = 'none';
        }
    }
}

// Render employee details
function renderEmployeeDetails() {
    const container = document.getElementById('employeeDetails');
    container.innerHTML = '';
    
    workbookData.forEach(employee => {
        // Check for overlaps
        const overlaps = findOverlappingDates(employee);
        const hasOverlaps = overlaps.length > 0;
        
        if (employee.tasks.length > 0) {
            employee.tasks.forEach(task => {
                const taskCard = document.createElement('div');
                taskCard.className = 'task-card';
                taskCard.dataset.employee = employee.name;
                if (hasOverlaps) {
                    taskCard.classList.add('task-card-warning');
                }
                
                taskCard.innerHTML = `
                    <div class="task-header">
                        <span class="task-employee">${employee.name}</span>
                        ${hasOverlaps ? '<span class="task-warning">⚠️ יש חפיפות</span>' : ''}
                        ${task.requirement ? `<span class="task-req">${task.requirement}</span>` : ''}
                    </div>
                    <div class="task-title">${task.subTask}</div>
                    ${task.task ? `<div class="task-parent">${task.task}</div>` : ''}
                    <div class="task-meta">
                        <span>${task.effort} ימי עבודה</span>
                        <span>${formatShortDate(task.startDate)} - ${formatShortDate(task.endDate)}</span>
                    </div>
                `;
                container.appendChild(taskCard);
            });
        } else {
            // Employee with no tasks
            const emptyCard = document.createElement('div');
            emptyCard.className = 'task-card task-card-empty';
            emptyCard.dataset.employee = employee.name;
            emptyCard.innerHTML = `
                <div class="task-header">
                    <span class="task-employee">${employee.name}</span>
                </div>
                <div class="empty-message">אין משימות מתוכננות</div>
            `;
            container.appendChild(emptyCard);
        }
    });
    
    if (container.children.length === 0) {
        container.innerHTML = '<div class="empty-message">אין עובדים</div>';
    }
    
    // Populate filter dropdown
    populateEmployeeFilter();
}

