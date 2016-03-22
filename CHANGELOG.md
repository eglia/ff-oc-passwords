## Changelog
### HEAD
- Added functionality to detect submitted password forms and save them to the database ([#6](https://github.com/eglia/ff-oc-passwords/issues/6))
- Fixed warnings not showing when opening settings panel

### 0.2.12
- Added option to not store owncloud password
- Added warning when storing password
- Added warning when not using SSL
- Improved tab change detection
- Fixed Firefox version requirement
- Fix for API data containing special characters ([#1](https://github.com/eglia/ff-oc-passwords/issues/1))
- Fix for multiple login forms on a single page
- Fix for trailing / in owncloud url ([#1](https://github.com/eglia/ff-oc-passwords/issues/1))

### 0.2.11
- Fixed token expired error ([#4](https://github.com/eglia/ff-oc-passwords/issues/4))

### 0.2.10
- Fixed regression introduced in 0.2.9 which caused the addon to break

### 0.2.9
- Fixed character escape ([#3](https://github.com/eglia/ff-oc-passwords/issues/3))

### 0.2.8
- Correctly update logins on tab change
- Added refresh button to mobile interface
- Added support for multiple logins per page on mobile
- Improved host parsing

### 0.2.7
- Filter out passwords in the trash bin 

### 0.2.6
- Also look for a hostname in the "website or company" field

### 0.2.5
- Ignore subdomains when searching for logins

### 0.2.4
- Added mobile support

### 0.2.0
- Complete revamp of UI

### 0.1.0
- Initial release
