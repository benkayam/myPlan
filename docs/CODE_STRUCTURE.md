# 🏗️ מבנה הקוד - Code Structure

## 📐 ארכיטקטורה כללית

המערכת בנויה בארכיטקטורת **MVC מותאמת**:

```
┌─────────────────────────────────────────┐
│           User Interface (View)         │
│              uiRenderer.js              │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         Controller (Main)               │
│              main.js                    │
└─┬──────────┬──────────┬─────────────┬──┘
  │          │          │             │
  ▼          ▼          ▼             ▼
┌────┐   ┌─────┐   ┌────────┐   ┌────────┐
│File│   │Excel│   │  Data  │   │   UI   │
│Hand│   │Parse│   │Analyze │   │Render  │
│ler │   │ r   │   │   r    │   │   r    │
└────┘   └─────┘   └────────┘   └────────┘
```

---

## 📦 מודולים - פירוט מעמיק

### 1. main.js - Main Controller

**תפקיד**: תיאום ובקרה כללית של האפליקציה

#### Class: MyPlanApp
```javascript
class MyPlanApp {
  constructor()           // אתחול כל המודולים
  init()                  // הפעלת המערכת
  setupEventListeners()   // הגדרת מאזינים
  handleFile(file)        // טיפול בקובץ שהועלה
}
```

#### זרימת עבודה:
```
1. User uploads file
   ↓
2. handleFile() called
   ↓
3. Show progress (10%)
   ↓
4. fileHandler.readExcelFile()
   ↓
5. Update progress (30%)
   ↓
6. excelParser.parse()
   ↓
7. Update progress (60%)
   ↓
8. dataAnalyzer.analyze()
   ↓
9. Update progress (90%)
   ↓
10. uiRenderer.renderDashboard()
    ↓
11. Complete (100%)
```

---

### 2. fileHandler.js - File Handler

**תפקיד**: טיפול בקבצים - ולידציה, קריאה, המרה

#### Class: FileHandler
```javascript
class FileHandler {
  // Properties
  allowedExtensions = ['.xlsx', '.xls']
  maxFileSize = 10MB
  
  // Methods
  validateFile(file)         // בדיקת תקינות
  readExcelFile(file)        // קריאת קובץ
  getFileMetadata(file)      // מידע על קובץ
  formatFileSize(bytes)      // פורמט גודל
}
```

#### תהליך קריאת קובץ:
```javascript
readExcelFile(file) {
  1. Validate file
  2. Create FileReader
  3. Read as ArrayBuffer
  4. Convert to Uint8Array
  5. XLSX.read(data)
  6. Return workbook object
}
```

#### Workbook Object Structure:
```javascript
{
  SheetNames: ["Sheet1", "Sheet2"],
  Sheets: {
    "Sheet1": { /* sheet data */ },
    "Sheet2": { /* sheet data */ }
  },
  Props: { /* metadata */ }
}
```

---

### 3. excelParser.js - Excel Parser

**תפקיד**: ניתוח מבנה Excel וחילוץ נתונים

#### Class: ExcelParser
```javascript
class ExcelParser {
  // Main Methods
  parse(workbook)                    // ניתוח כל הקובץ
  parseSheet(sheet, sheetName)       // ניתוח גיליון בודד
  
  // Analysis Methods
  analyzeSheetStructure(rows)        // ניתוח מבנה
  detectColumnType(rows, colIndex)   // זיהוי סוג עמודה
  
  // Extraction Methods
  extractFeatureInfo(row, rowIndex)  // חילוץ מידע פיצ'ר
  determineStatus(row)               // קביעת סטטוס
  
  // Utility Methods
  isDate(value)                      // בדיקת תאריך
  formatDate(date)                   // פורמט תאריך
  getMetadata()                      // מטא-דאטה
}
```

#### תהליך Parse:
```javascript
parse(workbook) {
  for each sheet in workbook {
    1. Convert sheet to JSON (2D array)
    2. Analyze structure
    3. Extract features from rows
    4. Identify projects, versions, dates
    5. Determine status
    6. Collect metadata
  }
  return parsedData
}
```

#### Regex Patterns:
```javascript
// Project: DEV-12345
/[A-Z]+-\d+/

// Version: 1.5
/\d+\.\d+/

// Date: 01-12-2024
/\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/
```

#### Feature Object Structure:
```javascript
{
  rowIndex: 5,
  featureName: "DEV-123 פיצ'ר חדש",
  project: "DEV-123",
  version: "1.5",
  startDate: "01-12-2024",
  endDate: "15-12-2024",
  duration: null,
  status: "green",
  dates: [
    { column: 3, value: Date, formatted: "01-12-2024" },
    { column: 4, value: Date, formatted: "15-12-2024" }
  ],
  rawData: [...],
  metadata: {}
}
```

---

### 4. dataAnalyzer.js - Data Analyzer

**תפקיד**: ניתוח נתונים, חישוב סטטיסטיקות, זיהוי תובנות

