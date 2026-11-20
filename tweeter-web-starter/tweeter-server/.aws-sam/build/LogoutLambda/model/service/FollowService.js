"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowService = void 0;
const tweeter_shared_1 = require("tweeter-shared");
class FollowService {
    async isFollowing(token, followerAlias, followeeAlias) {
        // Milestone 3 dummy data; persistence will use the aliases later.
        return tweeter_shared_1.FakeData.instance.isFollower();
    }
    getFolloweeCount = async (token, userAlias) => {
        return tweeter_shared_1.FakeData.instance.getFolloweeCount(userAlias);
    };
    getFollowerCount = async (token, userAlias) => {
        return tweeter_shared_1.FakeData.instance.getFollowerCount(userAlias);
    };
    async loadMoreFollowers(token, userAlias, pageSize, lastItem) {
        // TODO: Replace with the result of calling server
        return this.getFakeData(lastItem, pageSize, userAlias);
    }
    async loadMoreFollowees(token, userAlias, pageSize, lastItem) {
        // TODO: Replace with the result of calling server
        return this.getFakeData(lastItem, pageSize, userAlias);
    }
    async getFakeData(lastItem, pageSize, userAlias) {
        const [items, hasMore] = tweeter_shared_1.FakeData.instance.getPageOfUsers(tweeter_shared_1.User.fromDto(lastItem), pageSize, userAlias);
        const dtos = items.map((user) => user.dto);
        return [dtos, hasMore];
    }
    async follow(token, userAlias) {
        // Milestone 3 returns dummy counts; persisting the follow is a later milestone.
        const followerCount = await this.getFollowerCount(token, userAlias);
        const followeeCount = await this.getFolloweeCount(token, userAlias);
        return [followerCount, followeeCount];
    }
    async unfollow(token, userAlias) {
        // Milestone 3 returns dummy counts; persisting the unfollow is a later milestone.
        const followerCount = await this.getFollowerCount(token, userAlias);
        const followeeCount = await this.getFolloweeCount(token, userAlias);
        return [followerCount, followeeCount];
    }
}
exports.FollowService = FollowService;
