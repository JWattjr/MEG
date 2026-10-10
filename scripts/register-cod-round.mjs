import { cli } from './operator-common.mjs';
import { registerRound } from './register-round-common.mjs';

cli(import.meta.url, () => registerRound('cod', process.argv.slice(2)));
