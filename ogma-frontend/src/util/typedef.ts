/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2019
 * @license GPL-3.0
 */

import React from 'react';
import PropTypes from 'prop-types';
import {EventEmitter2} from 'eventemitter2';
import {EnhancedStore} from 'redux-starter-kit';

import IpcModule from './IpcModule';
import BackendTypedef from '../util/backend-typedef';
import {AppState, ReduxAction} from '../redux/ReduxTypedef';

declare global {
    // noinspection JSUnusedGlobalSymbols
    interface Window {
        ipcModule: IpcModule,
        isDevelopment: boolean;
        proxyEmitter: EventEmitter2,
        store: EnhancedStore<AppState, ReduxAction>,

        handleError: (error: Error) => void,
    }
}

export enum BackendEvents {
    AddConnection = 'add-conn',
    RemoveConnection = 'remove-conn',

    CreateEnvironment = 'create-env',
    CloseEnvironment = 'close-env',
    EnvUpdateSummary = 'env-upd-summary',

    EnvAddEntities = 'env-add-ent',
    EnvRemoveEntities = 'env-remove-ent',
    EnvUpdateEntities = 'env-upd-ent',

    EnvUpdateFiles = 'env-update-files',
    EnvRemoveFiles = 'env-remove-files',
    EnvUpdateThumbs = 'env-thumb-updates',

    EnvAddTags = 'env-add-tags',
    EnvUpdateTags = 'env-update-tags',
    EnvRemoveTags = 'env-remove-tags',
    EnvTagFiles = 'env-tag-files',
    EnvUntagFiles = 'env-untag-files',

    EnvUpdateSinkTree = 'env-update-sink-tree',
}

export const IndexRoutePath = '/';

export const BulmaSizes = ['small', 'medium', 'large'];

export const EnvironmentContext = React.createContext(null);

export const EnvRoutePaths = {
    browse: '/browse',
    search: '/search',
    tags: '/tags',
    sinks: '/sinks',
    configure: '/configure',
};
export const DefaultEnvRoutePath = EnvRoutePaths.browse;

export const EnvSummaryPropType = PropTypes.shape({
    id: PropTypes.string,
    path: PropTypes.string,
    slug: PropTypes.string,
    name: PropTypes.string,
    icon: PropTypes.string,
    color: PropTypes.string,
});

export enum MenuIds {
    TabBrowse = 'browse-menu',
    TabSearch = 'search',
    TabSinks = 'sinks',
}

/**
 * @enum {number} FileView
 */
export enum FileView {
    List = 0,
    MediumThumb = 1,
    LargeThumb = 2,
    EnumMax = 3, // Used in for loops and such
}

export const DefaultFileView = FileView.MediumThumb;
export const FileViewToClass = (view: FileView) => {
    let className = '';
    if (view === FileView.List) className = 'view-list';
    else {
        className = 'view-thumb ';
        if (view === FileView.MediumThumb) className += 'medium-thumb';
        if (view === FileView.LargeThumb) className += 'large-thumb';
    }
    return className;
};

export const SortOrder = {
    NameAsc: 'name-asc',
    NameDesc: 'name-desc',
};

export const ExplorerOptions = {
    SortOrder: 'sort-order',
    FileView: 'file-view',
    ShowPreview: 'show-preview',
    CollapseLongNames: 'collapse-names',
    FoldersFirst: 'folders-first',
    ShowExtensions: 'show-exts',
    ShowHidden: 'show-hidden',
    ConfirmDeletions: 'confirm-deletions',
};

export const ExplorerOptionsDefaults = {
    [ExplorerOptions.SortOrder]: SortOrder.NameAsc,
    [ExplorerOptions.FileView]: FileView.MediumThumb,
    [ExplorerOptions.ShowPreview]: false,
    [ExplorerOptions.CollapseLongNames]: false,
    [ExplorerOptions.FoldersFirst]: true,
    [ExplorerOptions.ShowExtensions]: true,
    [ExplorerOptions.ShowHidden]: true,
    [ExplorerOptions.ConfirmDeletions]: true,
};

export const TagSearchCondition = {
    All: 1,
    Any: 2,
};
export const DefaultTagSearchCondition = TagSearchCondition.All;

export const FilePropType = PropTypes.shape({
    hash: PropTypes.string,
    nixPath: PropTypes.string,
    base: PropTypes.string,
    ext: PropTypes.string,
    name: PropTypes.string,
    isDir: PropTypes.bool,
    thumb: PropTypes.number,
    entityId: PropTypes.string,
    tagIds: PropTypes.arrayOf(PropTypes.string),
});

export const KeyCode = {
    Backspace: 8,
    Enter: 13,
    Esc: 27,
    ArrowUp: 38,
    ArrowDown: 40,
    A: 65,
    C: 67,
};

export enum ThumbnailState {
    Impossible = 0,
    Possible = 1,
    Ready = 2,
}

// Reexporting parts of backend typedef
export const EnvProperty = BackendTypedef.EnvProperty;

export const Colors = BackendTypedef.Colors;
export const ColorsLight = BackendTypedef.ColorsLight;
export const ColorsDark = BackendTypedef.ColorsDark;

export const FileErrorStatus = BackendTypedef.FileErrorStatus;

export const VideoExtensions = BackendTypedef.VideoExtensions;
export const ImageExtensions = BackendTypedef.ImageExtensions;
export const AudioExtensions = BackendTypedef.AudioExtensions;


