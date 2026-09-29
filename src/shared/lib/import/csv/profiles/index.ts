import { genericProfile } from "./generic";
import type { CsvBankProfile } from "./types";
import { xpAccountProfile } from "./xp-account";
import { xpCardProfile } from "./xp-card";

// Ordem importa: o primeiro perfil cujo cabeçalho bate é usado.
// Perfis específicos de banco sempre antes do genérico.
export const CSV_BANK_PROFILES: CsvBankProfile[] = [
	xpCardProfile,
	xpAccountProfile,
	genericProfile,
];
