"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
// AI-assisted: see AI-ATTRIBUTION.md
const tweeter_shared_1 = require("tweeter-shared");
class UserService {
    daoFactory;
    constructor(daoFactory) {
        this.daoFactory = daoFactory;
    }
    // AI-assisted: see AI-ATTRIBUTION.md
    async getUser(token, alias) {
        // Session verification remains pending until AuthTokenDAO is implemented.
        return this.daoFactory.getUserDAO().getUserByAlias(alias);
    }
    ;
    // AI-assisted: see AI-ATTRIBUTION.md
    logout = async (token) => {
        // Milestone 3 acknowledges logout; persistent token invalidation comes later.
    };
    // AI-assisted: see AI-ATTRIBUTION.md
    async login(alias, password) {
        // Milestone 3 returns dummy data; credential verification comes later.
        const user = tweeter_shared_1.FakeData.instance.firstUser;
        if (user === null) {
            throw new Error("internal-server-error: Login user data unavailable");
        }
        return [user, tweeter_shared_1.FakeData.instance.authToken];
    }
    // AI-assisted: see AI-ATTRIBUTION.md
    async register(firstName, lastName, alias, password, imageStringBase64, imageFileExtension) {
        // Milestone 3 returns dummy data; account/image persistence comes later.
        const user = tweeter_shared_1.FakeData.instance.firstUser;
        if (user === null) {
            throw new Error("internal-server-error: Invalid registration");
        }
        return [user, tweeter_shared_1.FakeData.instance.authToken];
    }
}
exports.UserService = UserService;
