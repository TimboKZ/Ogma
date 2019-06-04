/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

const chalk = require('chalk');

const dateOptions = {
    hour12: false,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
};

let lastTime;

class Logger {

    static info(...args) {
        const timeString = new Date().toLocaleString('en-us', dateOptions);
        console.error.apply(null, [`[${timeString}]`, chalk.green('INF')].concat(args));
    }

    static error(...args) {
        const timeString = new Date().toLocaleString('en-us', dateOptions);
        console.error.apply(null, [`[${timeString}]`, chalk.red('ERR')].concat(args));
    }

    static warn(...args) {
        const timeString = new Date().toLocaleString('en-us', dateOptions);
        console.log.apply(null, [`[${timeString}]`, chalk.yellow('WRN')].concat(args));
    }

    static debug(...args) {
        const timeString = new Date().toLocaleString('en-us', dateOptions);
        console.log.apply(null, [`[${timeString}]`, chalk.magenta('DBG')].concat(args));
    }

    static time(...args) {
        const date = new Date();
        const timeString = date.toLocaleString('en-us', dateOptions);
        const newTime = date.getTime();
        let delayString = lastTime ? chalk.red(`[+${(newTime - lastTime) / 1000}s]`) : chalk.gray(`[...]`);
        args.push(delayString);
        console.log.apply(null, [`[${timeString}]`, chalk.cyan('DBG')].concat(args));
        lastTime = newTime;
    }

}

module.exports = Logger;
