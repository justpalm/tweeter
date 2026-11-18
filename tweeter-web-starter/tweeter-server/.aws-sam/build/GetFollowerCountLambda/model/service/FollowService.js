"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowService = void 0;
const tweeter_shared_1 = require("tweeter-shared");
class FollowService {
    getIsFollowerStatus = async (authToken, user, selectedUser) => {
        // TODO: Replace with the result of calling server
        return tweeter_shared_1.FakeData.instance.isFollower();
    };
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
    follow = async (authToken, userToFollow) => {
        // Pause so we can see the follow message. Remove when connected to the server
        await new Promise((f) => setTimeout(f, 2000));
        // TODO: Call the server
        const followerCount = await this.getFollowerCount(authToken.token, userToFollow.alias);
        const followeeCount = await this.getFolloweeCount(authToken.token, userToFollow.alias);
        return [followerCount, followeeCount];
    };
    unfollow = async (authToken, userToUnfollow) => {
        // Pause so we can see the unfollow message. Remove when connected to the server
        await new Promise((f) => setTimeout(f, 2000));
        // TODO: Call the server
        const followerCount = await this.getFollowerCount(authToken.token, userToUnfollow.alias);
        const followeeCount = await this.getFolloweeCount(authToken.token, userToUnfollow.alias);
        return [followerCount, followeeCount];
    };
}
exports.FollowService = FollowService;
