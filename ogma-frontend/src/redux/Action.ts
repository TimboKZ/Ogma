/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import {Client, File, EnvSummary, Tag, TagOrderField} from './ReduxTypedef';

export enum ActionTypes {
    SetClientDetails = 'set-client-details',
    SetClientList = 'set-client-list',
    AddConnection = 'add-conn',
    RemoveConnection = 'remove-conn',

    CloseEnvironment = 'close-env',

    SetSummaries = 'set-summaries',
    UpdateSummary = 'update-summary',
    UpdateSubRoute = 'update-sub-route',

    SetAllTags = 'set-all-tags',
    UpdateTags = 'update-tags',
    RemoveTags = 'remove-tags',
    TagFiles = 'tag-files',
    UntagFiles = 'untag-files',

    SetAllEntities = 'set-all-entities',
    UpdateEntities = 'update-entities',
    RemoveEntities = 'remove-entities',

    UpdateFiles = 'update-files',
    RemoveFiles = 'remove-files',
    UpdateDirectory = 'update-directory',
    UpdateThumbStates = 'update-thumb-state',

    SetSinkTree = 'set-sink-tree',
    ApplySinkTreeDiff = 'apply-sink-tree-diff',

    TabBrowseChangePath = 'browse-change-path',
    TabSearchChangeTagSelection = 'search-change-selection',
    TabSearchChangeTagSearchCondition = 'search-change-tag-cond',
    TabSearchChangeTagFilter = 'search-change-tag-filter',
    TabTagsSelectTagId = 'tags-select-tag-id',
    TabTagsChangeTagFilter = 'tags-change-tag-filter',
    TabTagsChangeTagOrderField = 'tags-change-tag-order-field',
}

const getStore = () => window.store;
const dispatchAction = (...args: any[]) => {
    const type = args[0];
    let envId;
    let payload;
    if (args.length === 2) {
        payload = args[1];
    } else {
        envId = args[1];
        payload = args[2];
    }
    getStore().dispatch({type, envId, payload});
};

export class TabBrowseDispatcher {


    static changePath(envId: string, newPath: string) {
        dispatchAction(ActionTypes.TabBrowseChangePath, envId, newPath);
    }

}

export class TabSearchDispatcher {

    static changeTagFilter(envId: string, tagFilter: string) {
        dispatchAction(ActionTypes.TabSearchChangeTagFilter, envId, tagFilter);
    }

    static changeTagSelection(envId: string, tagSelection: { tagId: string, selected: boolean }) {
        dispatchAction(ActionTypes.TabSearchChangeTagSelection, envId, tagSelection);
    }

    static changeTagSearchCondition(envId: string, conditionId: number) {
        dispatchAction(ActionTypes.TabSearchChangeTagSearchCondition, envId, conditionId);
    }

}

export class TabTagsDispatcher {

    static selectTagId(envId: string, tagId: string) {
        dispatchAction(ActionTypes.TabTagsSelectTagId, envId, tagId);
    }

    static changeTagFilter(envId: string, tagFilter: string) {
        dispatchAction(ActionTypes.TabTagsChangeTagFilter, envId, tagFilter);
    }

    static changeTagOrderField(envId: string, tagOrderField: TagOrderField) {
        dispatchAction(ActionTypes.TabTagsChangeTagOrderField, envId, tagOrderField);
    }

}

export class Dispatcher {

    static setClientDetails(clientDetails: Client) {
        dispatchAction(ActionTypes.SetClientDetails, clientDetails);
    }

    static setClientList(clientList: Client[]) {
        dispatchAction(ActionTypes.SetClientList, clientList);
    }

    static addConnection(clientDetails: Client) {
        dispatchAction(ActionTypes.AddConnection, clientDetails);
    }

    static removeConnection(clientId: Client) {
        dispatchAction(ActionTypes.RemoveConnection, clientId);
    }

    static setSummaries(summaries: EnvSummary[]) {
        dispatchAction(ActionTypes.SetSummaries, summaries);
    }

    static closeEnvironment(envId: string) {
        dispatchAction(ActionTypes.CloseEnvironment, envId);
    }

}

export class EnvDispatcher {

    static updateSummary(envId: string, summary: EnvSummary) {
        dispatchAction(ActionTypes.UpdateSummary, envId, summary);
    }

    static updateSubRoute(envId: string, subRoute: string) {
        dispatchAction(ActionTypes.UpdateSubRoute, envId, subRoute);
    }

    static setAllTags(envId: string, tags: Tag[]) {
        dispatchAction(ActionTypes.SetAllTags, envId, tags);
    }

    static updateTags(envId: string, tags: Tag[]) {
        dispatchAction(ActionTypes.UpdateTags, envId, tags);
    }

    static removeTags(envId: string, tagIds: string[]) {
        dispatchAction(ActionTypes.RemoveTags, envId, tagIds);
    }

    /**
     * @param {string} envId
     * @param {DBSlimEntity[]} entities
     * @param {string[]} tagIds
     */
    static tagFiles(envId: string, entities: any[], tagIds: string[]) {
        dispatchAction(ActionTypes.TagFiles, envId, {entities, tagIds});
    }

    static untagFiles(envId: string, entityIds: string[], tagIds: string[]) {
        dispatchAction(ActionTypes.UntagFiles, envId, {entityIds, tagIds});
    }

    /**
     * @param {string} envId
     * @param {DBSlimEntity[]} entities
     */
    static setAllEntities(envId: string, entities: any[]) {
        dispatchAction(ActionTypes.SetAllEntities, envId, entities);
    }

    /**
     * @param {string} envId
     * @param {DBSlimEntity[]} entities
     */
    static updateEntities(envId: string, entities: any[]) {
        dispatchAction(ActionTypes.UpdateEntities, envId, entities);
    }

    static removeEntities(envId: string, entityIds: string[]) {
        dispatchAction(ActionTypes.RemoveEntities, envId, entityIds);
    }

    static updateDirectory(envId: string, dirFile: File, fileHashes: string[] | null = null) {
        dispatchAction(ActionTypes.UpdateDirectory, envId, {dirFile, fileHashes});
    }

    static updateFiles(envId: string, files: File[]) {
        dispatchAction(ActionTypes.UpdateFiles, envId, files);
    }

    static removeFiles(envId: string, hashes: string[]) {
        dispatchAction(ActionTypes.RemoveFiles, envId, hashes);
    }

    /**
     * @param {string} envId
     * @param {object[]} thumbs
     * @param {ThumbnailState} thumbState
     */
    static updateThumbStates(envId: string, thumbs: any[], thumbState: any) {
        dispatchAction(ActionTypes.UpdateThumbStates, envId, {thumbs, thumbState});
    }

    static setSinkTree(envId: string, sinkTreeSnapshot: any) {
        // TODO: Set `sinkTreeSnapshot` type
        dispatchAction(ActionTypes.SetSinkTree, envId, sinkTreeSnapshot);
    }

    static applySinkTreeDiff(envId: string, delta: any) {
        dispatchAction(ActionTypes.ApplySinkTreeDiff, envId, delta);
    }

}


