# RVM Web App Backup Policy

## Never Delete Old Files
When deploying new builds, OLD JS/CSS files MUST remain on the server.
Only ADD new files, never REMOVE old ones.

## Server Backups
Location: /var/www/backups/rvm-web/
- Full backup taken before any deployment
- Named by date: YYYY-MM-DD/

## Git Before Deploy
Any fix must be committed to GitHub FIRST at:
https://github.com/HMADigital-Systems/rvm-web

This ensures the working code is never lost.

## Working Build Backup
The known-good build is saved locally at:
./backups/index-BY0C8J_6_working.js
