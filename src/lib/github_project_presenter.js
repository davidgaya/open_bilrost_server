/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

function GithubProjectPresenter (repo) {
    this.repo = repo;

    this.present = () => {
        let response = {
            id: this.repo.id,
            name: this.repo.name,
            full_name: this.repo.full_name,
            owner: {
                id: this.repo.owner.id,
                login: this.repo.owner.login,
                type: this.repo.owner.type,
                site_admin: this.repo.owner.site_admin,
            },
            private: this.repo.private,
            description: {
                type: this.repo.description.type,
                tags: this.repo.description.tags,
                comment: this.repo.description.comment,
                host_vcs: this.repo.description.host_vcs,
                svn_url: this.repo.description.svn_url,
                settings: this.repo.description.settings,
                Version: this.repo.description.Version,
            },
            created_at: this.repo.created_at,
            updated_at: this.repo.updated_at,
            pushed_at: this.repo.pushed_at,
            size: this.repo.size,
            url: this.repo.url,
            ssh_url: this.repo.ssh_url,
            https_url: this.repo.html_url,
            permissions: {
                pull: this.repo.permissions.pull,
                push: this.repo.permissions.push,
                admin: this.repo.permissions.admin
            },
            branches_url: this.repo.branches_url,
            resources_url: this.repo.resources_url,
            assets_url: this.repo.assets_url,
        };

        return response;
    };
}

module.exports = GithubProjectPresenter;
