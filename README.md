# CarsRUs Transporter Check-In System

A web-based gate operations tool for managing transporter check-ins and check-outs at CarsRUs locations. Replaces the paper logbook with a real-time digital queue backed by Google Sheets.

---

## Files

| File | Purpose |
|------|---------|
| `index-v1.html` | Employee dashboard — queue management, check-in, check-out, list/card views |
| `checkin-v1.html` | Transporter self-service kiosk — linked via QR code at the gate |
| `appscript-v1.gs` | Google Apps Script backend — paste into Apps Script, not deployed to Netlify |

---

## How It Works

1. Transporter arrives at the gate
2. Employee checks them in via `index-v1.html`, **or** transporter scans QR code and self-checks in via `checkin-v1.html`
3. System assigns a queue position and estimated wait time
4. Employee updates status to **In Progress** when serving the transporter
5. Employee checks them out — records Time Out and Signed Out By
6. All data writes to Google Sheets in real time

---

## Setup

### 1. Google Sheet
- Create a new blank Google Sheet
- Name it anything you like — the script will create the `TransporterLog` tab automatically on first use

### 2. Apps Script
- In your Google Sheet go to **Extensions → Apps Script**
- Delete the default `myFunction()` code
- Paste the full contents of `appscript-v1.gs`
- Click **Save**

### 3. Deploy the Web App
- Click **Deploy → New Deployment**
- Type: **Web App**
- Execute as: **Me**
- Who has access: **Anyone**
- Click **Deploy** and copy the Web App URL

### 4. Connect the HTML Files
In both `index-v1.html` and `checkin-v1.html`, replace the placeholder with your deployed URL:

```javascript
const APPS_SCRIPT_URL = "YOUR_APPS_SCRIPT_URL_HERE";
```

In `index-v1.html` also set the kiosk URL for the QR code feature:

```javascript
const CHECKIN_URL = "YOUR_CHECKIN_URL_HERE"; // e.g. https://your-site.netlify.app/checkin-v1.html
```

### 5. Deploy to Netlify
- Drag and drop the repo folder into Netlify, **or** connect this GitHub repo
- Set publish directory to `/` (root)
- Your two URLs will be:
  - `https://your-site.netlify.app/index-v1.html` — employee dashboard
  - `https://your-site.netlify.app/checkin-v1.html` — transporter kiosk / QR destination

---

## Google Sheets Schema

The `TransporterLog` sheet is auto-created with these columns:

| Column | Description |
|--------|-------------|
| Date | Auto-filled on check-in |
| Driver Name | |
| Driver Phone | |
| Carrier | |
| Carrier Phone | |
| Lane | |
| Time In | Auto-filled on check-in |
| Time Out | Filled on check-out |
| Drop Off | Vehicle count |
| Pickup | Vehicle count |
| Status | Waiting / In Progress / Completed |
| Vehicle Types | Wholesale, RAW, Repo, No Runner, Other |
| Comments | |
| Queue Position | Auto-assigned |
| Est. Wait (min) | Auto-calculated (20 min per transporter) |
| Signed In By | Employee name or "Self" |
| Signed Out By | Employee name |
| Row ID | Unique ID format: `CR-{timestamp}-{random}` |

---

## Version History

| Version | File | Notes |
|---------|------|-------|
| v6 | index-v6.html | Fix: Apps Script URL hardcoded in file — works on all devices without configuration; Settings panel kept as admin override only |
| v5 | index-v5.html | Fix: Settings screen to configure URLs in-browser; removed demo fallback that caused data loss; loadRecords never wipes existing data on failed refresh |
| v4 | index-v4.html | Fix: action buttons (Edit/Start/Check Out) now have type="button"; auto-refresh paused while modal open; Escape key only closes QR modal not data-entry modals; sortBy uses safe element reference not global event |
| v3 | index-v3.html | Fix: backdrop click no longer closes data-entry modals; Tab key navigates fields safely |
| v2 | index-v2.html | Fix: Enter key no longer closes modals early; added type="button" to all modal buttons |
| v1 | index-v1.html | Initial release |
| v2 | checkin-v2.html | Fix: Apps Script URL hardcoded in file — no per-device configuration needed |
| v1 | checkin-v1.html | Initial release |
| v3 | appscript-v3.gs | Fix: uses openByUrl — works as standalone script, no longer requires script to be bound to sheet |
| v2 | appscript-v2.gs | Intermediate copy (superseded by v3) |
| v1 | appscript-v1.gs | Initial release |

---

## Notes

- The dashboard runs in **demo mode** automatically if no Apps Script URL is configured — safe for testing
- Employee name is saved in browser `localStorage` — each device remembers its own employee
- Dashboard auto-refreshes every 60 seconds
- All modals close with the **Escape** key
- Estimated wait time is calculated at **20 minutes per transporter** in the queue — adjust in `appscript-v1.gs` if needed
