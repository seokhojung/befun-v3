import { render, screen, waitFor } from '@testing-library/react'
import ThreeCanvas from '@/components/three/ThreeCanvas'
import { SceneObjects } from '@/types/configurator'

// Mock Three.js
jest.mock('three', () => ({
  Scene: jest.fn(() => ({
    background: null,
    add: jest.fn(),
    remove: jest.fn(),
    children: []
  })),
  Color: jest.fn(),
  WebGLRenderer: jest.fn(() => ({
    setSize: jest.fn(),
    setPixelRatio: jest.fn(),
    shadowMap: { enabled: false, type: null },
    domElement: document.createElement('canvas'),
    render: jest.fn(),
    dispose: jest.fn()
  })),
  PerspectiveCamera: jest.fn(() => ({
    position: { set: jest.fn() },
    lookAt: jest.fn(),
    aspect: 1,
    updateProjectionMatrix: jest.fn()
  })),
  DirectionalLight: jest.fn(() => ({
    position: { set: jest.fn() },
    castShadow: false,
    shadow: {
      mapSize: { width: 0, height: 0 }
    }
  })),
  AmbientLight: jest.fn(),
  BoxGeometry: jest.fn(() => ({
    dispose: jest.fn()
  })),
  MeshPhongMaterial: jest.fn(() => ({
    dispose: jest.fn()
  })),
  Mesh: jest.fn(() => ({})),
  PCFSoftShadowMap: 'PCFSoftShadowMap'
}))

// Mock OrbitControls
jest.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: jest.fn(() => ({
    enableDamping: false,
    dampingFactor: 0,
    maxPolarAngle: 0,
    minPolarAngle: 0,
    minDistance: 0,
    maxDistance: 0,
    enablePan: false,
    panSpeed: 0,
    autoRotate: false,
    touches: {},
    update: jest.fn(),
    dispose: jest.fn()
  }))
}))

// Mock canvas WebGL context
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn((type: string) => {
    if (type === 'webgl2' || type === 'webgl') {
      return {}
    }
    return null
  })
})

describe('ThreeCanvas Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
  })

  test('should render loading state initially', () => {
    render(<ThreeCanvas />)

    expect(screen.getByText('3D 환경 초기화 중...')).toBeInTheDocument()
  })

  test('should call onSceneReady when scene is initialized', async () => {
    const mockOnSceneReady = jest.fn()

    render(<ThreeCanvas onSceneReady={mockOnSceneReady} />)

    await waitFor(() => {
      expect(mockOnSceneReady).toHaveBeenCalledTimes(1)
    })

    const sceneObjects: SceneObjects = mockOnSceneReady.mock.calls[0][0]
    expect(sceneObjects).toHaveProperty('scene')
    expect(sceneObjects).toHaveProperty('camera')
    expect(sceneObjects).toHaveProperty('renderer')
    expect(sceneObjects).toHaveProperty('controls')
    expect(sceneObjects).toHaveProperty('deskMesh')
    expect(sceneObjects).toHaveProperty('lights')
  })

  test('should apply custom className', () => {
    const { container } = render(
      <ThreeCanvas className="custom-class" />
    )

    const canvasContainer = container.firstChild as HTMLElement
    expect(canvasContainer).toHaveClass('custom-class')
  })

  test('should show WebGL not supported message when WebGL is unavailable', () => {
    // Mock getContext to return null (WebGL not supported)
    const mockGetContext = jest.fn(() => null)
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: mockGetContext
    })

    render(<ThreeCanvas />)

    expect(screen.getByText('⚠️ WebGL 지원 안됨')).toBeInTheDocument()
    expect(screen.getByText('이 브라우저는 3D 기능을 지원하지 않습니다.')).toBeInTheDocument()
  })
})