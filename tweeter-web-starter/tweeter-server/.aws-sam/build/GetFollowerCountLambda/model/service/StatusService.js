"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusService = void 0;
// AI-assisted: see AI-ATTRIBUTION.md
const tweeter_shared_1 = require("tweeter-shared");
const FakeData_1 = require("tweeter-shared/dist/util/FakeData");
class StatusService {
    async loadMoreStoryItems(token, userAlias, pageSize, lastItem) {
        // Milestone 3 dummy pagination; token verification and alias filtering come later.
        const [items, hasMore] = FakeData_1.FakeData.instance.getPageOfStatuses(tweeter_shared_1.Status.fromDto(lastItem), pageSize);
        return [items.map(item => item.dto), hasMore];
    }
    ;
    async loadMoreFeedItems(token, userAlias, pageSize, lastItem) {
        // Milestone 3 dummy pagination; token verification and alias filtering come later.
        const [items, hasMore] = FakeData_1.FakeData.instance.getPageOfStatuses(tweeter_shared_1.Status.fromDto(lastItem), pageSize);
        return [items.map(item => item.dto), hasMore];
    }
    ;
    postStatus = async (token, newStatus) => {
        // Milestone 3 acknowledges the post without persistence or session verification.
        // Feed and story dummy data remain unchanged.
    };
}
exports.StatusService = StatusService;
;