#### Class: DataAnalyzer
```javascript
class DataAnalyzer {
  // Properties
  workDays = [0, 1, 2, 3, 4]  // א'-ה'
  
  // Main Analysis
  analyze(parsedData)              // ניתוח כללי
  
  // Summary & Statistics
  generateSummary(parsedData)      // סיכום כללי
  analyzeEmployees(employees)      // ניתוח עובדים
  analyzeProjects(parsedData)      // ניתוח פרויקטים
  analyzeVersions(parsedData)      // ניתוח גרסאות
  
  // Timeline & Status
  generateTimeline(parsedData)     // יצירת timeline
  analyzeStatuses(parsedData)      // פילוח סטטוסים
  
  // Advanced Analysis
  detectOverlaps(parsedData)       // זיהוי חפיפות
  analyzeWorkload(parsedData)      // ניתוח עומסים
  
  // Utilities
  calculateWorkload(features)      // חישוב עומס
  countStatuses(features)          // ספירת סטטוסים
  calculateOverallStatus(counts)   // סטטוס כולל
  isWorkDay(date)                  // בדיקת יום עבודה
}
```

#### Analysis Object Structure:
```javascript
{
  summary: {
    totalEmployees: 3,
    totalProjects: 5,
    totalVersions: 2,
    totalFeatures: 45,
    averageFeaturesPerEmployee: 15
  },
  
  employees: [
    {
      name: "יוסי כהן",
      featureCount: 15,
      projectCount: 3,
      versionCount: 2,
      statusCounts: { green: 5, yellow: 3, red: 2, gray: 5 },
      workload: 15,
      projects: ["DEV-123", "DEV-124"],
      versions: ["1.5", "2.0"],
      features: [...]
    }
  ],
  
  projects: [
    {
      name: "DEV-123",
      features: [...],
      employees: ["יוסי", "שרה"],
      employeeCount: 2,
      featureCount: 10,
      statusCounts: {...},
      overallStatus: "yellow"
    }
  ],
  
  versions: [
    {
      name: "1.5",
      features: [...],
      employees: [...],
      projects: [...],
      employeeCount: 3,
      projectCount: 2,
      featureCount: 20,
      statusCounts: {...},
      overallStatus: "green"
    }
  ],
  
  timeline: [
    {
      date: "15-12-2024",
      features: [...],
      employees: [...],
      projects: [...],
      statusCounts: {...},
      overallStatus: "yellow"
    }
  ],
  
  statusBreakdown: {
    green: 20,
    yellow: 10,
    red: 5,
    gray: 10
  },
  
  overlaps: [
    {
      employee: "יוסי כהן",
      date: "15-12-2024",
      featureCount: 3,
      features: ["פיצ'ר 1", "פיצ'ר 2", "פיצ'ר 3"],
      severity: "high"
    }
  ],
  
  workload: {
    byEmployee: [...],
    total: 45,
    average: 15,
    max: 20,
    min: 10
  }
}
```

#### Status Priority Logic:
```javascript
calculateOverallStatus(statusCounts) {
  if (red > 0) return 'red';      // הכי גבוה
  if (yellow > 0) return 'yellow';
  if (gray > 0) return 'gray';
  return 'green';                  // הכי נמוך
}
```

---

### 5. uiRenderer.js - UI Renderer

**תפקיד**: רינדור ממשק משתמש ועדכון תצוגה

#### Class: UIRenderer
```javascript
class UIRenderer {
  // Properties
  elements = {
    fileInfo, progressSection, dashboardSection,
    totalEmployees, totalProjects, statusGreen, ...
  }
  
  // File & Progress
  showFileInfo(file)
  showProgress(message, percent)
  updateProgress(message, percent)
  hideProgress()
  
  // Main Render
  renderDashboard(analysis, parsedData)
  
  // Component Renders
  renderSummaryCards(analysis)
  renderFileStructure(parsedData)
  renderDeliveryTimeline(timeline)
  renderFeaturesSummary(versions)
  renderEmployeeDetails(employees)
  renderRawData(parsedData, analysis)
  
  // Utilities
  getStatusEmoji(status)
  getStatusLabel(status)
  formatFileSize(bytes)
}
```

#### Render Pipeline:
```javascript
renderDashboard(analysis, parsedData) {
  1. renderSummaryCards()      // כרטיסי סיכום
     ↓
  2. renderFileStructure()     // מבנה הקובץ
     ↓
  3. renderDeliveryTimeline()  // לוח מסירות
     ↓
  4. renderFeaturesSummary()   // סיכום גרסאות
     ↓
  5. renderEmployeeDetails()   // פירוט עובדים
     ↓
  6. renderRawData()           // נתונים גולמיים
     ↓
  7. Show dashboard section
}
```

#### HTML Generation Pattern:
```javascript
renderComponent(data) {
  let html = '';
  
  data.forEach(item => {
    html += `
      <div class="component">
        <h3>${item.title}</h3>
        <p>${item.content}</p>
      </div>
    `;
  });
  
  element.innerHTML = html;
}
```

