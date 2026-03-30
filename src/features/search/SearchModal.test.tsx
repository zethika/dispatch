import { describe, it, expect } from 'vitest';
import { buildSearchIndex, groupByCollection } from './SearchModal';
import type { CollectionItem } from '../../types/collections';

const mockCollections: CollectionItem[] = [
  {
    slug: 'my-api',
    name: 'My API',
    children: [
      {
        type: 'request',
        slug: 'get-users',
        name: 'Get Users',
        method: 'GET',
        url: 'https://api.example.com/users',
      },
      {
        type: 'folder',
        slug: 'auth',
        name: 'Auth',
        children: [
          {
            type: 'request',
            slug: 'login',
            name: 'Login',
            method: 'POST',
            url: 'https://api.example.com/auth/login',
          },
        ],
      },
    ],
  },
  {
    slug: 'second-api',
    name: 'Second API',
    children: [
      {
        type: 'request',
        slug: 'list-items',
        name: 'List Items',
        method: 'GET',
        url: 'https://second.example.com/items',
      },
    ],
  },
];

describe('buildSearchIndex', () => {
  it('flattens collections into searchable items', () => {
    const items = buildSearchIndex(mockCollections);
    // Should include all requests
    expect(items.length).toBe(3);
    const nodeIds = items.map((i) => i.nodeId);
    expect(nodeIds).toContain('my-api/get-users');
    expect(nodeIds).toContain('my-api/auth/login');
    expect(nodeIds).toContain('second-api/list-items');
  });

  it('includes nested folder children with correct breadcrumb', () => {
    const items = buildSearchIndex(mockCollections);
    const loginItem = items.find((i) => i.nodeId === 'my-api/auth/login');
    expect(loginItem).toBeDefined();
    expect(loginItem!.breadcrumb).toBe('My API > Auth > Login');
    expect(loginItem!.collectionName).toBe('My API');
  });

  it('includes url field from request nodes', () => {
    const items = buildSearchIndex(mockCollections);
    const getUsersItem = items.find((i) => i.nodeId === 'my-api/get-users');
    expect(getUsersItem).toBeDefined();
    expect(getUsersItem!.url).toBe('https://api.example.com/users');
  });

  it('sets collectionSlug and collectionName correctly', () => {
    const items = buildSearchIndex(mockCollections);
    const secondItem = items.find((i) => i.collectionSlug === 'second-api');
    expect(secondItem).toBeDefined();
    expect(secondItem!.collectionName).toBe('Second API');
  });
});

describe('groupByCollection', () => {
  it('groups results by collectionSlug', () => {
    const items = buildSearchIndex(mockCollections);
    const grouped = groupByCollection(items);
    expect(grouped.size).toBe(2);
    expect(grouped.has('my-api')).toBe(true);
    expect(grouped.has('second-api')).toBe(true);
    expect(grouped.get('my-api')!.items.length).toBe(2);
    expect(grouped.get('second-api')!.items.length).toBe(1);
  });

  it('preserves collectionName in grouped result', () => {
    const items = buildSearchIndex(mockCollections);
    const grouped = groupByCollection(items);
    expect(grouped.get('my-api')!.collectionName).toBe('My API');
    expect(grouped.get('second-api')!.collectionName).toBe('Second API');
  });
});
