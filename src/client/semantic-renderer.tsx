import { type PackedCard, verseCards } from "../domain/card-packing.js";
import type {
	SemanticChapter,
	SemanticNode,
} from "../domain/semantic-chapter.js";
export const simpleVerseCards = verseCards;

export function IntroTitles({ chapter }: { chapter: SemanticChapter }) {
	const selected = new Set<string>();
	const titles = new Set(chapter.introTitleNodeIds);
	function collect(nodes: SemanticNode[], inside = false) {
		for (const node of nodes) {
			const included = inside || titles.has(node.id);
			if (node.kind === "group") collect(node.children, included);
			else if (included) selected.add(node.id);
		}
	}
	collect(chapter.nodes);
	return (
		<SemanticContent
			nodes={chapter.nodes}
			selected={selected}
			verseKeys={new Set()}
		/>
	);
}

export function SemanticContent({
	nodes,
	selected,
	verseKeys,
}: {
	nodes: SemanticNode[];
	selected: Set<string>;
	verseKeys: Set<string>;
}) {
	function included(node: SemanticNode): boolean {
		return node.kind === "text"
			? selected.has(node.id)
			: node.kind === "verse-marker"
				? node.verseKeys.some((key) => verseKeys.has(key))
				: node.kind === "group"
					? node.children.some(included)
					: false;
	}
	function render(node: SemanticNode): React.ReactNode {
		if (node.kind === "text")
			return selected.has(node.id) ? (
				<span
					key={node.id}
					data-source-node={node.id}
					data-semantic-text="true"
					data-location-key={node.verseKeys[0]}
					data-location-keys={JSON.stringify(node.verseKeys)}
					className={node.marks.map((mark) => `mark-${mark}`).join(" ")}
				>
					{node.text}
				</span>
			) : null;
		if (node.kind === "verse-marker")
			return included(node) ? (
				<sup
					key={node.id}
					className="verse-label"
					data-verse-key={node.verseKeys[0]}
				>
					{node.label}
				</sup>
			) : null;
		if (node.kind === "break")
			return selected.has(node.id) ? <br key={node.id} /> : null;
		if (node.role === "stanza" && !node.children.length)
			return selected.has(node.id) ? (
				<div key={node.id} className="stanza-break" aria-hidden="true" />
			) : null;
		if (!included(node)) return null;
		const children = node.children.map(render);
		const properties = {
			"data-source-node": node.id,
			"data-role": node.role,
			className: `semantic-${node.role}`,
			style:
				node.indent === undefined
					? undefined
					: { paddingInlineStart: `${node.indent}em` },
		};
		if (node.role === "inline")
			return (
				<span key={node.id} {...properties}>
					{children}
				</span>
			);
		if (node.role === "heading" || node.role === "title")
			return (
				<h2 key={node.id} {...properties}>
					{children}
				</h2>
			);
		if (node.role === "paragraph")
			return (
				<p key={node.id} {...properties}>
					{children}
				</p>
			);
		return (
			<div key={node.id} {...properties}>
				{children}
			</div>
		);
	}
	return <>{nodes.map(render)}</>;
}
export function ChapterCards({
	chapter,
	cards = verseCards(chapter),
	fontScales = {},
}: {
	chapter: SemanticChapter;
	cards?: PackedCard[];
	fontScales?: Record<string, number>;
}) {
	return (
		<>
			{cards.map((card) => (
				<article
					className="verse-card"
					tabIndex={-1}
					key={card.key}
					data-page-fit-scale={fontScales[card.key] ?? 1}
					style={
						{
							"--page-font-scale": fontScales[card.key] ?? 1,
						} as React.CSSProperties
					}
					aria-label={`Verse ${chapter.verses.find((verse) => verse.key === card.verseKeys[0])?.displayLabel}`}
				>
					<div className="card-literature">
						<SemanticContent
							nodes={chapter.nodes}
							selected={new Set(card.nodeIds)}
							verseKeys={new Set(card.verseKeys)}
						/>
					</div>
				</article>
			))}
		</>
	);
}
export function Attribution({ chapter }: { chapter: SemanticChapter }) {
	return (
		<footer
			className="attribution"
			tabIndex={-1}
			aria-label="Translation attribution"
		>
			<div className="end-literature">
				<span>{chapter.attribution.translationLabel}</span>
				<details>
					<summary>Copyright and attribution</summary>
					<p>{chapter.attribution.notice}</p>
					{chapter.attribution.requiredLinks.map((link) => (
						<a key={link.href} href={link.href}>
							{link.label}
						</a>
					))}
				</details>
			</div>
		</footer>
	);
}
