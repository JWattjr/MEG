import { cli } from './operator-common.mjs';
import { registerRound } from './register-round-common.mjs';

// v2 only; the shared preflight requires its NEW source-verified public address.
// Existing v1 registrations and the original fixture are never changed here.
cli(import.meta.url, () => registerRound('valorant', process.argv.slice(2)));
