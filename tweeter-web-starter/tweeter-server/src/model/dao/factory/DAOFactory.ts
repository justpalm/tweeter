// AI-assisted: see AI-ATTRIBUTION.md
import type { UserDAO } from "../UserDAO";

/** Supplies database-independent DAOs to services. Expand as more DAOs are added. */
export interface DAOFactory {
  getUserDAO(): UserDAO;
}
