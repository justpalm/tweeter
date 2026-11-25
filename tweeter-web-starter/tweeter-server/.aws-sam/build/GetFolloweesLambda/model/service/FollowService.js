"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowService = void 0;
const AuthorizationService_1 = require("./AuthorizationService");
class FollowService {
    daoFactory;
    constructor(daoFactory) {
        this.daoFactory = daoFactory;
    }
    async isFollowing(token, followerAlias, followeeAlias) {
        const actor = await new AuthorizationService_1.AuthorizationService(this.daoFactory).authenticate(token);
        if (followerAlias !== actor)
            throw new Error("unauthorized: Follower must match the session owner");
        return actor === followeeAlias ? false : this.daoFactory.getFollowDAO().isFollowing(actor, followeeAlias);
    }
    async getFollowerCount(token, userAlias) {
        await new AuthorizationService_1.AuthorizationService(this.daoFactory).authenticate(token);
        return (await this.requireCounts(userAlias)).followerCount;
    }
    async getFolloweeCount(token, userAlias) {
        await new AuthorizationService_1.AuthorizationService(this.daoFactory).authenticate(token);
        return (await this.requireCounts(userAlias)).followeeCount;
    }
    loadMoreFollowers(token, userAlias, pageSize, lastItem) {
        return this.loadPage(token, userAlias, pageSize, lastItem, true);
    }
    loadMoreFollowees(token, userAlias, pageSize, lastItem) {
        return this.loadPage(token, userAlias, pageSize, lastItem, false);
    }
    async loadPage(token, userAlias, pageSize, lastItem, followers) {
        await new AuthorizationService_1.AuthorizationService(this.daoFactory).authenticate(token);
        if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
            throw new Error("bad-request: Page size must be an integer from 1 to 100");
        }
        await this.requireUser(userAlias);
        const dao = this.daoFactory.getFollowDAO();
        const afterAlias = lastItem?.alias ?? null;
        const page = await (followers ? dao.getFollowers(userAlias, pageSize, afterAlias)
            : dao.getFollowees(userAlias, pageSize, afterAlias));
        const users = await Promise.all(page.aliases.map(async (alias) => {
            const user = await this.daoFactory.getUserDAO().getUserByAlias(alias);
            // Do not silently drop rows: that could lose the client's pagination boundary.
            if (user === null)
                throw new Error("internal-server-error: Follow profile unavailable");
            return user.dto;
        }));
        return [users, page.hasMore];
    }
    follow(token, userAlias) {
        return this.changeFollowStatus(token, userAlias, true);
    }
    unfollow(token, userAlias) {
        return this.changeFollowStatus(token, userAlias, false);
    }
    async changeFollowStatus(token, target, adding) {
        const actor = await new AuthorizationService_1.AuthorizationService(this.daoFactory).authenticate(token);
        if (actor === target)
            throw new Error("bad-request: Cannot follow or unfollow yourself");
        await Promise.all([this.requireUser(actor), this.requireUser(target)]);
        const dao = this.daoFactory.getFollowDAO();
        const changed = await (adding ? dao.follow(actor, target) : dao.unfollow(actor, target));
        if (!changed)
            throw new Error(adding ? "bad-request: Already following user" : "bad-request: Not following user");
        // The existing response displays BOTH counts for the target user's profile.
        const counts = await this.requireCounts(target);
        return [counts.followerCount, counts.followeeCount];
    }
    async requireUser(alias) {
        const user = await this.daoFactory.getUserDAO().getUserByAlias(alias);
        if (user === null)
            throw new Error("bad-request: User not found");
        return user;
    }
    async requireCounts(alias) {
        const counts = await this.daoFactory.getFollowDAO().getCounts(alias);
        if (counts === null)
            throw new Error("bad-request: User not found");
        return counts;
    }
}
exports.FollowService = FollowService;
