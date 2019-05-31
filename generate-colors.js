const chroma = require('chroma-js');

let angle;
const step = 5;
for (angle = 0; angle < 360; angle += step) {
    const hsl = `hsl(${angle}, 40%, 40%)`;
    console.log(`'${chroma(hsl).hex()}',`);
}