---

## 🔄 Data Flow

### מעקב אחרי נתונים דרך המערכת:

```
Excel File (Binary)
    ↓
[FileHandler]
    ↓
Workbook Object (SheetJS)
    ↓
[ExcelParser]
    ↓
ParsedData {
  employees: [...],
  sheets: [...],
  metadata: {...}
}
    ↓
[DataAnalyzer]
    ↓
Analysis {
  summary: {...},
  employees: [...],
  projects: [...],
  versions: [...],
  timeline: [...],
  statusBreakdown: {...},
  overlaps: [...],
  workload: {...}
}
    ↓
[UIRenderer]
    ↓
DOM (HTML Elements)
```

---

## 🎨 CSS Architecture

### מבנה ה-CSS:

```css
/* 1. Variables */
:root {
  --primary-color: #2563eb;
  --success-color: #10b981;
  /* ... */
}

/* 2. Reset & Base */
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: ...; }

/* 3. Layout */
.container { max-width: 1400px; margin: 0 auto; }

/* 4. Components */
.card { ... }
.timeline-item { ... }
.employee-card { ... }

/* 5. Utilities */
.hidden { display: none !important; }

/* 6. Responsive */
@media (max-width: 768px) { ... }
```

### BEM-like Naming:
```css
.component { }
.component-element { }
.component--modifier { }
```

---

## 🔌 Event Flow

### מעקב אחרי אירועים:

```
User Action
    ↓
Event Listener (main.js)
    ↓
Event Handler
    ↓
Call Module Method
    ↓
Update State/Data
    ↓
Call Renderer
    ↓
Update UI
```

### דוגמה - העלאת קובץ:

```javascript
// 1. User clicks upload button
uploadBtn.click()
    ↓
// 2. Event listener
uploadBtn.addEventListener('click', () => {
  fileInput.click();
})
    ↓
// 3. File selected
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  handleFile(file);
})
    ↓
// 4. Handle file
async handleFile(file) {
  showProgress();
  const workbook = await fileHandler.readExcelFile(file);
  const parsed = excelParser.parse(workbook);
  const analysis = dataAnalyzer.analyze(parsed);
  uiRenderer.renderDashboard(analysis, parsed);
  hideProgress();
}
```

---

## 🧩 Dependencies

### External:
- **SheetJS (xlsx)** - קריאת Excel
  - CDN: `https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js`
  - Global: `XLSX`

### Internal:
```
main.js
  ├─→ fileHandler.js
  ├─→ excelParser.js
  ├─→ dataAnalyzer.js
  └─→ uiRenderer.js

fileHandler.js
  └─→ XLSX (external)

excelParser.js
  └─→ XLSX (external)

dataAnalyzer.js
  └─→ (no dependencies)

uiRenderer.js
  └─→ (no dependencies)
```

---

## 🔍 Error Handling

### Strategy:
```javascript
try {
  // Risky operation
} catch (error) {
  console.error('❌ Error:', error);
  alert('שגיאה: ' + error.message);
  // Cleanup
}
```

### Error Propagation:
```
Low Level (fileHandler)
    ↓ throw error
Mid Level (main.handleFile)
    ↓ catch & log
High Level (UI)
    ↓ show to user
```

---

## 🧪 Testing Strategy (Future)

### Unit Tests:
```javascript
// fileHandler.test.js
test('validates file extension', () => {
  const handler = new FileHandler();
  expect(handler.validateFile(xlsxFile)).toBe(true);
  expect(handler.validateFile(txtFile)).toBe(false);
});
```

### Integration Tests:
```javascript
// parser.test.js
test('parses workbook correctly', () => {
  const parsed = excelParser.parse(mockWorkbook);
  expect(parsed.employees).toHaveLength(3);
  expect(parsed.employees[0].features).toBeDefined();
});
```

---

## 📊 Performance Considerations

### Current:
- ✅ Synchronous parsing (simple)
- ⚠️ Large files may block UI
- ⚠️ All in memory

### Future Optimizations:
- [ ] Web Workers for parsing
- [ ] Streaming for large files
- [ ] Virtual scrolling for long lists
- [ ] Lazy loading of components
- [ ] Memoization of calculations

---

## 🔐 Security Considerations

### Current:
- ✅ Client-side only (no server)
- ✅ No data sent anywhere
- ⚠️ Some innerHTML usage
- ⚠️ No input sanitization

### Improvements Needed:
- [ ] Sanitize all user input
- [ ] Use textContent instead of innerHTML
- [ ] Add Content Security Policy
- [ ] Validate all data types

---

## 📝 Code Style

### Conventions:
- **camelCase** for variables and functions
- **PascalCase** for classes
- **UPPER_CASE** for constants
- **Hebrew** for user-facing strings
- **English** for code and comments

### Comments:
```javascript
/**
 * Function description
 * @param {Type} param - Description
 * @returns {Type} - Description
 */
```

---

**עדכון אחרון**: דצמבר 2025

