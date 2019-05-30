# Ogma
Tagging system for large file collections.

# Building & running

### Cloning

Note that `ogma-frontend/` directory points to [a separate Git repository](https://github.com/TimboKZ/ogma-frontend).
This means this repository has to be cloned with submodules:
```bash
git clone --recursive https://github.com/TimboKZ/Ogma.git

# OR if you already cloned the repo:
git clone https://github.com/TimboKZ/Ogma.git
cd Ogma
git submodule init
git submodule update --recursive
```

### Running in development mode

First, start the webpack development server for the frontend:

```bash
cd ogma-frontend/
npm start
```

The webpack server will startup and open the webapp in your browser. The webapp will report some errors - this is
expected, as the backend server is not running yet.

Next, start the Electron app which will run the backend server in the background:
```
cd .. # Go back to repository root
npm start
```

Once the Electron app starts up, you can reload your browser window and the web app should work as intended.
