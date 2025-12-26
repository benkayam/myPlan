// Global State
let workbookData = null;
let currentStartDate = new Date();

// DOM Elements
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const uploadBtnEmpty = document.getElementById('uploadBtnEmpty');
const dashboard = document.getElementById('dashboard');
const emptyState = document.getElementById('emptyState');
const fileInfo = document.getElementById('fileInfo');

// Event Listeners
uploadBtn.addEventListener('click', () => fileInput.click());
uploadBtnEmpty.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileUpload);
document.getElementById('prevMonth')?.addEventListener('click', () => navigateMonth(-1));
document.getElementById('nextMonth')?.addEventListener('click', () => navigateMonth(1));

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

// Handle file upload
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            workbookData = parseWorkbook(workbook);
            displayDashboard();
            
        } catch (error) {
            console.error('Error reading file:', error);
            alert('שגיאה בקריאת הקובץ');
        }
    };
    reader.readAsArrayBuffer(file);
}

// Parse workbook data
function parseWorkbook(workbook) {
    const employees = [];
    
    workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const tasks = jsonData
            .filter(row => row['תתי-משימה'] && row['תאריך התחלה'] && row['תאריך סיום'])
            .map(row => ({
                requirement: row['דרישה'] || '',
                task: row['משימה'] || '',
                subTask: row['תתי-משימה'] || '',
                duration: row['Duration'] || 0,
                effort: row['Effort'] || 0,
                startDate: excelDateToJSDate(row['תאריך התחלה']),
                endDate: excelDateToJSDate(row['תאריך סיום']),
                notes: row['הערות'] || '',
                originalBudget: row['תקצוב מקורי'] || 0,
                actualBudget: row['תקצוב בפועל'] || 0,
            }));
        
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
    emptyState.classList.add('hidden');
    dashboard.classList.remove('hidden');
    
    fileInfo.classList.remove('hidden');
    fileInfo.textContent = `נטען קובץ • ${workbookData.length} עובדים`;
    
    updateSummaryCards();
    renderWorkloadChart();
    renderTimeline();
    renderTodayTasks();
    renderEmployeeDetails();
}

// Update summary cards
function updateSummaryCards() {
    const totalEmployees = workbookData.length;
    const allTasks = workbookData.flatMap(emp => emp.tasks);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeTasks = allTasks.filter(task => 
        task.startDate <= today && task.endDate >= today
    ).length;
    
    const totalBudget = allTasks.reduce((sum, task) => sum + (task.actualBudget || 0), 0);
    
    // Calculate employees with overlapping tasks (more than 1 day work in a single day)
    const overloadedCount = workbookData.filter(emp => {
        const overlaps = findOverlappingDates(emp);
        return overlaps.length > 0;
    }).length;
    
    document.getElementById('totalEmployees').textContent = totalEmployees;
    document.getElementById('activeTasks').textContent = activeTasks;
    document.getElementById('overloadedEmployees').textContent = overloadedCount;
    document.getElementById('totalBudget').textContent = totalBudget || '-';
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
    
    // Get all unique dates from all tasks
    employee.tasks.forEach(task => {
        let current = new Date(task.startDate);
        const end = new Date(task.endDate);
        
        while (current <= end) {
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
                
                // Check for overlap (more than 1 day of work)
                if (effortForDay > 1.0) {
                    cell.classList.add('overlap-task');
                    cell.title = `⚠️ חפיפה: ${effortForDay.toFixed(1)} ימי עבודה\n` + 
                        tasksForDay.map(t => `${t.subTask}${t.task ? ' (' + t.task + ')' : ''}`).join('\n');
                    cell.textContent = effortForDay.toFixed(1);
                } else if (tasksForDay.length > 1) {
                    cell.classList.add('multiple-tasks');
                    cell.title = tasksForDay.map(t => 
                        `${t.subTask}${t.task ? ' (' + t.task + ')' : ''}`
                    ).join('\n');
                    cell.textContent = tasksForDay.length;
                } else {
                    cell.title = tasksForDay.map(t => 
                        `${t.subTask}${t.task ? ' (' + t.task + ')' : ''}`
                    ).join('\n');
                    cell.textContent = '✓';
                }
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

// Render employee details
function renderEmployeeDetails() {
    const container = document.getElementById('employeeDetails');
    container.innerHTML = '';
    
    workbookData.forEach(employee => {
        const totalEffort = employee.tasks.reduce((sum, task) => sum + (task.effort || 0), 0);
        const totalBudget = employee.tasks.reduce((sum, task) => sum + (task.actualBudget || 0), 0);
        const avgEffort = calculateAverageEffort(employee);
        const overlaps = findOverlappingDates(employee);
        
        let statusClass = 'normal';
        let statusText = 'תקין';
        
        if (overlaps.length > 0) {
            statusClass = 'overlap';
            statusText = `חפיפת משימות (${overlaps.length} ימים)`;
        } else if (avgEffort > 1.5) {
            statusClass = 'high';
            statusText = 'עומס גבוה';
        } else if (avgEffort < 0.5) {
            statusClass = 'low';
            statusText = 'עומס נמוך';
        }
        
        const card = document.createElement('div');
        card.className = 'employee-card';
        card.innerHTML = `
            <div class="employee-card-header">
                <h3>${employee.name}</h3>
                <span class="status-badge status-${statusClass}">${statusText}</span>
            </div>
            <div class="employee-stats">
                <div class="stat">
                    <span class="stat-label">משימות</span>
                    <span class="stat-value">${employee.tasks.length}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">סך ימי עבודה</span>
                    <span class="stat-value">${totalEffort.toFixed(1)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">ממוצע יומי</span>
                    <span class="stat-value">${avgEffort.toFixed(2)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">תקציב בפועל</span>
                    <span class="stat-value">${totalBudget || '-'}</span>
                </div>
            </div>
            ${overlaps.length > 0 ? `
                <div class="overlap-warning">
                    <strong>⚠️ אזהרה: חפיפת משימות בימים הבאים:</strong>
                    ${overlaps.map(overlap => {
                        // Get tasks for this specific date
                        const tasksForDate = employee.tasks.filter(task => 
                            task.startDate <= overlap.date && task.endDate >= overlap.date
                        );
                        const tasksList = tasksForDate.map(t => 
                            `• ${t.subTask}${t.task ? ' (' + t.task + ')' : ''} [${t.effort} ימים / ${countWorkDays(t.startDate, t.endDate)} ימי עבודה]`
                        ).join('&#10;');
                        
                        return `
                        <div class="overlap-date" title="${tasksList}">
                            ${formatDate(overlap.date)} - ${overlap.effort.toFixed(1)} ימי עבודה
                        </div>
                    `}).join('')}
                </div>
            ` : ''}
            <div class="employee-tasks">
                <strong>משימות:</strong>
                ${employee.tasks.map(task => `
                    <div class="mini-task">
                        • ${task.subTask} 
                        <span class="mini-task-date">(${formatShortDate(task.startDate)} - ${formatShortDate(task.endDate)})</span>
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(card);
    });
}

