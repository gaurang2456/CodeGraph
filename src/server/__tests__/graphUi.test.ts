import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  buildGraphViewModel,
  applyDagreLayout,
  clusterPurposeModules,
  GraphApiResponse,
  GraphFilterState,
  GraphFocusState,
  DEFAULT_NODE_TYPES,
  ALL_RELATIONSHIP_TYPES,
} from '../../components/graph/graphUtils';

describe('Interactive Code Graph UI & 3-Tier Drilldown Tests', () => {
  const sampleApiData: GraphApiResponse = {
    nodes: [
      {
        id: 'repo1:src/auth/auth.controller.ts:AuthController',
        name: 'AuthController',
        type: 'class',
        filePath: 'src/auth/auth.controller.ts',
        startLine: 5,
        endLine: 25,
        exported: true,
      },
      {
        id: 'repo1:src/auth/auth.service.ts:AuthService',
        name: 'AuthService',
        type: 'class',
        filePath: 'src/auth/auth.service.ts',
        startLine: 4,
        endLine: 40,
        exported: true,
      },
      {
        id: 'repo1:src/users/user.repository.ts:UserRepository',
        name: 'UserRepository',
        type: 'class',
        filePath: 'src/users/user.repository.ts',
        startLine: 3,
        endLine: 30,
        exported: true,
      },
      {
        id: 'repo1:src/auth/auth.service.ts:AuthService.login',
        name: 'login',
        type: 'method',
        filePath: 'src/auth/auth.service.ts',
        startLine: 10,
        endLine: 18,
        exported: false,
      },
      {
        id: 'repo1:src/utils/helpers.ts:generateToken',
        name: 'generateToken',
        type: 'function',
        filePath: 'src/utils/helpers.ts',
        startLine: 2,
        endLine: 8,
        exported: true,
      },
    ],
    edges: [
      {
        id: 'rel-1',
        source: 'repo1:src/auth/auth.controller.ts:AuthController',
        target: 'repo1:src/auth/auth.service.ts:AuthService',
        type: 'INJECTS',
        confidence: 'high',
      },
      {
        id: 'rel-2',
        source: 'repo1:src/auth/auth.service.ts:AuthService',
        target: 'repo1:src/users/user.repository.ts:UserRepository',
        type: 'INJECTS',
        confidence: 'high',
      },
      {
        id: 'rel-3',
        source: 'repo1:src/auth/auth.service.ts:AuthService.login',
        target: 'repo1:src/utils/helpers.ts:generateToken',
        type: 'CALLS',
        confidence: 'medium',
      },
    ],
  };

  const defaultFilterState: GraphFilterState = {
    nodeTypes: new Set(DEFAULT_NODE_TYPES),
    relationshipTypes: new Set(ALL_RELATIONSHIP_TYPES),
    includeMediumConfidence: false,
    includeMethods: false,
    maxInitialNodes: 50,
  };

  const defaultFocusState: GraphFocusState = {
    focusedNodeId: null,
    expandedNodeIds: new Set<string>(),
  };

  test('1. Purpose Clustering automatically creates purposeful architecture modules', () => {
    const clusters = clusterPurposeModules(sampleApiData.nodes);
    // Should create 3 purposeful modules: Auth & Security (auth), User Management (users), Shared Utilities (utils)
    assert.strictEqual(clusters.length, 3, 'Should group into 3 purpose clusters');

    const authCluster = clusters.find((c) => c.purposeId === 'auth');
    assert.ok(authCluster, 'Auth cluster must exist');
    assert.strictEqual(authCluster.name, 'Auth & Security');
    assert.strictEqual(authCluster.classesCount, 2); // AuthController, AuthService
    assert.strictEqual(authCluster.totalSymbols, 3); // AuthController, AuthService, login method

    const userCluster = clusters.find((c) => c.purposeId === 'users');
    assert.ok(userCluster, 'Users cluster must exist');
    assert.strictEqual(userCluster.name, 'User Management');
  });

  test('2. Tier 1 (Default Purpose Mode): Renders high-level Purpose Nodes with cross-purpose flow edges', () => {
    const viewModel = buildGraphViewModel(sampleApiData, defaultFilterState, defaultFocusState, null);

    // Tier 1 by default renders the 3 Purpose Nodes
    assert.strictEqual(viewModel.nodes.length, 3, 'Should render 3 Purpose Nodes by default');
    for (const node of viewModel.nodes) {
      assert.strictEqual(node.type, 'purposeNode');
    }

    // High-level Purpose-to-Purpose edge from Auth -> Users exists because AuthService injects UserRepository
    const purposeEdge = viewModel.edges.find((e) => e.id.startsWith('purpose-flow-'));
    assert.ok(purposeEdge, 'High-level purpose data flow edge must exist');
    assert.strictEqual(purposeEdge.source, 'purpose:auth');
    assert.strictEqual(purposeEdge.target, 'purpose:users');
  });

  test('3. Tier 2 (Expanding a Purpose Node): Unfolds its contained Classes, Interfaces, and Functions', () => {
    const hierarchyState = {
      expandedPurposeIds: new Set(['auth']),
      unfoldedNodeIds: new Set<string>(),
      viewLevel: 'purpose' as const,
    };

    const viewModel = buildGraphViewModel(
      sampleApiData,
      defaultFilterState,
      defaultFocusState,
      null,
      'TB',
      hierarchyState
    );

    // Nodes should now be: 3 Purpose Nodes + 2 top-level symbols inside Auth (AuthController, AuthService) = 5 nodes
    assert.strictEqual(viewModel.nodes.length, 5, 'Should render 3 Purpose Nodes + 2 Auth Classes');

    const authController = viewModel.nodes.find(
      (n) => n.id === 'repo1:src/auth/auth.controller.ts:AuthController'
    );
    assert.ok(authController, 'AuthController must be visible in Tier 2');

    // Contains tree edge linking Purpose -> AuthController
    const containsEdge = viewModel.edges.find(
      (e) => e.id === 'purpose-contains-purpose:auth-repo1:src/auth/auth.controller.ts:AuthController'
    );
    assert.ok(containsEdge, 'Contains edge linking Purpose to Class must exist');
  });

  test('4. Tier 3 (Expanding a Class): Unfolds its member Methods and Functions', () => {
    const hierarchyState = {
      expandedPurposeIds: new Set(['auth']),
      unfoldedNodeIds: new Set(['repo1:src/auth/auth.service.ts:AuthService']),
      viewLevel: 'purpose' as const,
    };

    const viewModel = buildGraphViewModel(
      sampleApiData,
      defaultFilterState,
      defaultFocusState,
      null,
      'TB',
      hierarchyState
    );

    // Nodes: 3 Purpose Nodes + 2 Auth Classes + 1 AuthService.login method = 6 nodes
    assert.strictEqual(viewModel.nodes.length, 6, 'Should render 6 nodes with unfolded method');

    const loginMethod = viewModel.nodes.find(
      (n) => n.id === 'repo1:src/auth/auth.service.ts:AuthService.login'
    );
    assert.ok(loginMethod, 'AuthService.login method must be visible in Tier 3');

    // Method tree edge linking Class -> Method
    const methodEdge = viewModel.edges.find(
      (e) => e.id === 'class-method-repo1:src/auth/auth.service.ts:AuthService-repo1:src/auth/auth.service.ts:AuthService.login'
    );
    assert.ok(methodEdge, 'Class to method edge must exist');
  });

  test('5. View Level Presets: "classes" preset expands all purpose nodes into classes and types', () => {
    const hierarchyState = {
      expandedPurposeIds: new Set<string>(),
      unfoldedNodeIds: new Set<string>(),
      viewLevel: 'classes' as const,
    };

    const viewModel = buildGraphViewModel(
      sampleApiData,
      defaultFilterState,
      defaultFocusState,
      null,
      'TB',
      hierarchyState
    );

    // 3 Purpose Nodes + 4 top-level symbols (3 classes, 1 function) = 7 nodes
    assert.strictEqual(viewModel.nodes.length, 7, 'Should expand all classes and types');
  });

  test('6. Focus Mode: Directly isolates focused symbol and neighbors across tiers', () => {
    const focusOnAuthService: GraphFocusState = {
      focusedNodeId: 'repo1:src/auth/auth.service.ts:AuthService',
      expandedNodeIds: new Set<string>(),
    };

    const viewModel = buildGraphViewModel(
      sampleApiData,
      defaultFilterState,
      focusOnAuthService,
      'repo1:src/auth/auth.service.ts:AuthService'
    );

    // Focus mode shows direct symbol connections (AuthController, AuthService, UserRepository)
    assert.strictEqual(viewModel.nodes.length, 3);
    for (const node of viewModel.nodes) {
      assert.strictEqual(node.type, 'symbolNode');
    }
  });

  test('7. Dagre layout computes valid non-overlapping coordinates for Purpose and Symbol nodes', () => {
    const mockNodes = [
      { id: 'p1', type: 'purposeNode', position: { x: 0, y: 0 }, data: {} },
      { id: 's1', type: 'symbolNode', position: { x: 0, y: 0 }, data: {} },
    ];
    const mockEdges = [{ id: 'e1', source: 'p1', target: 's1' }];

    const layouted = applyDagreLayout(mockNodes as any, mockEdges as any, 'TB');
    assert.strictEqual(layouted.length, 2);
    assert.ok(layouted[1].position.y > layouted[0].position.y, 's1 must be below p1');
  });
});
