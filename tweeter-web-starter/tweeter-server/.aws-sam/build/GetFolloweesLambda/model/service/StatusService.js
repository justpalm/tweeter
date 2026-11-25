"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusService = void 0;
const AuthorizationService_1 = require("./AuthorizationService");
class StatusService {
    daoFactory;
    now;
    constructor(daoFactory, now = () => Date.now()) {
        this.daoFactory = daoFactory;
        this.now = now;
    }
    loadMoreStoryItems(token, userAlias, pageSize, lastItem) {
        return this.loadPage(token, userAlias, pageSize, lastItem, true);
    }
    loadMoreFeedItems(token, userAlias, pageSize, lastItem) {
        return this.loadPage(token, userAlias, pageSize, lastItem, false);
    }
    async loadPage(token, userAlias, pageSize, lastItem, story) {
        const sessionOwner = await new AuthorizationService_1.AuthorizationService(this.daoFactory).authenticate(token);
        if (!story && userAlias !== sessionOwner) {
            throw new Error("unauthorized: Feed must belong to the authenticated user");
        }
        if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
            throw new Error("bad-request: Page size must be an integer from 1 to 100");
        }
        await this.requireUser(userAlias);
        if (story && lastItem && lastItem.user.alias !== userAlias) {
            throw new Error("bad-request: Story cursor must belong to the requested author");
        }
        const after = lastItem === null ? null
            : { authorAlias: lastItem.user.alias, timestamp: lastItem.timestamp };
        const page = await (story ? this.daoFactory.getStoryDAO().getStory(userAlias, pageSize, after)
            : this.daoFactory.getFeedDAO().getFeed(userAlias, pageSize, after));
        return [page.items, page.hasMore];
    }
    async postStatus(token, newStatus) {
        const authorAlias = await new AuthorizationService_1.AuthorizationService(this.daoFactory).authenticate(token);
        const author = await this.requireUser(authorAlias);
        if (typeof newStatus.post !== "string" || !newStatus.post.trim()) {
            throw new Error("bad-request: Post must not be blank");
        }
        // Bound the materialized record comfortably below DynamoDB's item limit.
        if (Buffer.byteLength(newStatus.post, "utf8") > 10_000) {
            throw new Error("bad-request: Post must not exceed 10000 UTF-8 bytes");
        }
        // Freeze this request's recipients before writing. Follow/unfollow never
        // backfill or delete feed rows; concurrent relationship changes are not a snapshot.
        const recipients = await this.daoFactory.getFollowDAO().getPostingFollowers(authorAlias);
        const story = this.daoFactory.getStoryDAO();
        const feed = this.daoFactory.getFeedDAO();
        let status = { post: newStatus.post, user: author.dto, timestamp: this.now() };
        for (let attempt = 0; attempt < 10; attempt++) {
            if (await story.createStatus(status)) {
                // Synchronous 4A delivery. A failure can leave the story and some feed
                // copies saved; a new HTTP submission is a new post, not an idempotent retry.
                await feed.addToFeeds(recipients, status);
                return;
            }
            // Conditional insertion handles concurrent posts from the same author.
            // Feed ties between different authors are resolved by the author key.
            status = { ...status, timestamp: status.timestamp + 1 };
        }
        throw new Error("internal-server-error: Posting timestamp busy; please retry");
    }
    async requireUser(alias) {
        const user = await this.daoFactory.getUserDAO().getUserByAlias(alias);
        if (!user)
            throw new Error("bad-request: User not found");
        return user;
    }
}
exports.StatusService = StatusService;
