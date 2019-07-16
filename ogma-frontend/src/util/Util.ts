/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import md5 from 'md5';
import _ from 'lodash';
import Denque from 'denque';
import Promise from 'bluebird';
import deepEqual from 'fast-deep-equal';
import {detailedDiff} from 'deep-object-diff';

import {File} from '../redux/ReduxTypedef';
import packageData from '../../package.json';
import {ExplorerOptions, SortOrder} from './typedef';

const imageCacheMap: { [id: string]: boolean } = {};

export default class Util {

    static getPackageVersion() {
        return packageData.version;
    }

    static loadImage(url: string, id: string | null = null) {
        if (id && imageCacheMap[id]) return Promise.resolve();

        return new Promise((resolve, reject) => {
            let img = new Image();
            img.addEventListener('load', () => {
                if (id) imageCacheMap[id] = true;
                resolve();
            });
            img.addEventListener('error', () => {
                reject(new Error(`Failed to load image from URL: ${url}`));
            });
            img.src = url;
        });
    }

    static loadScript(url: string) {
        return new Promise((resolve, reject) => {
            try {
                const script = document.createElement('script');
                script.onload = resolve;
                script.onerror = () => reject(new Error(`Could not download script from "${url}".`));
                script.src = url;
                document.head.appendChild(script);
            } catch (error) {
                reject(error);
            }
        });
    }

    static truncate(string: string, length: number, ellipsis: string = '...') {
        if (string.length < length + 5) return string;
        else return `${string.substring(0, length)}${ellipsis}`;
    }

    static getMd5(string: string): string {
        return md5(string);
    }

    static getFileHash(nixPath: string): string {
        return Util.getMd5(nixPath).substring(0, 12);
    }

    static deepEqual(a: any, b: any): boolean {
        return deepEqual(a, b);
    }

    static shallowEqual(a: any, b: any) {
        const allKeys = _.union(Object.keys(a), Object.keys(b));
        for (const key of allKeys) {
            if (a[key] !== b[key]) return false;
        }
        return true;
    }

    static getShallowDiffKeys(a: any, b: any) {
        const allKeys = _.union(Object.keys(a), Object.keys(b));
        // @ts-ignore
        return allKeys.filter(key => a[key] !== b[key]);
    }

    static printShallowObjectDiffs(a: any, b: any, id = '', keys: string[] | null = null) {
        if (!keys) keys = Util.getShallowDiffKeys(a, b);
        keys.map(key => {
            const diff = detailedDiff(a[key], b[key]);
            console.log(
                // @ts-ignore
                id, 'Changed property:', key, 'updated:', diff.updated, 'added:', diff.added, 'deleted:', diff.deleted,
            );
            return null;
        });
    }

    static getDeepDiffKeys(a: any, b: any) {
        const allKeys = _.union(Object.keys(a), Object.keys(b));
        return allKeys.filter(key => !deepEqual(a[key], b[key]));
    }

    static printDeepObjectDiffs(a: any, b: any, id = '', keys: string[] | null = null) {
        if (!keys) keys = Util.getDeepDiffKeys(a, b);
        keys.map(key => {
            const diff = detailedDiff(a[key], b[key]);
            console.log(
                // @ts-ignore
                id, 'Changed property:', key, 'updated:', diff.updated, 'added:', diff.added, 'deleted:', diff.deleted,
            );
            return null;
        });
    }

    static sortFiles(unsortedFiles: File[], options: any) {
        let files = unsortedFiles;
        if (!options[ExplorerOptions.ShowHidden]) {
            files = _.filter(files, f => !f.base.startsWith('.'));
        }
        const compare = (fileA: File, fileB: File) => {
            if (options[ExplorerOptions.FoldersFirst]) {
                if (fileA.isDir && !fileB.isDir) return -1;
                if (!fileA.isDir && fileB.isDir) return 1;
            }

            if (options[ExplorerOptions.SortOrder] === SortOrder.NameAsc) {
                return fileA.base.localeCompare(fileB.base);
            } else {
                return fileA.base.localeCompare(fileB.base) * -1;
            }
        };
        files.sort(compare);
        return files;
    };

    /**
     * Takes union of 2 arrays generating an array of unique values. Assumes the first array is sorted.
     *
     * @param longSortedArray
     * @param shortSortedArray
     */
    static unionSorted(longSortedArray: string[], shortSortedArray: string[]): string[] {
        if (shortSortedArray.length === 0) return longSortedArray;

        const queue = new Denque();
        const startIndex = _.sortedIndex(longSortedArray, shortSortedArray[0]);
        for (let i = 0; i < startIndex; ++i) queue.push(longSortedArray[i]);

        let indexA = startIndex;
        let indexB = 0;
        while (indexA < longSortedArray.length || indexB < shortSortedArray.length) {
            if (indexA >= longSortedArray.length) {
                queue.push(shortSortedArray[indexB]);
                indexB++;
            } else if (indexB >= shortSortedArray.length) {
                queue.push(longSortedArray[indexA]);
                indexA++;
            } else {
                const elemA = longSortedArray[indexA];
                const elemB = shortSortedArray[indexB];
                const comparison = elemA.localeCompare(elemB);
                if (comparison > 0) {
                    queue.push(elemB);
                    indexB++;
                } else if (comparison < 0) {
                    queue.push(elemA);
                    indexA++;
                } else {
                    // elemA and elemB are equal
                    queue.push(elemA);
                    indexA++;
                    indexB++;
                }
            }
        }

        return queue.toArray();
    }

    static removeSorted(sortedArraySource: string[], sortedArrayToRemove: string[]): string[] {
        // TODO: Speed this whole thing up using smarter binary search
        const removeIndexQueue = new Denque();
        sortedArrayToRemove.map(str => {
            const index = _.sortedIndex(sortedArraySource, str);
            if (sortedArraySource[index] === str) removeIndexQueue.push(index);
            return null;
        });
        if (removeIndexQueue.length === 0) return sortedArraySource;

        const newArray = sortedArraySource.slice(0);
        _.pullAt(newArray, removeIndexQueue.toArray());
        return newArray;
    }

}
