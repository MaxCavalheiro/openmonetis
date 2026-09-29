import { ensureUniqueExternalIds } from "@/shared/lib/import/external-id";
import type { ImportStatement } from "@/shared/lib/import/types";
import { decodeCsvBuffer, normalizeHeader, parseCsvRows } from "./csv-reader";
import { CSV_BANK_PROFILES } from "./profiles";

export function parseCsv(buffer: ArrayBuffer): ImportStatement {
	const rows = parseCsvRows(decodeCsvBuffer(buffer));
	if (rows.length < 2) {
		throw new Error("Arquivo CSV vazio ou sem linhas de dados.");
	}

	const [headerRow, ...dataRows] = rows;
	const headers = headerRow.map(normalizeHeader);
	const profile = CSV_BANK_PROFILES.find((p) => p.matches(headers));

	if (!profile) {
		throw new Error(
			`Não reconhecemos as colunas deste CSV (${headerRow.join(", ")}). ` +
				"É preciso ao menos data, descrição e valor.",
		);
	}

	const transactions = ensureUniqueExternalIds(
		profile.parse(headers, dataRows),
	);
	if (transactions.length === 0) {
		throw new Error("Nenhuma transação válida encontrada no CSV.");
	}

	const dates = transactions.map((t) => t.date).sort();

	return {
		source: profile.label,
		accountNumber: null,
		period: { from: dates[0], to: dates[dates.length - 1] },
		isCreditCard: profile.isCreditCard,
		bankName: profile.bankName ?? undefined,
		transactions,
	};
}
