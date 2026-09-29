// Utilitários comuns a todos os perfis de CSV bancário.

// Tenta UTF-8 (com ou sem BOM); se o arquivo não for UTF-8 válido, usa windows-1252,
// que é o padrão de muitos bancos brasileiros.
export function decodeCsvBuffer(buffer: ArrayBuffer): string {
	let text: string;
	try {
		text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
	} catch {
		text = new TextDecoder("windows-1252").decode(buffer);
	}
	return text.replace(/^﻿/, "");
}

const DELIMITERS = [";", ",", "\t"] as const;

function detectDelimiter(headerLine: string): string {
	let best: string = DELIMITERS[0];
	let bestCount = -1;
	for (const delimiter of DELIMITERS) {
		const count = headerLine.split(delimiter).length - 1;
		if (count > bestCount) {
			best = delimiter;
			bestCount = count;
		}
	}
	return best;
}

// Parser CSV com suporte a aspas ("a;b", aspas escapadas "") e CRLF.
// Linhas totalmente vazias são descartadas.
export function parseCsvRows(text: string): string[][] {
	const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
	const delimiter = detectDelimiter(firstLine);
	const rows: string[][] = [];
	let row: string[] = [];
	let field = "";
	let inQuotes = false;

	const pushRow = () => {
		row.push(field);
		if (row.some((cell) => cell.trim() !== "")) rows.push(row);
		row = [];
		field = "";
	};

	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (inQuotes) {
			if (char === '"' && text[i + 1] === '"') {
				field += '"';
				i++;
			} else if (char === '"') {
				inQuotes = false;
			} else {
				field += char;
			}
		} else if (char === '"') {
			inQuotes = true;
		} else if (char === delimiter) {
			row.push(field);
			field = "";
		} else if (char === "\n" || char === "\r") {
			if (char === "\r" && text[i + 1] === "\n") i++;
			pushRow();
		} else {
			field += char;
		}
	}
	if (field !== "" || row.length > 0) pushRow();

	return rows.map((cells) => cells.map((cell) => cell.trim()));
}

// Aceita "R$ 1.234,56", "-R$ 1.234,56", "R$ -1.234,56", "1234.56", "-12,5".
export function parseBrazilianAmount(raw: string): number | null {
	const value = raw.trim();
	if (!value) return null;
	const negative = value.includes("-");
	let digits = value.replace(/[^\d.,]/g, "");
	if (!digits) return null;

	const lastComma = digits.lastIndexOf(",");
	const lastDot = digits.lastIndexOf(".");
	if (lastComma > lastDot) {
		// vírgula decimal: 1.234,56
		digits = digits.replace(/\./g, "").replace(",", ".");
	} else if (lastDot > -1 && lastComma === -1 && /\.\d{3}$/.test(digits)) {
		// só pontos de milhar: 1.234
		digits = digits.replace(/\./g, "");
	} else {
		// ponto decimal: 1,234.56 ou 1234.56
		digits = digits.replace(/,/g, "");
	}

	const amount = Number.parseFloat(digits);
	if (Number.isNaN(amount)) return null;
	return negative ? -amount : amount;
}

// Aceita "dd/mm/aa", "dd/mm/aaaa" e "aaaa-mm-dd". Retorna "YYYY-MM-DD".
export function parseFlexibleDate(raw: string): string | null {
	const value = raw.trim();
	const dmy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
	if (dmy) {
		const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
		return `${year}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
	}
	const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
	return null;
}

// Normaliza cabeçalhos para comparação: minúsculo, sem acento, sem espaços extras.
export function normalizeHeader(header: string): string {
	return header
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.trim()
		.replace(/\s+/g, " ");
}

export function collapseSpaces(value: string): string {
	return value.trim().replace(/\s+/g, " ");
}

// Id estável de uma linha de CSV (CSVs não têm FITID). Linhas idênticas
// recebem sufixo depois, via ensureUniqueExternalIds.
export function buildCsvExternalId(
	prefix: string,
	parts: (string | number)[],
): string {
	return `${prefix}:${parts.map((part) => String(part).toLowerCase()).join("|")}`;
}
