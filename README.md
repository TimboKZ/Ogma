# Ogma
Tagging system for large file collections.

### Notes

If you're having trouble getting `better-sqlite3` to compile on Windows, try running this as an  administrator:
```bash
npm install --global --production windows-build-tools --vs2015
npm install -g --production windows-build-tools
node_modules/.bin/electron-rebuild -f -w better-sqlite3
```

If you're having issues with Babel complaining about missing `core-js/library/fn/get-iterator`, try downloading 
`core-js` v2.5.7 from [here](https://github.com/zloirock/core-js/tree/v2.5.7) and unzipping it into 
`node_modules/core-js`.