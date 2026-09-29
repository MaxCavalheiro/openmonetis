// "Loja - Parcela 3/4" ou "Loja Parc12"
const INSTALLMENT_SUFFIX = /\s*-?\s*(?:parcela\s+\d+\s*\/\s*\d+|parc\d+)\s*$/i;
// "Transferência enviada pelo Pix - DESTINATÁRIO - CPF/CNPJ - BANCO Agência..."
const PIX_PREFIX =
	/^(transfer\S*\s+(?:enviada|recebida)\s+pelo\s+pix\s+-\s+[^-]+?)\s+-\s/i;
// "IOF de compra internacional", "IOF de "Loja"", "IOF de volta de Loja"
const IOF_PREFIX = /^iof\s/i;

// Chave usada para lembrar a categoria de uma descrição entre importações.
// Remove o que muda de um mês para o outro (número da parcela, dados bancários
// do Pix) e agrupa todas as variações de IOF numa única chave.
export function normalizeDescriptionKey(description: string): string {
	const base = description
		.toLowerCase()
		.trim()
		.replace(/\s+/g, " ")
		.replace(INSTALLMENT_SUFFIX, "");
	if (IOF_PREFIX.test(base)) return "iof";
	return (base.match(PIX_PREFIX)?.[1] ?? base).trim();
}

// O upsert falha se a mesma chave aparece duas vezes no lote
// ("ON CONFLICT DO UPDATE command cannot affect row a second time").
export function dedupeMappingsByKey<T extends { descriptionKey: string }>(
	rows: T[],
): T[] {
	const byKey = new Map<string, T>();
	for (const row of rows) {
		byKey.delete(row.descriptionKey);
		byKey.set(row.descriptionKey, row);
	}
	return [...byKey.values()];
}
