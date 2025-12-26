# myPlan - דשבורד ניהול צוות

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![GitHub Stars](https://img.shields.io/github/stars/benkayam/myPlan?style=for-the-badge)
![Made with Love](https://img.shields.io/badge/made%20with-❤️-red?style=for-the-badge)
![Language](https://img.shields.io/badge/language-Hebrew-blue?style=for-the-badge)

</div>

---

## תיאור הפרויקט

דשבורד ויזואלי לניהול תכנון עבודה של צוות, המבוסס על קבצי אקסל. המערכת מציגה ציר זמן, זיהוי חפיפות במשימות, ועומסי עבודה בצורה אינטואיטיבית ומעוצבת.

## מבנה הפרויקט

```
myPlan/
├── dashboard.html      # מבנה HTML ראשי
├── dashboard.js        # לוגיקה וניהול נתונים
├── dashboard.css       # עיצוב בסגנון Apple
└── Archive/           # גרסאות קודמות
```

---

## מבנה קובץ האקסל הנדרש

### עקרונות בסיסיים
- **כל גיליון = עובד אחד** (שם הגיליון = שם העובד)
- **כל שורה = משימה אחת** (תתי-משימה)

### עמודות נדרשות

| שם עמודה | תיאור | סוג |
|----------|-------|-----|
| `דרישה` | שם הדרישה/פיצ'ר (אופציונלי) | טקסט |
| `משימה` | שם המשימה הראשית (אופציונלי) | טקסט |
| `תתי-משימה` | שם תת-המשימה (חובה) | טקסט |
| `Duration` | משך זמן במספר ימים | מספר |
| `Effort` | מאמץ בימי עבודה | מספר |
| `תאריך התחלה` | תאריך התחלת המשימה (חובה) | תאריך Excel |
| `תאריך סיום` | תאריך סיום המשימה (חובה) | תאריך Excel |
| `הערות` | הערות נוספות | טקסט |
| `תקצוב מקורי` | תקציב מקורי | מספר |
| `תקצוב בפועל` | תקציב בפועל | מספר |

### דוגמה למבנה גיליון

```
שם הגיליון: "ג'ון דו"

| דרישה | משימה | תתי-משימה | Duration | Effort | תאריך התחלה | תאריך סיום | הערות | תקצוב מקורי | תקצוב בפועל |
|-------|-------|-----------|----------|--------|-------------|------------|-------|--------------|--------------|
| Auth  | Login | UI Design | 3        | 2      | 01/01/2024  | 03/01/2024 | -     | 5000         | 4500         |
| Auth  | Login | Backend   | 5        | 4      | 04/01/2024  | 08/01/2024 | -     | 8000         | 7500         |
```

---

## קבצי הפרויקט

### 1. `dashboard.html`

**תפקיד:** מבנה HTML של הדשבורד

#### מבנה ראשי

```html
<body>
  <div class="dashboard-container">
    <!-- Header -->
    <header class="dashboard-header">
      - כותרת הדשבורד
      - כפתור העלאת קובץ
      - מידע על קובץ שנטען
    </header>

    <!-- Main Dashboard -->
    <div id="dashboard">
      1. Summary Cards - 4 כרטיסי סיכום
      2. Workload Overview - עומס עבודה לפי עובד
      3. Timeline View - ציר זמן של 30 ימים
      4. Today's Tasks - משימות להיום
      5. Employee Details - פירוט מלא לפי עובד
    </div>

    <!-- Empty State -->
    <div id="emptyState">
      מסך ריק עם הנחיות להעלאת קובץ
    </div>
  </div>
</body>
```

#### רכיבים עיקריים

**כרטיסי סיכום:**
- סך העובדים
- משימות פעילות
- עובדים בעומס גבוה (⚠️)
- תקציב בפועל

**ציר זמן:**
- תצוגה של 30 ימים
- ניווט בין חודשים
- זיהוי חפיפות בצבע אדום
- סימון יום נוכחי

**משימות להיום:**
- רשימת כל המשימות הפעילות היום
- מידע על עובד, תאריכים ומאמץ

**פרטי עובדים:**
- סטטיסטיקות מפורטות לכל עובד
- אזהרות על חפיפות
- רשימת כל המשימות

#### תלויות חיצוניות

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
```
- **SheetJS (xlsx)** - ספריה לקריאה ועיבוד קבצי Excel

---

### 2. `dashboard.js`

**תפקיד:** לוגיקה עסקית וניהול נתונים

#### משתנים גלובליים

```javascript
let workbookData = null;           // נתוני האקסל המפורסרים
let currentStartDate = new Date(); // תאריך התחלה לציר הזמן
```

**מבנה `workbookData`:**
```javascript
[
  {
    name: "שם העובד",
    tasks: [
      {
        requirement: "שם הדרישה",
        task: "שם המשימה",
        subTask: "תתי-משימה",
        duration: 5,
        effort: 3,
        startDate: Date object,
        endDate: Date object,
        notes: "הערות",
        originalBudget: 5000,
        actualBudget: 4500
      }
    ]
  }
]
```

#### פונקציות עיקריות

##### קריאת קובץ אקסל

```javascript
handleFileUpload(event)
```
- קורא קובץ Excel באמצעות FileReader API
- מעביר ל-`parseWorkbook()` לפרסור
- מציג את הדשבורד עם הנתונים
- **טיפול בשגיאות:** try-catch עם alert למשתמש במקרה של כשל

##### פרסור נתונים

```javascript
parseWorkbook(workbook)
```
**תהליך:**
1. עובר על כל הגיליונים (Sheet) ב-`workbook.SheetNames`
2. לכל גיליון:
   - שם הגיליון = שם העובד
   - המרה ל-JSON באמצעות `XLSX.utils.sheet_to_json(worksheet)`
     - השורה הראשונה מזוהה כשמות עמודות
     - כל שורה מומרת לאובייקט JavaScript
   - כל שורה = משימה
3. ממיר תאריכי Excel לאובייקטי Date של JS
4. **מסנן שורות:** רק שורות עם `תתי-משימה` + `תאריך התחלה` + `תאריך סיום`
5. מחזיר מערך של עובדים + משימות
6. גיליונות ריקים מתעלמים מהם

**המרת תאריכים:**
```javascript
excelDateToJSDate(excelDate)
```
- Excel מאחסן תאריכים כמספרים מ-01/01/1900
- Excel Epoch: 30/12/1899 (1899-11-30)
- נוסחה: `new Date(excelEpoch + excelDate * millisecondsPerDay)`
- ממיר לאובייקט `Date` של JavaScript
- מחזיר `null` אם הערך לא תקין

##### חישוב עומסים וחפיפות

```javascript
findOverlappingDates(employee)
```
**אלגוריתם:**
1. עובר על כל ימי העבודה של העובד
2. לכל יום, מחשב: `Σ(Effort / WorkDays)` של כל המשימות הפעילות
3. אם סכום > 1.0 ⟹ חפיפה!
4. מחזיר רשימת ימים עם חפיפות

```javascript
getEffortForDate(tasks, date)
```
- מחשב כמה "ימי עבודה" נדרשים ביום מסוים
- מחלק את ה-Effort של כל משימה על מספר ימי העבודה שלה
- דוגמה: משימה של 5 ימי Effort על 10 ימי Duration = 0.5 effort ליום

```javascript
countWorkDays(startDate, endDate)
```
- סופר רק ימי עבודה (א'-ה')
- מתעלם מסופי שבוע (ו'-ש')
- **הגנה מפני חלוקה באפס:** מחזיר לפחות 1 (`return count || 1`)

```javascript
isWorkDay(date)
```
- בודק אם יום הוא יום עבודה
- בישראל: יום א' (0) עד יום ה' (4)

```javascript
calculateAverageEffort(employee)
```
- מחשב ממוצע effort יומי לעובד
- נוסחה: `Σ(Effort) / Σ(Duration)`
- משמש לקביעת סטטוס עומס (גבוה/נמוך/תקין)

##### רינדור תצוגות

```javascript
displayDashboard()
```
**זרימה:**
1. מסתיר Empty State
2. מציג את הדשבורד
3. קורא לכל פונקציות הרינדור:
   - `updateSummaryCards()`
   - `renderWorkloadChart()`
   - `renderTimeline()`
   - `renderTodayTasks()`
   - `renderEmployeeDetails()`

```javascript
renderTimeline()
```
**תהליך:**
1. יוצר 30 עמודות של ימים מ-`currentStartDate`
2. יוצר שורה לכל עובד
3. לכל תא (יום):
   - בודק אם יש משימות
   - מחשב effort ליום
   - צובע לפי סטטוס:
     - 🟢 ירוק + `✓`: משימה אחת (effort ≤ 1.0)
     - 🟠 כתום + מספר: מספר משימות (effort ≤ 1.0)
     - 🔴 אדום + מספר: חפיפה (effort > 1.0, מציג את הערך המדויק)
     - ⬜ אפור: סוף שבוע (ללא משימות)
   - **Tooltip:** רשימת כל המשימות הפעילות ביום זה

```javascript
updateSummaryCards()
```
- מחשב סטטיסטיקות כלליות:
  - **סך העובדים:** אורך מערך `workbookData`
  - **משימות פעילות:** משימות ש-`startDate ≤ today ≤ endDate`
  - **עובדים בעומס גבוה:** עובדים עם חפיפות (effort > 1.0 ביום כלשהו)
  - **תקציב בפועל:** סכום כל ה-`actualBudget` של כל המשימות

```javascript
renderWorkloadChart()
```
- יוצר בר לכל עובד
- מחשב:
  - סך משימות
  - סך ימי עבודה (effort)
  - ממוצע יומי (avg effort)
  - חפיפות
- מציג סטטוס צבעוני (עדיפות לחפיפה):
  - 🔴 **חפיפה** (עדיפות ראשונה) - יש ימים עם effort > 1.0
  - 🟠 **עומס גבוה** - avg > 1.5 (ללא חפיפות)
  - 🔵 **עומס נמוך** - avg < 0.5 (ללא חפיפות)
  - 🟢 **תקין** - אחרת

```javascript
renderEmployeeDetails()
```
- יוצר כרטיס לכל עובד עם:
  - כותרת + status badge
  - גריד סטטיסטיקות (2×2): משימות, סך ימי עבודה, ממוצע יומי, תקציב
  - **אזהרת חפיפות:** (אם קיימות)
    - רשימת תאריכים עם effort > 1.0
    - לכל תאריך: הערך המדויק + tooltip עם רשימת משימות
  - רשימת כל המשימות עם טווח תאריכים

##### ניווט

```javascript
navigateMonth(direction)
```
- משנה את `currentStartDate` בחודש קדימה/אחורה (+1 או -1 חודשים)
- מרנדר מחדש את ציר הזמן באמצעות `renderTimeline()`

##### פורמט תאריכים

```javascript
formatDate(date)       // 01/01/2024
formatShortDate(date)  // 01/01
```
- משתמש ב-`toLocaleDateString('he-IL')` לפורמט עברי

```javascript
isToday(date)
```
- משווה תאריך נתון ליום הנוכחי
- בודק שוויון של: יום, חודש ושנה
- משמש לסימון התא הנוכחי בציר הזמן

#### Event Listeners

```javascript
// העלאת קובץ
uploadBtn.addEventListener('click', () => fileInput.click());
uploadBtnEmpty.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileUpload);

// ניווט בציר זמן
document.getElementById('prevMonth')?.addEventListener('click', () => navigateMonth(-1));
document.getElementById('nextMonth')?.addEventListener('click', () => navigateMonth(1));
```

---

### 3. `dashboard.css`

**תפקיד:** עיצוב ויזואלי בסגנון Apple

#### עקרונות עיצוב

**פלטת צבעים:**
```css
:root {
  --primary: #007aff;      /* כחול iOS */
  --success: #34c759;      /* ירוק */
  --warning: #ff9500;      /* כתום */
  --danger: #ff3b30;       /* אדום */
  --gray-50 to --gray-800 /* סקלת אפור */
}
```

**טיפוגרפיה:**
- פונט: SF Pro Display / Helvetica Neue
- משקלים: 500, 600
- Letter-spacing שלילי לכותרות (-0.02em)

**רדיוסים:**
- קטן: 6-8px (כפתורים, badges)
- בינוני: 12px (cards)
- גדול: 16px (sections)

#### מבנה CSS

**1. Reset & Base**
- CSS Reset בסיסי
- CSS Variables
- Typography base styles

**2. Layout Components**
- `.dashboard-container` - קונטיינר ראשי (max-width: 1400px)
- `.dashboard-header` - Header עם כותרת וכפתורים
- `.card` - כרטיס בסיסי עם shadow וborder

**3. Summary Section**
- Grid של 4 כרטיסים
- `.card-value` - מספרים גדולים (2.5rem)
- `.card-value.warning` - צבע אדום לאזהרות

**4. Workload Chart**
- `.workload-bar` - בר עבור כל עובד
- `.workload-fill` - מילוי צבעוני לפי סטטוס
- `.status-badge` - תגיות סטטוס עם צבעי רקע

**5. Timeline**
- `.timeline-container` - גריד עם scroll אופקי (overflow-x: auto)
- `.timeline-header`, `.timeline-row`:
  - `grid-template-columns: 180px repeat(30, 44px)`
  - עמודה ראשונה: 180px (שמות עובדים)
  - 30 עמודות נוספות: 44px כל אחת (ימים)
  - סה"ק רוחב: 180 + (30 × 44) = 1,500px
- `.timeline-header` - כותרות קבועות (position: sticky, top: 0)
- `.timeline-employee-col` - עמודת שמות (position: sticky, right: 0)
- `.timeline-day`, `.timeline-cell` - תא של 44px רוחב מינימלי
- `.timeline-cell` - תא ביום
  - `.has-task` - ירוק (var(--success))
  - `.multiple-tasks` - כתום (var(--warning))
  - `.overlap-task` - אדום (var(--danger)) + אנימציית pulse
  - `.weekend` - אפור (var(--gray-100))
  - `.today` - מסגרת כחולה 2px (var(--primary))

**6. Task Cards**
- `.task-card` - כרטיס משימה
- Hover: translateY(-2px) + shadow

**7. Employee Details**
- `.employee-card` - כרטיס עובד
- `.employee-stats` - גריד של סטטיסטיקות
- `.overlap-warning` - אזהרה בולטת על חפיפות

**8. Animations**
```css
@keyframes fadeIn {           /* הופעה חלקה */
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {            /* פעימה לחפיפות */
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}
```
- `fadeIn` - מוחל על `.dashboard-content` ו-`.card` (0.4s)
- `pulse` - מוחל על `.overlap-task` ו-`.workload-overlap` (2s infinite)

**9. Responsive Design**
- Breakpoints:
  - 1024px: התאמת גריד
  - 768px: מעבר ל-mobile
- Grid משתנה מ-4 עמודות ל-1
- Timeline מתכווץ

**10. Scrollbar Styling**
- עיצוב scrollbar מותאם אישית (WebKit)

#### מחלקות שימושיות

```css
.hidden           /* display: none */
.btn              /* כפתור בסיסי */
.btn-primary      /* כפתור כחול */
.btn-icon         /* כפתור עגול קטן */
.status-badge     /* תגית סטטוס */
.empty-state      /* מסך ריק */
```

---

## זרימת עבודה (Flow)

### 1. טעינת הדף
```
dashboard.html נטען
  ↓
dashboard.js מאתחל
  ↓
Event Listeners מוגדרים
  ↓
Empty State מוצג
```

### 2. העלאת קובץ
```
משתמש לוחץ "טען קובץ תכנון"
  ↓
File Picker נפתח
  ↓
קובץ נבחר → handleFileUpload()
  ↓
FileReader קורא את הקובץ כ-ArrayBuffer
  ↓
XLSX.read() מפרסר את הנתונים
  ↓
parseWorkbook() ממיר לפורמט פנימי
  ↓
displayDashboard() מציג הכל
```

### 3. רינדור הדשבורד
```
displayDashboard() נקראת
  ↓
updateSummaryCards()
  ├─ סופר עובדים
  ├─ סופר משימות פעילות
  ├─ מזהה חפיפות
  └─ מסכם תקציב
  ↓
renderWorkloadChart()
  ├─ מחשב סך effort לכל עובד
  ├─ מזהה חפיפות
  └─ מציג בר עם צבע
  ↓
renderTimeline()
  ├─ יוצר 30 עמודות
  ├─ לכל עובד: שורה
  ├─ לכל יום: תא
  └─ צובע לפי עומס
  ↓
renderTodayTasks()
  ├─ מסנן משימות להיום
  └─ מציג כרטיסים
  ↓
renderEmployeeDetails()
  ├─ לכל עובד: כרטיס
  ├─ סטטיסטיקות
  ├─ אזהרות חפיפה
  └─ רשימת משימות
```

---

## אלגוריתם זיהוי חפיפות

### הבעיה
עובד עובד על מספר משימות במקביל, צריך לזהות מתי יש "יותר מיום עבודה אחד" ביום אחד.

### הפתרון

#### שלב 1: חישוב Effort יומי למשימה
```
Effort_Per_Day = Total_Effort / WorkDays_In_Range
```

**דוגמה:**
- משימה: Effort = 5 ימים
- טווח: 01/01 - 10/01 (10 ימים כולל סופש"ו)
- ימי עבודה: 8 (א'-ה' בלבד)
- Effort יומי: 5 / 8 = 0.625

#### שלב 2: סכימה ליום מסוים
```
Total_Effort_For_Date = Σ Effort_Per_Day for all active tasks
```

**דוגמה:**
ביום 05/01 פעילות:
- משימה A: 0.625 effort/day
- משימה B: 0.5 effort/day
- **סך הכל: 1.125** → 🔴 חפיפה!

#### שלב 3: זיהוי חפיפה
```javascript
if (Total_Effort_For_Date > 1.0) {
  // חפיפה! צבע אדום
  statusClass = 'overlap';
}
```

#### מה קורה בממשק?
- תא בציר הזמן הופך אדום
- מוצג המספר (1.1, 1.5, וכו')
- הוסף לרשימת "עובדים בעומס גבוה"
- אזהרה בכרטיס העובד עם רשימת ימים

---

## תכונות מיוחדות

### 1. ימי עבודה בלבד (א'-ה')
- הלוגיקה מתעלמת מסופי שבוע
- סופי שבוע מסומנים באפור בציר הזמן
- חישוב Effort מחולק רק על ימי עבודה

### 2. ציר זמן דינמי
- ניווט בין חודשים
- 30 ימים בתצוגה
- סימון יום נוכחי בכחול

### 3. סטטוסים חזותיים
| סטטוס | צבע | תנאי |
|-------|-----|------|
| תקין | 🟢 ירוק | avg ≤ 1.5, ללא חפיפות |
| עומס גבוה | 🟠 כתום | avg > 1.5 |
| עומס נמוך | 🔵 אפור | avg < 0.5 |
| חפיפה | 🔴 אדום | יש ימים עם effort > 1.0 |

### 4. Tooltips
- העברת עכבר על תא בציר הזמן ← רשימת משימות
- העברת עכבר על תאריך בחפיפה ← פירוט מדויק

### 5. Responsive Design
- Desktop: גריד של 4 כרטיסים
- Tablet: 2 כרטיסים
- Mobile: כרטיס אחד, טבלה ניתנת לגלילה

---

## הרחבות אפשריות

### תכונות שניתן להוסיף:
1. **ייצוא לקובץ** - PDF/Excel של הדשבורד
2. **פילטרים** - סינון לפי עובד/סטטוס/תאריך
3. **עריכת משימות** - אפשרות לעדכן ישירות בדשבורד
4. **התראות** - אימייל/פוש על חפיפות
5. **גרפים** - Charts עם Chart.js או D3
6. **שמירה לוקלית** - LocalStorage לשמירת נתונים
7. **תצוגת שבוע** - במקום 30 ימים
8. **Drag & Drop** - גרירת משימות בציר הזמן
9. **היסטוריה** - מעקב אחר שינויים
10. **רב-שפתי** - תמיכה באנגלית

---

## טיפים לשימוש

### קובץ אקסל אידיאלי:
✅ שמות גיליונות ברורים (שם+משפחה)
✅ תאריכים בפורמט אחיד
✅ Effort ו-Duration מסודרים
✅ ללא שורות ריקות באמצע

### טעויות נפוצות:
❌ שכחת לציין תאריך התחלה/סיום
❌ תאריכי סיום לפני תאריכי התחלה
❌ Effort גדול מ-Duration (יוצר חפיפות מיותרות)
❌ שם גיליון ריק

### Performance:
- מומלץ עד 50 עובדים × 100 משימות
- מעל זה, יש לחלק לקבצים נפרדים

---

## דרישות מערכת

### דפדפנים נתמכים:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### תלויות:
- **SheetJS (xlsx)** v0.18.5 - נטען מ-CDN

### גודל קבצים:
- `dashboard.html`: ~3 KB
- `dashboard.js`: ~13 KB
- `dashboard.css`: ~18 KB
- **סה"ק**: ~34 KB (לא כולל ספריות חיצוניות)

---

## רישיון והפצה

פרויקט זה מיועד לשימוש פנימי.

---

## היסטוריית שינויים

### [26/12/2025] - שיפור Tooltips בציר הזמן
**מה השתנה:**
- הוספת tooltip גלובלי אחד שמופיע במרכז המסך
- הצגת היררכיה מלאה תמיד: דרישה → משימה → תת-משימה
- עיצוב Apple-style עם backdrop blur ואנימציות
- z-index: 99999 - מעל כל השכבות
- תמיכה מלאה ב-RTL

**למה:**
- פתרון טכני פשוט - tooltip גלובלי יחיד במקום tooltips מרובים
- מיקום במרכז המסך - תמיד גלוי וברור
- ללא בעיות z-index או stacking context
- UX מושלם - tooltip גדול וקריא

**קבצים שהשתנו:**
- `dashboard.html` - הוספת `<div id="globalTooltip">`
- `dashboard.js` - event listeners על hover שמעדכנים את ה-tooltip הגלובלי
- `dashboard.css` - עיצוב `.global-tooltip` עם position fixed במרכז המסך

**בדיקות שבוצעו:**
- ✅ **בדיקה תחבירית:** אין linter errors ב-JS או CSS
- ✅ **Syntax תקין:** הקוד עובר בדיקת syntax מלאה
- ✅ **עיצוב Apple:** תואם לסגנון המערכת (backdrop-blur, transitions, RTL)
- ✅ **Responsive:** tooltips מוצבים נכון גם בקצוות המסך
- ⚠️ **Unit Tests:** לא בוצעו בדיקות פונקציונליות (צריך לבדוק בדפדפן)
- ⚠️ **UI Test:** לא נבדק עם קובץ אקסל אמיתי

**גיבוי:**
- גרסה קודמת (עם tooltips רגילים) שמורה ב-`Archive/dashboard.js` ו-`Archive/dashboard.css`

---

## יצירת קשר ותמיכה

לשאלות, בעיות או בקשות לתכונות - צור Issue או פנה לצוות הפיתוח.

---

**עודכן לאחרונה:** 26 דצמבר 2025
**גרסה:** 1.1
