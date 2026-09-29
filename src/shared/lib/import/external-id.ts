import type { ImportedTransaction } from "./types";

// O externalId precisa ser único no arquivo (chave da tabela de revisão e índice
// único userId + ofxFitId). Ex.: o Nubank repete o FITID da compra no IOF, e CSVs
// podem ter linhas idênticas legítimas (duas compras iguais no mesmo dia).
// Repetições recebem sufixo pela ordem no arquivo; a 1ª ocorrência mantém o id
// original para continuar detectando imports antigos.
export function ensureUniqueExternalIds(
	transactions: ImportedTransaction[],
): ImportedTransaction[] {
	const seen = new Map<string, number>();

	return transactions.map((transaction) => {
		const fitId = transaction.externalId;
		if (!fitId) return transaction;

		const count = (seen.get(fitId) ?? 0) + 1;
		seen.set(fitId, count);

		return count === 1
			? transaction
			: { ...transaction, externalId: `${fitId}#${count}` };
	});
}
