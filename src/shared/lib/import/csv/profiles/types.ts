import type { ImportedTransaction } from "@/shared/lib/import/types";

// Um perfil descreve o CSV de um banco específico (ou o formato genérico).
// Para suportar um banco novo: criar um arquivo nesta pasta e registrá-lo em
// profiles/index.ts, antes do perfil genérico.
export type CsvBankProfile = {
	id: string;
	label: string;
	// Nome curto do banco, usado para pré-selecionar a conta/cartão com esse nome
	bankName: string | null;
	isCreditCard: boolean;
	// Recebe os cabeçalhos já normalizados (normalizeHeader)
	matches: (headers: string[]) => boolean;
	// Converte as linhas de dados (sem o cabeçalho) em transações.
	// Linhas inválidas devem ser ignoradas; ids repetidos são tratados depois.
	parse: (headers: string[], rows: string[][]) => ImportedTransaction[];
};

export function hasHeaders(headers: string[], expected: string[]): boolean {
	return expected.every((name) => headers.includes(name));
}

export function columnIndex(headers: string[], name: string): number {
	return headers.indexOf(name);
}
