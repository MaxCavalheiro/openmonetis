import type { ImportedTransaction } from "@/shared/lib/import/types";
import {
	buildCsvExternalId,
	collapseSpaces,
	parseBrazilianAmount,
	parseFlexibleDate,
} from "../csv-reader";
import type { CsvBankProfile } from "./types";

// Nomes de coluna aceitos (já normalizados: minúsculo e sem acento)
const DATE_COLUMNS = [
	"data",
	"date",
	"data lancamento",
	"data do lancamento",
	"data da transacao",
	"data movimento",
];
const DESCRIPTION_COLUMNS = [
	"descricao",
	"historico",
	"estabelecimento",
	"lancamento",
	"title",
	"description",
	"memo",
	"nome",
];
const AMOUNT_COLUMNS = ["valor", "amount", "valor (r$)", "quantia", "value"];

const findColumn = (headers: string[], candidates: string[]) =>
	headers.findIndex((header) => candidates.includes(header));

export function detectGenericColumns(headers: string[]) {
	return {
		date: findColumn(headers, DATE_COLUMNS),
		name: findColumn(headers, DESCRIPTION_COLUMNS),
		amount: findColumn(headers, AMOUNT_COLUMNS),
	};
}

// Fallback para bancos sem perfil próprio: localiza as colunas pelo nome e
// assume o padrão de extrato de conta (valor negativo = saída).
export const genericProfile: CsvBankProfile = {
	id: "generic",
	label: "CSV genérico",
	bankName: null,
	isCreditCard: false,
	matches: (headers) => {
		const col = detectGenericColumns(headers);
		return col.date >= 0 && col.name >= 0 && col.amount >= 0;
	},
	parse: (headers, rows) => {
		const col = detectGenericColumns(headers);

		return rows.flatMap((row): ImportedTransaction[] => {
			const date = parseFlexibleDate(row[col.date] ?? "");
			const amount = parseBrazilianAmount(row[col.amount] ?? "");
			const name = collapseSpaces(row[col.name] ?? "");
			if (!date || amount === null || amount === 0 || !name) return [];

			return [
				{
					externalId: buildCsvExternalId("csv", [
						date,
						name,
						amount.toFixed(2),
					]),
					date,
					amount: Math.abs(amount),
					description: name,
					transactionType: amount < 0 ? "expense" : "income",
				},
			];
		});
	},
};
