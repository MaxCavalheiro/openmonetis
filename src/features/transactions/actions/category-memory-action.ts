"use server";

import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { importCategoryMappings, transactions } from "@/db/schema";
import {
	dedupeMappingsByKey,
	normalizeDescriptionKey,
} from "@/features/transactions/lib/import-utils";

// Quantos lançamentos categorizados recentes consultar como fallback
const CATEGORIZED_HISTORY_LIMIT = 5000;

import { getUserId } from "@/shared/lib/auth/server";
import { db } from "@/shared/lib/db";

// Retorna um map de descriptionKey → categoryId para as descrições fornecidas
export async function fetchCategoryMappings(
	descriptions: string[],
): Promise<Record<string, string>> {
	const userId = await getUserId();
	const keys = descriptions.map(normalizeDescriptionKey).filter(Boolean);
	if (keys.length === 0) return {};

	const rows = await db
		.select({
			descriptionKey: importCategoryMappings.descriptionKey,
			categoryId: importCategoryMappings.categoryId,
		})
		.from(importCategoryMappings)
		.where(
			and(
				eq(importCategoryMappings.userId, userId),
				inArray(importCategoryMappings.descriptionKey, keys),
			),
		);

	const mappings: Record<string, string> = Object.fromEntries(
		rows.map((r) => [r.descriptionKey, r.categoryId]),
	);

	// Fallback: aprende com lançamentos já categorizados (o mais recente vence)
	const missing = new Set(keys.filter((key) => !mappings[key]));
	if (missing.size === 0) return mappings;

	const history = await db
		.select({ name: transactions.name, categoryId: transactions.categoryId })
		.from(transactions)
		.where(
			and(eq(transactions.userId, userId), isNotNull(transactions.categoryId)),
		)
		.orderBy(desc(transactions.createdAt))
		.limit(CATEGORIZED_HISTORY_LIMIT);

	for (const row of history) {
		const key = normalizeDescriptionKey(row.name);
		if (row.categoryId && missing.has(key)) {
			mappings[key] = row.categoryId;
			missing.delete(key);
			if (missing.size === 0) break;
		}
	}

	return mappings;
}

// Salva/atualiza mapeamentos description → category após uma importação
export async function saveCategoryMappings(
	rows: { description: string; categoryId: string | null }[],
): Promise<void> {
	const userId = await getUserId();

	const toUpsert = dedupeMappingsByKey(
		rows
			.filter((r) => r.categoryId !== null)
			.map((r) => ({
				userId,
				descriptionKey: normalizeDescriptionKey(r.description),
				categoryId: r.categoryId as string,
				updatedAt: new Date(),
			}))
			.filter((r) => r.descriptionKey.length > 0),
	);

	if (toUpsert.length === 0) return;

	await db
		.insert(importCategoryMappings)
		.values(toUpsert)
		.onConflictDoUpdate({
			target: [
				importCategoryMappings.userId,
				importCategoryMappings.descriptionKey,
			],
			set: {
				categoryId: sql`excluded.category_id`,
				updatedAt: sql`excluded.updated_at`,
			},
		});
}
