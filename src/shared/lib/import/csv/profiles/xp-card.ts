import type { ImportedTransaction } from "@/shared/lib/import/types";
import {
	buildCsvExternalId,
	collapseSpaces,
	parseBrazilianAmount,
	parseFlexibleDate,
} from "../csv-reader";
import { type CsvBankProfile, columnIndex, hasHeaders } from "./types";

// Fatura do cartão XP:
// Data;Estabelecimento;Portador;Valor;Parcela
// 06/04/2026;PB*WEASY;MAX CAVALHEIRO;R$ 102,90;5 de 6
// 10/09/2026;Pagamentos Validos Normais;MAX CAVALHEIRO;R$ -3.572,97;-
// - Valor positivo = compra; negativo = pagamento/estorno (crédito na fatura)
// - Em parcelas, a data é a da compra original
export const xpCardProfile: CsvBankProfile = {
	id: "xp-card",
	label: "XP · fatura do cartão",
	bankName: "XP",
	isCreditCard: true,
	matches: (headers) =>
		hasHeaders(headers, [
			"data",
			"estabelecimento",
			"portador",
			"valor",
			"parcela",
		]),
	parse: (headers, rows) => {
		const col = {
			date: columnIndex(headers, "data"),
			name: columnIndex(headers, "estabelecimento"),
			amount: columnIndex(headers, "valor"),
			installment: columnIndex(headers, "parcela"),
		};

		return rows.flatMap((row): ImportedTransaction[] => {
			const date = parseFlexibleDate(row[col.date] ?? "");
			const amount = parseBrazilianAmount(row[col.amount] ?? "");
			const name = collapseSpaces(row[col.name] ?? "");
			if (!date || amount === null || amount === 0 || !name) return [];

			const installment = (row[col.installment] ?? "").match(
				/^(\d+)\s*de\s*(\d+)$/i,
			);
			const description = installment
				? `${name} - Parcela ${installment[1]}/${installment[2]}`
				: name;

			return [
				{
					externalId: buildCsvExternalId("xp-card", [
						date,
						name,
						amount.toFixed(2),
						installment ? `${installment[1]}/${installment[2]}` : "-",
					]),
					date,
					amount: Math.abs(amount),
					description,
					transactionType: amount > 0 ? "expense" : "income",
				},
			];
		});
	},
};
