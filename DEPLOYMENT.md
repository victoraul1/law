# VRG Law Deployment Instructions

## Required Environment Variables

### On Droplet (systemd service):
Add to /etc/systemd/system/law.service:

Environment="ENCRYPTION_KEY=eW01ZURGcFZfOHZkSHN0aU8xWnZrQ0VrM3ZTR29XTjg4ZjJaMUpyT3ozND0="

After any changes to service file:
systemctl daemon-reload
systemctl restart law

## Backup Locations
- Full backup: /root/law-FINAL-WORKING-20251008-2149.tar.gz
- Service file: /root/law.service.backup-20251008-2149

## Project URL
https://law.vrgmarketsolutions.com

## Success Rate
100% message success after encryption key fix!
