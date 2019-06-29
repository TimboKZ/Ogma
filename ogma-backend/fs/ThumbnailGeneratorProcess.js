/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license LGPL-3.0
 */

const ThumbnailGenerator = require('fs-thumbnail');
const generator = new ThumbnailGenerator({verbose: false, size: 300, quality: 20});

process.on('message', data => {
    const {reqId, filePath, thumbPath} = data;
    generator.getThumbnail({path: filePath, output: thumbPath})
        .then(thumbPath => process.send({reqId, result: thumbPath}))
        .catch(error => process.send({reqId, error}));
});
