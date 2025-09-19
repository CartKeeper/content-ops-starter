declare global {
    interface Window {
        Dropbox?: {
            choose: (options: DropboxChooseOptions) => void;
        };
    }
}

export type DropboxChooserFile = {
    id: string;
    name: string;
    link: string;
    bytes: number;
    icon: string;
    thumbnailLink?: string;
    isDir?: boolean;
    client_modified?: string;
    server_modified?: string;
    path_lower?: string;
    path_display?: string;
    [key: string]: unknown;
};

export type DropboxChooserLinkType = 'preview' | 'direct';

export type DropboxChooseOptions = {
    success: (files: DropboxChooserFile[]) => void;
    cancel?: () => void;
    linkType?: DropboxChooserLinkType;
    multiselect?: boolean;
    folderselect?: boolean;
    extensions?: string[];
    sizeLimit?: number;
};

export {};
