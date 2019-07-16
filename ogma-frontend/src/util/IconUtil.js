/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import ExactTrie from 'exact-trie';

import {ColorsLight, VideoExtensions, ImageExtensions, AudioExtensions} from './typedef';

export const FolderIconData = {name: 'folder', colorCode: 0};
const FileIconData = {name: 'file', colorCode: 32};
const IconsToExtensions = {
    'balance-scale': ['license'],
    'code': ['ipynb'],
    'cogs': ['sfk', 'ini', 'toml', 'iml'],
    'cubes': ['3ds', 'obj', 'ply', 'fbx'],
    'database': ['json', 'sql'],
    'file-alt': ['txt', 'md', 'nfo'],
    'file-archive': ['zip', 'rar', 'tar', 'tar.gz'],
    'file-excel': ['csv', 'xls', 'xlsx'],
    'file-image': ImageExtensions,
    'file-pdf': ['pdf'],
    'file-word': ['doc', 'docx', 'odt'],
    'film': VideoExtensions,
    'file-code': ['html', 'php', 'css', 'xml'],
    'info-circle': ['bib', 'readme'],
    'key': ['pem', 'pub'],
    'lock': ['lock', 'lock.json', 'shrinkwrap.json'],
    'music': AudioExtensions,
    'running': ['swf'],
    'terminal': ['run', 'sh'],
    'trash': ['.Trashes'],
    'users': ['authors', 'contributors'],

    'b:adobe': ['psd'],
    'b:git-alt': ['.gitignore'],
    'b:linux': ['AppImage'],
    'b:node-js': ['js', 'jsx', 'ts', 'tsx'],
    'b:php': ['php'],
    'b:python': ['py'],
    'b:ubuntu': ['deb'],
};

const step = 5;
let colourIndex = 0;

const exactTrie = new ExactTrie();
for (const name in IconsToExtensions) {
    const exts = IconsToExtensions[name];
    for (let i = 0; i < exts.length; ++i) {
        colourIndex += step;
        const colorCode = colourIndex % (ColorsLight.length - 1) + 1;
        exactTrie.put(exts[i], {name, colorCode}, true);
    }
}

export const getIconData = file => {
    const match = exactTrie.getWithCheckpoints(file.base, '.', true);
    return match ? match : FileIconData;
};
