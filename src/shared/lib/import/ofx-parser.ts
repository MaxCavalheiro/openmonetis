import { ensureUniqueExternalIds } from "./external-id";
import type { ImportedTransaction, ImportStatement } from "./types";

// Extrai o valor de uma tag leaf do OFX SGML: <TAG>valor
function getField(block: string, tag: string): string | null {
	const match = block.match(new RegExp(`<${tag}>([^<\n\r]+)`));
	return match?.[1]?.trim() ?? null;
}

// Converte data OFX "20260320000000[-3:BRT]" para "YYYY-MM-DD"
function parseOfxDate(raw: string): string {
	const match = raw.match(/^(\d{4})(\d{2})(\d{2})/);
	if (!match) throw new Error(`Data OFX inválida: ${raw}`);
	return `${match[1]}-${match[2]}-${match[3]}`;
}

export function parseOfx(content: string): ImportStatement {
	// Remove o header SGML (tudo antes de <OFX>)
	const ofxStart = content.indexOf("<OFX>");
	const xml = ofxStart >= 0 ? content.slice(ofxStart) : content;

	// Banco
	const source = getField(xml, "ORG") ?? "Desconhecido";
	const accountNumber = getField(xml, "ACCTID");

	// Período
	const dtStart = getField(xml, "DTSTART");
	const dtEnd = getField(xml, "DTEND");
	const period =
		dtStart && dtEnd
			? { from: parseOfxDate(dtStart), to: parseOfxDate(dtEnd) }
			: null;

	// Transações
	const blocks = xml.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/g) ?? [];
	const transactions: ImportedTransaction[] = blocks.map((block) => {
		const trnType = getField(block, "TRNTYPE") ?? "DEBIT";
		const dtPosted = getField(block, "DTPOSTED") ?? "";
		const trnAmt = getField(block, "TRNAMT") ?? "0";
		const fitId = getField(block, "FITID");
		const memo = getField(block, "MEMO");
		const name = getField(block, "NAME");

		const amount = Number.parseFloat(trnAmt.replace(",", "."));
		const transactionType =
			amount > 0 || trnType === "CREDIT" ? "income" : "expense";

		const description = memo ?? name ?? "";

		return {
			externalId: buildInstallmentExternalId(fitId, description),
			date: parseOfxDate(dtPosted),
			amount: Math.abs(amount),
			description,
			transactionType,
		};
	});

	const isCreditCard = xml.includes("<CREDITCARDMSGSRSV1>");

	return {
		source,
		accountNumber,
		period,
		isCreditCard,
		transactions: ensureUniqueExternalIds(transactions),
	};
}

const INSTALLMENT_PATTERN = /Parcela\s+(\d+)\s*\/\s*\d+/i;

// Alguns bancos (ex.: Nubank) usam o mesmo FITID em todas as parcelas de uma
// compra, em faturas diferentes. Sem o número da parcela no id, a parcela do mês
// seguinte seria tratada como "já importada" e descartada.
export function buildInstallmentExternalId(
	fitId: string | null,
	description: string,
): string | null {
	if (!fitId) return null;
	const installment = description.match(INSTALLMENT_PATTERN);
	return installment ? `${fitId}:parcela-${installment[1]}` : fitId;
}
