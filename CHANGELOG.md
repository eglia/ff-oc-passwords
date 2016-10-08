## Changelog
### 0.3.5
- Fix for newer App versions reporting the deleted flag as boolean

### 0.3.4
- Increased minimal Firefox version to 38 ([#18](https://github.com/eglia/ff-oc-passwords/issues/18))
- Fixed malfunction with partially corrupted database ([fcturner/passwords/#242](https://github.com/fcturner/passwords/issues/242))

### 0.3.3
- improved panel size handling ([#14](https://github.com/eglia/ff-oc-passwords/issues/14))

### 0.3.2
- fixed character encoding for all panels
- added timeout of 5s to API calls
- added error messages for failed requests

### 0.3.1
- Added private browsing support
- Added multiprocess firefox support
- Improved version detection ([#10](https://github.com/eglia/ff-oc-passwords/issues/10))

### 0.3.0
- Added functionality to detect submitted password forms and save them to the database ([#6](https://github.com/eglia/ff-oc-passwords/issues/6))
- Added functionality to copy passwords to clipboard ([#7](https://github.com/eglia/ff-oc-passwords/issues/7))
- Added functionality to fine tune site matching ([#8](https://github.com/eglia/ff-oc-passwords/issues/8))
- Added proper cleanup function
- Added warning when using old versions of the password app
- Improved JSON escape
- Fixed warnings not showing when opening settings panel
- Fixed refresh button getting stuck

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
