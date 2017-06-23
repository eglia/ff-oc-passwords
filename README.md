# Firefox + ownCloud Passwords
#### 2016-2017, Andreas Egli

---

# No longer maintained!
Starting with nextCloud version 12, the passwords app [no longer supports nextCloud](https://github.com/fcturner/passwords/issues/323). As I am a nextCloud user myself, I was unfortunately forced to stop using the passwords app. Therefore, I have no more need for this Firefox extension and will no longer maintain this repository.

---

## Summary
A Firefox add-on to access passwords stored in an ownCloud.
Requires the [ownCloud Passwords](https://github.com/fcturner/passwords) app.

The latest packaged release is available from [Mozilla Addons](https://addons.mozilla.org/en-US/firefox/addon/firefox-owncloud-passwords)

## Security
All data exchange with the ownCloud instance is done via the API.
**It is strongly recommended to only use SSL encrypted connections, otherwise all passwords will be transmitted in cleartext!**

The ownCloud username and password are stored locally in the Firefox password manager.
**It is strongly recommended to set a master password in Firefox, otherwise all passwords will be accessible for anyone with access to your computer!**

## Settings
- **Remember login**

  If checked, the ownCloud credentials will be stored in the Firefox password manager.
  If unchecked, the owncloud credentials will only be stored in memory and need to be entered on every browser start.

- **Include name field in site matching**

  Determines whether the name field should be treated as an URL and used to match a password to a site. If unchecked, only the URL field will be used.

- **Ignore protocol for site matching**

  Determines whether the extension will check for a matching protocol when matching a password to a site. If unchecked, a password with URL `http://example.org` will not match `https://example.org`.

- **Ignore subdomain for site matching**

  Determines whether the extension will check for a matching subdomain when matching a password to a site. If unchecked, a password with URL `https://sub.example.org` will not match `https://example.org`.

- **Ignore path for site matching**

  Determines whether the extension will check for a matching path when matching a password to a site. If unchecked, a password with URL `https://example.org/path` will not match `https://example.org`.
