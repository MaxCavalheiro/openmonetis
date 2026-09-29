import type { ImportedTransaction } from "@/shared/lib/import/types";
import {
	buildCsvExternalId,
	collapseSpaces,
	parseBrazilianAmount,
	parseFlexibleDate,
} from "../csv-reader";
import { type CsvBankProfile, columnIndex, hasHeaders } from "./types";

// Extrato da conta XP:
// Data;Hora;Descricao;Valor;Saldo
// 10/09/26;10:02:09;Pagamento para BANCO XP S.A;-R$ 3.572,97;R$ 427,03
// - Valor negativo = saída; positivo = entrada
export const xpAccountProfile: CsvBankProfile = {
	id: "xp-account",
	label: "XP · extrato da conta",
	bankName: "XP",
	isCreditCard: false,
	matches: (headers) =>
		hasHeaders(headers, ["data", "hora", "descricao", "valor", "saldo"]),
	parse: (headers, rows) => {
		const col = {
			date: columnIndex(headers, "data"),
			time: columnIndex(headers, "hora"),
			name: columnIndex(headers, "descricao"),
			amount: columnIndex(headers, "valor"),
		};

		return rows.flatMap((row): ImportedTransaction[] => {
			const date = parseFlexibleDate(row[col.date] ?? "");
			const amount = parseBrazilianAmount(row[col.amount] ?? "");
			const name = collapseSpaces(row[col.name] ?? "");
			if (!date || amount === null || amount === 0 || !name) return [];

			return [
				{
					externalId: buildCsvExternalId("xp-account", [
						date,
						row[col.time] ?? "",
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
