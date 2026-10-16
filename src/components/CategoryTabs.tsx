import React, { useEffect, useRef } from 'react';
import './categoryTabs.css';

interface CategoryTabsProps {
  categories: Array<{ id: string; name: string; order: number }>;
  items: Array<{ categoryId: string }>;
  selectedId: string;
  onSelect: (id: string) => void;
  trailingAction?: React.ReactNode;
}

export function CategoryTabs({ categories, items, selectedId, onSelect, trailingAction }: CategoryTabsProps) {
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selectedId !== 'all' && !categories.some(category => category.id === selectedId)) onSelect('all');
  }, [categories, selectedId, onSelect]);
  useEffect(() => {
    const container = strip.current;
    const selected = container?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    if (!container || !selected) return;
    const box = selected.getBoundingClientRect();
    const viewport = container.getBoundingClientRect();
    if (box.left < viewport.left || box.right > viewport.right) {
      container.scrollBy({ left: box.left - viewport.left - (viewport.width - box.width) / 2,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }, [selectedId, categories]);
  const entries = [{ id: 'all', name: 'Tất cả', count: items.length },
    ...[...categories].sort((a, b) => a.order - b.order).map(category => ({ ...category,
      count: items.filter(item => item.categoryId === category.id).length }))];
  return <div className="category-tabs" ref={strip} role="group" aria-label="Lọc món theo danh mục">
    {entries.map(entry => <button key={entry.id} type="button" aria-pressed={selectedId === entry.id}
      className="category-tab" onClick={() => onSelect(entry.id)}>
      <span>{entry.name}</span><span className="category-tab-count" aria-label={`${entry.count} món`}>{entry.count}</span>
    </button>)}
    {trailingAction}
  </div>;
}
