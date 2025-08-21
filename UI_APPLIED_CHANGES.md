# UI Restructure Applied

This commit introduces the topbar + per-module sidebar structure and turns each sidebar item into a routed page, with basic CSS files created per module.

## Summary of changes

- Topbar updated to modules: Dashboards, Assessments, DQA Data, DQA Analysis, Notifications, Administration, Help. Root redirects to /dashboards.
- Router restructured to mount per-module containers and nested routes for sidebars.
- DQA Data module converted to a container with sidebar and eight pages:
  - Register Entry
  - Summary Entry
  - Reported Data
  - Snapshots (History)
  - Corrections Entry
  - Comparison View
  - Validation & Drafts
  - Import/Export
- New DQA Analysis container and sidebar with placeholder pages.
- New Dashboards container and sidebar with placeholder pages.
- Notifications page refactored into a container with sidebar and child pages.
- Administration gains "Channels & Providers" page under Notifications area (moved from Notifications as requested).

## New files

- src/pages/Dashboards/Dashboards.jsx (+ dashboards.css)
- src/pages/DQAAnalysis/DQAAnalysis.jsx (+ dqaAnalysis.css)
- src/pages/DQAData/DQAData.jsx (rewritten container)
- src/pages/DQAData/pages/
  - RegisterEntry.jsx
  - SummaryEntry.jsx
  - ReportedData.jsx
  - Snapshots.jsx
  - CorrectionsEntry.jsx
  - ComparisonView.jsx
  - ValidationDrafts.jsx
  - ImportExport.jsx
  - dqaData.css
- src/pages/Administration/components/ChannelsProviders.jsx

## Routing

- /dashboards/* → Dashboards container
- /assessments → Assessments list
- /dqa-data/* → DQA Data container
- /dqa-analysis/* → DQA Analysis container
- /notifications/* → Notifications container
- /administration/* → Administration container (admin-only)
- Legacy: /dashboard still works to open Dashboards

## Styling

Standalone CSS files added for each module to keep separation of concerns. Components still follow existing styled-components pattern to match current UI. You can progressively migrate common styles into the CSS files.

## Next steps

- Wire global context bar (Assessment/Period/OU) to these pages.
- Replace placeholders with real data services.
- Add Help module container when content is available.