# MapifyMUJ 🗺️

> **Campus Navigation & Smart Student Dashboard for Manipal University Jaipur**

A minimal, mobile-first web app that helps MUJ students find classrooms, track their timetable, and monitor attendance — all in one place. No app install required. Just open the link.

---

## ✨ Features

### 🏠 Home Dashboard
- Personalized greeting (Good Morning / Afternoon / Evening)
- **Next class card** with subject, faculty, room, time
- Live **attendance ring** showing current % for that subject
- Upcoming classes for the rest of the day
- Quick-access buttons for all 4 campus blocks

### 🏢 Building Navigation (3-Level Drill Down)
- **Level 1** → Choose a building (AB-1, AB-2, AB-3, LHC)
- **Level 2** → Choose a floor (with room & lab counts per floor)
- **Level 3** → See all rooms in a color-coded grid

### 🚪 Room Grid
- All rooms sourced from real MUJ room data
- Color-coded by type:
  - 🚪 Classroom · 🧪 Lab · 👤 Faculty Room
  - 💬 Seminar / Discussion · 🎓 Lecture Hall · ⭐ Special Room
- Filter chips to narrow by room type
- Tap any room to see its details
- **"NOW" badge** on the room where your current class is happening

### 📅 Smart Timetable
- Full weekly timetable for **DSE IV B, Semester IV, Section B**
- Day selector tabs
- Each slot shows: subject, faculty, room, attendance ring
- Free slots clearly marked
- **Attendance Overview** — progress bars for every subject

### 🔍 Search
- Search any room number, type, or building
- Instant live results across all floors and buildings
- Tap result to jump directly to that building

---

## 🏗️ Buildings Covered

| Building | Floors | Total Rooms |
|---|---|---|
| Academic Block 1 (AB-1) | 1st, 2nd, 3rd | 82 rooms |
| Academic Block 2 (AB-2) | 1st, 2nd, 3rd | 13 rooms |
| Academic Block 3 (AB-3) | Ground, 1st, 2nd | 44 rooms |
| Lecture Hall Complex (LHC) | Ground, 1st, 2nd, 3rd | 27 rooms |

---

## 📚 Timetable — DSE IV B

| Code | Subject | Faculty |
|---|---|---|
| DSE2201 | Relational Database Mgmt. Systems | Dr. Neeraj Kumar Verma |
| DSE2202 | Computer Networks | Dr. Santosh Rajak |
| DSE2220 | Machine Learning | Mr. Ashish Pandey |
| DSE2240 | Cloud Computing | Dr. Malvinder Singh Bali |
| DSE2230 | RDBMS Lab | Dr. Shitanshu Jain |
| DSE2231 | Computer Networks Lab | Dr. Santosh Rajak |
| DSE2270 | PBL-2 | Dr. Santosh Rajak |
| MAS2001 | Statistics & Probability | Dr. Vijaypal Poonia |

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Markup | HTML5 |
| Styling | CSS3 (custom, no frameworks) |
| Logic | Vanilla JavaScript (ES6+) |
| Fonts | Google Fonts — DM Sans + Syne |
| Hosting | GitHub Pages |

> **Zero dependencies. Zero build tools. Zero npm install.**
> Just one `.html` file — open it anywhere.

---

## 🚀 How to Run Locally

```bash
# Option 1 — Just open the file
# Double-click index.html in your file explorer. Done.

# Option 2 — Using VS Code Live Server
# Install the "Live Server" extension in VS Code
# Right-click index.html → Open with Live Server
```

---

## 📂 Project Structure

```
MapifyMUJ/
│
├── index.html      ← Entire app (HTML + CSS + JS in one file)
└── README.md       ← This file
```

---

## 🌐 Deploy on GitHub Pages

1. Push both files to a GitHub repo named `MapifyMUJ`
2. Go to **Settings → Pages**
3. Source: **Deploy from branch → main → / (root)**
4. Save — your app goes live in ~1 minute at:
   `https://yourusername.github.io/MapifyMUJ`

---

## 👥 Team

**Project:** MapifyMUJ
**Course:** Project Based Learning 2 (DSE2270)
**Department:** Data Science & Engineering
**University:** Manipal University Jaipur
**Semester:** IV · Section B · Session: Jan–Jun 2026

---

## 🔮 Future Scope

- [ ] Real-time class occupancy
- [ ] Faculty availability tracker
- [ ] Push notifications for next class
- [ ] Outdoor campus map with walking directions
- [ ] Student login with personalized timetable
- [ ] Dark mode

---

## 📄 License

This project is built for academic purposes under PBL-2 at Manipal University Jaipur.

---

<p align="center">Made with ❤️ for MUJ students</p>
