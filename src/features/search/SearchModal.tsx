import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Modal, ModalContent, ModalBody } from '@heroui/react';
import Fuse from 'fuse.js';
import { useUiStore } from '../../stores/uiStore';
import { useCollectionStore } from '../../stores/collectionStore';
import type { CollectionItem, TreeChild } from '../../types/collections';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SearchItem {
  nodeId: string;
  name: string;
  url: string;
  collectionSlug: string;
  collectionName: string;
  breadcrumb: string;
  type: 'request' | 'folder';
  method?: string;
}

// ── Pure helpers (exported for testing) ──────────────────────────────────────

function walkChildren(
  children: TreeChild[],
  collectionSlug: string,
  collectionName: string,
  parentPath: string[],
  parentNames: string[],
  out: SearchItem[],
): void {
  for (const child of children) {
    if (child.type === 'request') {
      const nodeId =
        parentPath.length > 0
          ? `${collectionSlug}/${parentPath.join('/')}/${child.slug}`
          : `${collectionSlug}/${child.slug}`;
      const breadcrumb = [...parentNames, child.name].join(' > ');
      out.push({
        nodeId,
        name: child.name,
        url: child.url,
        collectionSlug,
        collectionName,
        breadcrumb,
        type: 'request',
        method: child.method,
      });
    } else if (child.type === 'folder') {
      walkChildren(
        child.children,
        collectionSlug,
        collectionName,
        [...parentPath, child.slug],
        [...parentNames, child.name],
        out,
      );
    }
  }
}

export function buildSearchIndex(collections: CollectionItem[]): SearchItem[] {
  const items: SearchItem[] = [];
  for (const collection of collections) {
    walkChildren(
      collection.children,
      collection.slug,
      collection.name,
      [],
      [collection.name],
      items,
    );
  }
  return items;
}

export function groupByCollection(
  items: SearchItem[],
): Map<string, { collectionName: string; items: SearchItem[] }> {
  const map = new Map<string, { collectionName: string; items: SearchItem[] }>();
  for (const item of items) {
    const existing = map.get(item.collectionSlug);
    if (existing) {
      existing.items.push(item);
    } else {
      map.set(item.collectionSlug, {
        collectionName: item.collectionName,
        items: [item],
      });
    }
  }
  return map;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface FlatResult {
  item: SearchItem;
  groupIndex: number;
}

export default function SearchModal() {
  const { searchOpen, setSearchOpen } = useUiStore();
  const { collections, setActiveRequest, toggleExpanded, expandedNodes } = useCollectionStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build search index when modal opens (prevents stale results after renames)
  const items = useMemo(() => buildSearchIndex(collections), [searchOpen, collections]); // eslint-disable-line react-hooks/exhaustive-deps

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: [
          { name: 'name', weight: 0.5 },
          { name: 'collectionName', weight: 0.2 },
          { name: 'url', weight: 0.3 },
        ],
        threshold: 0.4,
        includeScore: true,
        minMatchCharLength: 2,
      }),
    [items],
  );

  // Compute grouped results
  const groupedResults = useMemo((): Map<string, { collectionName: string; items: SearchItem[] }> => {
    if (!query.trim()) return new Map();
    const results = fuse.search(query).map((r: { item: SearchItem }) => r.item);
    return groupByCollection(results);
  }, [query, fuse]);

  // Flatten results for keyboard navigation
  const flatResults = useMemo((): FlatResult[] => {
    const flat: FlatResult[] = [];
    let groupIndex = 0;
    for (const [, group] of groupedResults) {
      for (const item of group.items) {
        flat.push({ item, groupIndex });
      }
      groupIndex++;
    }
    return flat;
  }, [groupedResults]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [flatResults]);

  // Reset query when modal closes
  useEffect(() => {
    if (!searchOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [searchOpen]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-search-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (item: SearchItem) => {
      // Expand all ancestor nodes so the selected request is visible in the tree
      const parts = item.nodeId.split('/');
      // parts: [collectionSlug, ...folders, requestSlug]
      // Expand collection and each intermediate folder
      for (let i = 1; i < parts.length; i++) {
        const ancestorId = parts.slice(0, i).join('/');
        if (!expandedNodes.has(ancestorId)) {
          toggleExpanded(ancestorId);
        }
      }
      setActiveRequest(item.nodeId);
      setSearchOpen(false);
    },
    [expandedNodes, toggleExpanded, setActiveRequest, setSearchOpen],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(flatResults.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === 0 ? Math.max(flatResults.length - 1, 0) : prev - 1,
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = flatResults[selectedIndex];
        if (selected) {
          handleSelect(selected.item);
        }
      }
    },
    [flatResults, selectedIndex, handleSelect],
  );

  const hasQuery = query.trim().length > 0;
  const hasResults = flatResults.length > 0;

  // Build flat index for rendering
  let flatIndex = 0;
  const groupEntries = Array.from(groupedResults.entries());

  return (
    <Modal
      isOpen={searchOpen}
      onClose={() => setSearchOpen(false)}
      placement="top"
      size="lg"
      classNames={{ base: 'mt-16' }}
      hideCloseButton
    >
      <ModalContent>
        <ModalBody className="p-0">
          {/* Search input */}
          <div className="border-b border-divider">
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search requests, collections..."
              className="w-full text-base bg-transparent outline-none px-4 py-3"
            />
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
            {!hasQuery && (
              <p className="text-sm text-default-400 text-center py-6">
                Type to search requests and collections
              </p>
            )}

            {hasQuery && !hasResults && (
              <p className="text-sm text-default-500 text-center py-6">
                No results for &ldquo;{query}&rdquo;
              </p>
            )}

            {hasQuery && hasResults &&
              groupEntries.map(([collectionSlug, group]) => (
                <div key={collectionSlug} className="mb-2">
                  {/* Group header */}
                  <div className="px-4 py-1 text-xs font-semibold uppercase text-default-500">
                    {group.collectionName}
                  </div>

                  {/* Group items */}
                  {group.items.map((item) => {
                    const currentIndex = flatIndex++;
                    const isSelected = currentIndex === selectedIndex;
                    return (
                      <button
                        key={item.nodeId}
                        data-search-index={currentIndex}
                        className={`w-full text-left px-4 py-2 cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/10' : 'hover:bg-default-100'
                        } rounded-md mx-1`}
                        style={{ width: 'calc(100% - 8px)' }}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                      >
                        <div className="flex items-center gap-2">
                          {item.method && (
                            <span
                              className={`text-xs font-mono font-semibold shrink-0 ${
                                item.method === 'GET'
                                  ? 'text-primary'
                                  : item.method === 'POST'
                                    ? 'text-blue-500'
                                    : item.method === 'PUT'
                                      ? 'text-warning'
                                      : item.method === 'DELETE'
                                        ? 'text-danger'
                                        : 'text-default-500'
                              }`}
                            >
                              {item.method}
                            </span>
                          )}
                          <span className="text-sm font-medium truncate">{item.name}</span>
                        </div>
                        <p className="text-xs text-default-400 truncate mt-0.5">
                          {item.breadcrumb}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ))}
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
