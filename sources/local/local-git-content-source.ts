import type { InitOptions } from '@stackbit/types';
import { GitContentSource, type GitContentSourceOptions } from '@stackbit/cms-git';
import type { DocumentContext, AssetContext } from '@stackbit/cms-git/dist/content-converter';

/**
 * Custom Git content source that disables remote syncing during Netlify builds.
 *
 * The default GitContentSource will push commits back to the repository when
 * running in a non-local environment. When Netlify clones the site from the
 * starter template, those pushes fail if the remote already contains
 * additional commits (for example, project-specific customizations).
 *
 * By overriding `init` and forcing `syncRemote` to false, we ensure Netlify
 * treats the content source as read-only during builds so it no longer
 * attempts to push to the remote repository.
 */
export class LocalOnlyGitContentSource extends GitContentSource {
    constructor(options: GitContentSourceOptions) {
        super(options);
    }

    async init(options: InitOptions<unknown, DocumentContext, AssetContext>): Promise<void> {
        await super.init(options);
        // Disable remote sync to avoid git push attempts in the build environment.
        (this as unknown as { syncRemote: boolean }).syncRemote = false;
    }
}

export type { GitContentSourceOptions };
