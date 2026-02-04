// Global State
// Global State
let workbookData = null;
let versionsData = null; // New: versions with features and statuses
let currentStartDate = new Date();
let currentFileName = null;
let debugLogs = []; // Store debug info for user troubleshooting

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
// Excel date conversion (Excel stores dates as numbers starting from 1900-01-01)
function excelDateToJSDate(excelDate) {
    if (!excelDate || typeof excelDate !== 'number') return null;

    // Excel base date is Dec 30, 1899
    // Use UTC to avoid DST shifts/timezone issues when adding days
    const date = new Date(Date.UTC(1899, 11, 30));
    date.setUTCDate(date.getUTCDate() + Math.floor(excelDate));

    // Return as local date object (e.g., if Excel was "Jan 1", return Jan 1 00:00 local time)
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
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

// Convert Jira tickets to clickable links
function linkifyJiraTickets(text) {
    if (!text) return text;
    // Match patterns like DEV-12345, RQ-12345, etc.
    const jiraPattern = /([A-Z]+-\d+)/g;
    return text.replace(jiraPattern, '<a href="https://fibijira.fibi.corp/browse/$1" target="_blank" class="jira-link">$1</a>');
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
    reader.onload = function (e) {
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
        let currentRequirement = null;

        for (let row = 1; row <= range.e.r; row++) {
            const cellA = worksheet[XLSX.utils.encode_cell({ r: row, c: 0 })]; // Requirement
            const cellB = worksheet[XLSX.utils.encode_cell({ r: row, c: 1 })]; // Task
            const cellC = worksheet[XLSX.utils.encode_cell({ r: row, c: 2 })]; // Sub-task
            const cellD = worksheet[XLSX.utils.encode_cell({ r: row, c: 3 })]; // Duration / QA Date

            // 1. Identify Version/Requirement
            if (cellA && cellA.v && (!cellC || !cellC.v)) {
                const text = cellA.v;
                const status = getStatusFromColor(cellA.s);

                // Skip header
                if (text === 'דרישה') continue;

                // Check if it's a version (usually contains "גרסה" or last row)
                if (text.includes('גרסה') || text.includes('גולדן') || text.includes('version')) {
                    versionName = text;
                    versionStatus = status;
                } else {
                    // It's a requirement line
                    currentRequirement = text;
                }
            }

            // 2. Identify Task (Column B) and capture transfer to QA
            // We need to associate tasks with requirements.
            // If we have a requirement, and a task in B, and C is "Transfer to QA", capture it.

            const subTaskText = cellC ? (cellC.v || '').toString().toLowerCase().trim() : '';
            // Flexible match: includes "qa" and (start with "haavra" or just contains "to/le")
            // Assuming standard "העברה לqa" or similar.
            const isQATransfer = subTaskText.includes('qa') && (subTaskText.includes('העברה') || subTaskText.includes('transfer'));

            if (isQATransfer) {
                // QA date is in a merged field spanning D-G
                // Check if it's explicitly marked as DEMO
                const isDemo = subTaskText.includes('demo');

                // Scan columns D (3), E (4), F (5), G (6) for a value
                let qaDate = null;
                const cols = [3, 4, 5, 6];

                for (const c of cols) {
                    const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: c })];
                    if (cell && cell.v) {
                        qaDate = excelDateToJSDate(cell.v);
                        if (qaDate) break; // Found it
                    }
                }

                const taskName = cellB && cellB.v ? cellB.v : (currentFeature ? currentFeature.task : 'General');

                // Debug log
                if (!qaDate) {
                    debugLogs.push(`  [Row ${row + 1}] Found QA row but NO date in D-G. Task: ${taskName}`);
                }

                // Find if we already have this feature/task recorded
                // If currentRequirement is set, use it.
                if (currentRequirement) {
                    const existingFeature = features.find(f => f.name === currentRequirement && f.task === taskName);

                    if (existingFeature) {
                        existingFeature.qaDate = qaDate;
                        if (isDemo) existingFeature.isDemo = true;
                        // If we found a more specific date, update status if needed
                    } else {
                        features.push({
                            name: currentRequirement,
                            task: taskName,
                            status: getStatusFromColor(cellA ? cellA.s : null), // Fallback status
                            employee: sheetName,
                            qaDate: qaDate,
                            isDemo: isDemo
                        });
                    }
                }
            }
            // Normal task row - captures Task name if we haven't seen this requirement yet
            else if (currentRequirement && cellB && cellB.v && cellC && cellC.v) {
                // It's a regular task row. We might want to just ensure the feature exists in our list
                // so it shows up even if no QA date is set yet.
                const taskName = cellB.v;
                const existingFeature = features.find(f => f.name === currentRequirement && f.task === taskName);

                if (!existingFeature) {
                    // Add entry without QA date yet
                    features.push({
                        name: currentRequirement,
                        task: taskName,
                        status: getStatusFromColor(cellA ? cellA.s : null),
                        employee: sheetName,
                        qaDate: null
                    });
                } else {
                    // Update employee list if needed
                    if (!existingFeature.employees) existingFeature.employees = [existingFeature.employee];
                    if (!existingFeature.employees.includes(sheetName)) existingFeature.employees.push(sheetName);
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
                // Check if this specific feature+task combo exists in the version
                const existingFeature = version.features.find(f => f.name === feature.name && f.task === feature.task);

                if (existingFeature) {
                    // Update employees
                    existingFeature.employees = existingFeature.employees || [existingFeature.employee];
                    if (!existingFeature.employees.includes(feature.employee)) {
                        existingFeature.employees.push(feature.employee);
                    }
                    // Update QA date if we found one and didn't have one before
                    if (feature.qaDate && !existingFeature.qaDate) {
                        existingFeature.qaDate = feature.qaDate;
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

        // Sort features: first by QA date (desc), then by name
        version.features.sort((a, b) => {
            if (a.qaDate && !b.qaDate) return -1;
            if (!a.qaDate && b.qaDate) return 1;
            if (a.qaDate && b.qaDate) return a.qaDate - b.qaDate;
            return a.name.localeCompare(b.name);
        });

        return version;
    });
}

// Parse workbook data
function parseWorkbook(workbook) {
    const employees = [];
    debugLogs = []; // Reset logs

    debugLogs.push(`Timestamp: ${new Date().toLocaleString()}`);
    debugLogs.push(`Sheets found: ${workbook.SheetNames.join(', ')}`);

    workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const tasks = [];
        let rowCount = 0;
        let skippedCount = 0;

        // Get the range of the worksheet
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        debugLogs.push(`Processing Sheet: "${sheetName}" (Rows: ${range.e.r})`);

        // Track current feature and requirement
        let currentRequirement = '';
        let currentTask = '';

        // Start from row 2 (skip header row 1)
        for (let row = 1; row <= range.e.r; row++) {
            rowCount++;
            // Get cell references
            const cellA = worksheet[XLSX.utils.encode_cell({ r: row, c: 0 })]; // דרישה
            const cellB = worksheet[XLSX.utils.encode_cell({ r: row, c: 1 })]; // משימה
            const cellC = worksheet[XLSX.utils.encode_cell({ r: row, c: 2 })]; // תתי-משימה
            const cellD = worksheet[XLSX.utils.encode_cell({ r: row, c: 3 })]; // Duration
            const cellE = worksheet[XLSX.utils.encode_cell({ r: row, c: 4 })]; // Effort
            const cellF = worksheet[XLSX.utils.encode_cell({ r: row, c: 5 })]; // תאריך התחלה
            const cellG = worksheet[XLSX.utils.encode_cell({ r: row, c: 6 })]; // תאריך סיום
            const cellH = worksheet[XLSX.utils.encode_cell({ r: row, c: 7 })]; // הערות

            // Skip feature title rows (only A has value, and C doesn't start with a task)
            const subTaskValue = cellC ? (cellC.v || '').toString().toLowerCase() : '';
            if (subTaskValue.includes('qa') && (subTaskValue.includes('העברה') || subTaskValue.includes('transfer'))) {
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

            // Validation: Start Date, End Date, Sub-task are REQUIRED
            const missingFields = [];
            if (!cellC || !cellC.v) missingFields.push('תתי-משימה');
            if (!cellF || !cellF.v) missingFields.push('תאריך התחלה');
            if (!cellG || !cellG.v) missingFields.push('תאריך סיום');

            if (missingFields.length === 0) {
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
                            originalLine: row + 1
                        });
                    } else {
                        const reason = `Dates out of range (2020-2030): ${startDate ? startDate.toLocaleDateString() : 'Invalid'} - ${endDate ? endDate.toLocaleDateString() : 'Invalid'}`;
                        debugLogs.push(`  [Row ${row + 1}] SKIPPED: ${reason}. Data: ${cellC.v}`);
                        skippedCount++;
                    }
                } else {
                    const reason = `Invalid dates or End before Start. Start: ${cellF.v}, End: ${cellG.v}`;
                    debugLogs.push(`  [Row ${row + 1}] SKIPPED: ${reason}. Data: ${cellC.v}`);
                    skippedCount++;
                }
            } else {
                // Ignore empty rows completely, but log if it looks like partial data
                if (cellC || cellF || cellG) {
                    debugLogs.push(`  [Row ${row + 1}] SKIPPED: Missing ${missingFields.join(', ')}. Data: ${cellC ? cellC.v : ''}`);
                    skippedCount++;
                }
            }
        }

        debugLogs.push(`  -> Result: ${tasks.length} tasks imported, ${skippedCount} items skipped.`);

        if (tasks.length > 0) {
            employees.push({
                name: sheetName,
                tasks: tasks
            });
        } else {
            debugLogs.push(`  (!) No valid tasks found for sheet "${sheetName}"`);
        }
    });

    console.log("Debug Logs:", debugLogs);
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
            <button class="btn-debug-data" onclick="showDebugInfo()" title="הצג מידע דיבאג" style="margin-right: 10px; background: #6c757d; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">🐞 דיבאג</button>
        `;

        console.log('  → מציג מצב גרסה...');
        renderVersionStatus();

        console.log('  → מציג גרף עומס...');
        renderWorkloadChart();

        console.log('  → מציג ציר זמן...');
        renderTimeline();

        console.log('  → מציג משימות היום...');


        console.log('  → מציג פרטי עובדים...');
        renderEmployeeDetails();

        console.log('  ✅ displayDashboard הושלם');
    } catch (error) {
        console.error('❌ שגיאה ב-displayDashboard:', error);
        console.error(error.stack);
        throw error;
    }
}

// Helper to check if two dates are the same day (ignoring time)
function isSameDate(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
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

// Find dates with overlapping tasks (Effort > 1.0) OR Multiple tasks (Count > 1)
function findOverlappingDates(employee) {
    const overlaps = [];
    const dateMap = new Map();

    // Safety check
    if (!employee.tasks || employee.tasks.length === 0) {
        return [];
    }

    // 1. Find min/max dates
    let minDate = null;
    let maxDate = null;

    employee.tasks.forEach(task => {
        if (!task.startDate || !task.endDate) return;
        if (!minDate || task.startDate < minDate) minDate = task.startDate;
        if (!maxDate || task.endDate > maxDate) maxDate = task.endDate;
    });

    if (!minDate || !maxDate) return [];

    // 2. Iterate each work day in range
    let current = new Date(minDate);
    const end = new Date(maxDate);

    // Safety max iterations (e.g., 5 years)
    let iterations = 0;
    const MAX_ITERATIONS = 365 * 5;

    while (current <= end && iterations < MAX_ITERATIONS) {
        if (isWorkDay(current)) {
            // Get all tasks for this day
            const tasksForDay = employee.tasks.filter(task =>
                task.startDate <= current && task.endDate >= current
            );

            if (tasksForDay.length > 0) {
                // Handover Logic: If some tasks start today AND some tasks end today (and are multi-day),
                // ignore the ending tasks for effort calculation to prevent false overlap.
                const starters = tasksForDay.filter(t => isSameDate(t.startDate, current));
                const enders = tasksForDay.filter(t => isSameDate(t.endDate, current) && !isSameDate(t.startDate, current));

                let activeTasks = tasksForDay;

                // If we have tasks ending today, and there are other tasks remaining (length > enders.length),
                // exclude the enders from the critical check.
                if (enders.length > 0 && tasksForDay.length > enders.length) {
                    activeTasks = tasksForDay.filter(t => !enders.includes(t));
                }

                // Calculate total effort
                const totalEffort = activeTasks.reduce((sum, task) => {
                    const workDays = countWorkDays(task.startDate, task.endDate);
                    const effortPerDay = workDays > 0 ? (task.effort || 0) / workDays : 0;
                    return sum + effortPerDay;
                }, 0);

                // Check for ISSUES: Overbooking (> 1.0) OR Concurrency (> 1 task)
                // We treat "Overbooking" as higher severity
                if (totalEffort > 1.001 || activeTasks.length > 1) {
                    // DEBUG LOGGING for Critical Overlaps
                    if (totalEffort > 1.001) {
                        // Create a concise string representation
                        const taskDetails = activeTasks.map(t =>
                            `[${t.subTask} | ${formatShortDate(t.startDate)}-${formatShortDate(t.endDate)} | Effort: ${t.effort} | Daily: ${((t.effort || 0) / countWorkDays(t.startDate, t.endDate)).toFixed(2)}]`
                        ).join(', ');

                        console.warn(`⚠️ Critical Overlap for ${employee.name} on ${current.toDateString()}: Total ${totalEffort.toFixed(2)} (${activeTasks.length} tasks) -> ${taskDetails}`);
                    }

                    dateMap.set(current.toDateString(), {
                        date: new Date(current),
                        effort: totalEffort,
                        count: activeTasks.length, // Use activeTasks count
                        type: totalEffort > 1.001 ? 'overbooked' : 'concurrent'
                    });
                }
            }
        }
        current.setDate(current.getDate() + 1);
        iterations++;
    }

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
            // Check severity
            const overbookedCount = overlaps.filter(o => o.type === 'overbooked').length;

            if (overbookedCount > 0) {
                status = 'overlap'; // Red
                statusText = `⚠️ עומס יתר (${overbookedCount} ימים)`;
            } else {
                status = 'warning'; // Orange/Yellow
                statusText = `ℹ️ חפיפת משימות (${overlaps.length} ימים)`;
            }
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
                // Handover Logic for Timeline:
                const starters = tasksForDay.filter(t => t.startDate.getTime() === day.getTime());
                const enders = tasksForDay.filter(t => t.endDate.getTime() === day.getTime() && t.startDate.getTime() !== day.getTime());

                let activeTasks = tasksForDay;
                if (starters.length > 0 && enders.length > 0) {
                    activeTasks = tasksForDay.filter(t => !enders.includes(t));
                }

                // Recalculate effort based on active tasks
                const totalEffort = activeTasks.reduce((sum, task) => {
                    const workDays = countWorkDays(task.startDate, task.endDate);
                    const effortPerDay = workDays > 0 ? (task.effort || 0) / workDays : 0;
                    return sum + effortPerDay;
                }, 0);

                cell.classList.add('has-task');

                // Determine cell content
                if (totalEffort > 1.001) {
                    cell.classList.add('overlap-task');
                    cell.textContent = totalEffort.toFixed(1);
                } else if (activeTasks.length > 1) {
                    cell.classList.add('multiple-tasks');
                    cell.textContent = activeTasks.length;
                } else {
                    cell.textContent = '✓';
                }

                // Add hover events for global tooltip
                cell.addEventListener('mouseenter', () => {
                    // Build tooltip content with full hierarchy
                    let tooltipHTML = '';

                    if (totalEffort > 1.001) {
                        tooltipHTML += `<div class="tooltip-warning">⚠️ חפיפה: ${totalEffort.toFixed(1)} ימי עבודה</div>`;
                    }

                    tooltipHTML += '<div class="tooltip-tasks">';
                    // Show ALL tasks in tooltip (even ending ones) so user understands context
                    tasksForDay.forEach(t => {
                        const isEnding = enders.includes(t) && starters.length > 0;
                        const req = t.requirement || 'ללא דרישה';
                        const task = t.task || 'ללא משימה';
                        const subTask = t.subTask || 'ללא תת-משימה';

                        const style = isEnding ? 'opacity: 0.6; text-decoration: line-through;' : '';
                        const suffix = isEnding ? ' (מסתיים היום)' : '';

                        tooltipHTML += `<div class="tooltip-task-item" style="${style}">${req} → ${task} → ${subTask}${suffix}</div>`;
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



// Render version status - UPDATED UI
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
        versionCard.style.cssText = `
            background: white;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 24px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        `;

        versionCard.innerHTML = `
            <div class="version-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <h3 data-status="${statusClass}" style="margin: 0; font-size: 1.5rem; display: flex; align-items: center; gap: 8px;">
                        ${statusIcon} ${version.name}
                    </h3>
                </div>
                <div class="version-meta">
                     <button class="btn-export-pdf" onclick="exportVersionToPDF('${version.name}')" style="background: #f5f5f7; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 500; cursor: pointer;">
                        📄 ייצא ל-PDF
                    </button>
                </div>
            </div>
            
            <div class="high-level-tasks" style="display: flex; flex-direction: column; gap: 12px;">
                <!-- Table Header -->
                 <div style="display: grid; grid-template-columns: 3fr 1.5fr 1fr; padding: 0 10px; color: #86868b; font-size: 0.9rem; font-weight: 500;">
                    <div>דרישה</div>
                    <div>תאריך QA</div>
                    <div>אחריות</div>
                </div>
                <!-- Dynamic Content Will Be Added Here -->
            </div>
        `;

        const tasksContainer = versionCard.querySelector('.high-level-tasks');

        // Filter: Only show items with QA Date
        const visibleFeatures = version.features.filter(f => f.qaDate);

        if (visibleFeatures.length === 0) {
            tasksContainer.innerHTML += `<div style="padding: 20px; text-align: center; color: #86868b;">אין פריטים עם תאריך QA בגרסה זו</div>`;
        } else {
            visibleFeatures.forEach(feature => {
                const employees = feature.employees || [feature.employee];

                // Format QA date
                let qaDateStr = '-';

                if (feature.qaDate) {
                    const d = new Date(feature.qaDate);
                    qaDateStr = `📅 ${formatShortDate(d)}`;

                    // Add DEMO tag if detected in text
                    if (feature.isDemo) {
                        qaDateStr += ' <span style="background: #e1f5fe; color: #0277bd; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; margin-right: 5px; font-weight: bold;">DEMO</span>';
                    }
                }

                const itemRow = document.createElement('div');
                itemRow.style.cssText = `
                    display: grid; 
                    grid-template-columns: 3fr 1.5fr 1fr; 
                    padding: 12px 10px; 
                    background: #fbfbfd; 
                    border-radius: 8px; 
                    align-items: center;
                    border-left: 3px solid ${getStatusColorCode(feature.status)};
                `;

                itemRow.innerHTML = `
                    <div style="font-weight: 600; color: #1d1d1f;">${feature.name}</div>
                    <div style="color: #1d1d1f; font-family: monospace;">${qaDateStr}</div>
                    <div style="font-size: 0.9em; color: #86868b;">${employees.join(', ')}</div>
                `;

                tasksContainer.appendChild(itemRow);
            });
        }

        container.appendChild(versionCard);
    });
}

// Helper to get color code
function getStatusColorCode(status) {
    const colors = {
        'delivered': '#34c759', // Green
        'ontrack': '#8e8e93',   // Gray
        'warning': '#ff9500',   // Orange
        'delayed': '#ff3b30',   // Red
        'unknown': '#d1d1d6'    // Light Gray
    };
    return colors[status] || colors['unknown'];
}

// Make functions global for onclick handlers
window.clearLocalStorage = clearLocalStorage;
window.showDebugInfo = showDebugInfo;

// Show debug info
function showDebugInfo() {
    if (!debugLogs || debugLogs.length === 0) {
        alert('אין מידע דיבאג זמין. אנא טען קובץ מחדש.');
        return;
    }

    const logContent = debugLogs.join('\n');

    // Create a simple modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        direction: ltr;
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 80%; max-height: 80%; display: flex; flex-direction: column;">
            <h3 style="margin-top: 0;">Debug Information</h3>
            <textarea readonly style="flex: 1; width: 100%; height: 300px; font-family: monospace; white-space: pre; margin-bottom: 10px;">${logContent}</textarea>
            <div style="text-align: right;">
                <button onclick="this.parentElement.parentElement.parentElement.remove()" style="padding: 8px 16px; background: #007aff; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Export Version Status to PDF (Global function for onclick)
window.exportVersionToPDF = function (versionName) {
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
                <div class="feature-name">${linkifyJiraTickets(feature.name)}</div>
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
                    grid-template-columns: 30px 4fr 1.5fr 1fr;
                    gap: 8px;
                    padding: 10px;
                    background: #2A4066;
                    color: white;
                    font-weight: 600;
                    border-radius: 6px 6px 0 0;
                }
                
                .feature-row {
                    display: grid;
                    grid-template-columns: 30px 4fr 1.5fr 1fr;
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
                    grid-template-columns: 30px 4fr 1.5fr 1fr;
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
            </div>
            
            <div class="table-header">
                <div></div>
                <div>פיצ'ר</div>
                <div>QA</div>
                <div>מי על זה</div>
            </div>
            
            <div class="features-container">
            ${(() => {
            let html = '';
            const visibleFeatures = version.features.filter(f => f.qaDate);
            visibleFeatures.forEach(feature => {
                const featureIcon = {
                    'delivered': '✅',
                    'ontrack': '⚪',
                    'warning': '⚠️',
                    'delayed': '🔴',
                    'unknown': '❓'
                }[feature.status] || '❓';

                const employees = feature.employees || [feature.employee];
                let qaDisplay = formatShortDate(feature.qaDate);
                if (feature.isDemo) qaDisplay += ' (DEMO)';

                html += `
                        <div class="feature-row">
                            <div class="feature-icon">${featureIcon}</div>
                            <div class="feature-name">${linkifyJiraTickets(feature.name)}</div>
                            <div class="feature-qa">${qaDisplay}</div>
                            <div class="feature-employees">${employees.join(', ')}</div>
                        </div>
                    `;
            });
            return html;
        })()}
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
        // Check for overlaps AND identify specific dates
        const overlaps = findOverlappingDates(employee);
        const overbookedDates = overlaps.filter(o => o.type === 'overbooked').map(o => o.date.getTime());
        const hasCriticalOverlaps = overbookedDates.length > 0;

        if (employee.tasks.length > 0) {
            employee.tasks.forEach(task => {
                // Check if THIS task intersects with any overbooked date
                let isTaskInvolvedInOverlap = false;
                if (hasCriticalOverlaps && task.startDate && task.endDate) {
                    const start = task.startDate.getTime();
                    const end = task.endDate.getTime();
                    // Check if any overbooked date falls within this task's range
                    isTaskInvolvedInOverlap = overbookedDates.some(d => d >= start && d <= end);
                }

                const taskCard = document.createElement('div');
                taskCard.className = 'task-card';
                taskCard.dataset.employee = employee.name;

                // Only style if THIS task is involved
                if (isTaskInvolvedInOverlap) {
                    taskCard.classList.add('task-card-warning');
                }

                taskCard.innerHTML = `
                    <div class="task-header">
                        <span class="task-employee">${employee.name}</span>
                        ${isTaskInvolvedInOverlap ? '<span class="task-warning">⚠️ יש חפיפות</span>' : ''}
                        ${task.requirement ? `<span class="task-req">${linkifyJiraTickets(task.requirement)}</span>` : ''}
                    </div>
                    <div class="task-title">${linkifyJiraTickets(task.subTask)}</div>
                    ${task.task ? `<div class="task-parent">${linkifyJiraTickets(task.task)}</div>` : ''}
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

