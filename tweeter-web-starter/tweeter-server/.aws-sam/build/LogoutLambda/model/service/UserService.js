"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
// AI-assisted: see AI-ATTRIBUTION.md
const tweeter_shared_1 = require("tweeter-shared");
const bcryptjs_1 = require("bcryptjs");
const node_crypto_1 = require("node:crypto");
const AuthorizationService_1 = require("./AuthorizationService");
const ProfileImage_1 = require("../domain/ProfileImage");
class UserService {
    daoFactory;
    constructor(daoFactory) {
        this.daoFactory = daoFactory;
    }
    // AI-assisted: see AI-ATTRIBUTION.md
    async getUser(token, alias) {
        await new AuthorizationService_1.AuthorizationService(this.daoFactory).authenticate(token);
        return this.daoFactory.getUserDAO().getUserByAlias(alias);
    }
    ;
    // AI-assisted: see AI-ATTRIBUTION.md
    logout = async (token) => {
        await new AuthorizationService_1.AuthorizationService(this.daoFactory).authenticate(token);
        await this.daoFactory.getAuthTokenDAO().deleteAuthToken(token);
    };
    // AI-assisted: see AI-ATTRIBUTION.md
    async login(alias, password) {
        // bcrypt compares at most 72 UTF-8 bytes; do not silently accept a suffix.
        if (Buffer.byteLength(password, "utf8") > 72) {
            throw new Error("unauthorized: Invalid alias or password");
        }
        const userDAO = this.daoFactory.getUserDAO();
        const passwordHash = await userDAO.getPasswordHash(alias);
        if (passwordHash === null || !await (0, bcryptjs_1.compare)(password, passwordHash)) {
            throw new Error("unauthorized: Invalid alias or password");
        }
        const user = await userDAO.getUserByAlias(alias);
        if (user === null) {
            throw new Error("internal-server-error: User profile unavailable");
        }
        return [user, await this.issueSession(user.alias)];
    }
    // AI-assisted: see AI-ATTRIBUTION.md
    async issueSession(userAlias) {
        const tokenDAO = this.daoFactory.getAuthTokenDAO();
        //Just exists to make sure that if we generate the same token on the VERY off chance, we try again.
        for (let attempt = 0; attempt < 3; attempt++) {
            // Use cryptographic randomness directly; never fall back to Math.random.
            const token = (0, node_crypto_1.randomBytes)(32).toString("hex");
            const timestamp = Date.now();
            const created = await tokenDAO.createAuthToken({
                token,
                userAlias,
                lastActiveTimestamp: timestamp,
            });
            // Return only after persistence succeeds. Retry only an actual collision.
            if (created)
                return new tweeter_shared_1.AuthToken(token, timestamp);
        }
        throw new Error("internal-server-error: Unable to create session");
    }
    // AI-assisted: see AI-ATTRIBUTION.md
    async register(firstName, lastName, alias, password, imageStringBase64, imageFileExtension) {
        const userDAO = this.daoFactory.getUserDAO();
        if (await userDAO.getUserByAlias(alias) !== null) {
            throw new Error("bad-request: Alias already registered");
        }
        if (Buffer.byteLength(password, "utf8") > 72) {
            throw new Error("bad-request: Password must not exceed 72 UTF-8 bytes");
        }
        const image = (0, ProfileImage_1.decodeProfileImage)(imageStringBase64, imageFileExtension);
        const imageDAO = this.daoFactory.getImageDAO();
        const passwordHash = await (0, bcryptjs_1.hash)(password, 10);
        const storedImage = await imageDAO.uploadImage(image);
        const user = new tweeter_shared_1.User(firstName, lastName, alias, storedImage.url);
        // The precheck avoids ordinary duplicate uploads; the atomic write handles races.
        // On a thrown storage error, the write outcome may be unknown: retain the image.
        const created = await userDAO.createUser(user, passwordHash);
        if (!created) {
            try {
                await imageDAO.deleteImage(storedImage.id);
            }
            catch (error) {
                throw new Error("internal-server-error: Duplicate registration image cleanup failed", { cause: error });
            }
            throw new Error("bad-request: Alias already registered");
        }
        // Once saved, keep the account/photo if session issuance fails; login can retry.
        return [user, await this.issueSession(user.alias)];
    }
}
exports.UserService = UserService;
