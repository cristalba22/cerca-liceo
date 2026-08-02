import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const STREET_COLOR = '#eef6dd'
const BLOCK_COLORS = ['#ff6a3d', '#a7e92a', '#70dfd2', '#ffd84d']

function RoundedBlock({ position, color, scale = [1, 0.18, 0.72] }) {
  return (
    <mesh position={position} scale={scale} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} roughness={0.58} metalness={0.04} />
    </mesh>
  )
}

function MapPin({ position, color, delay = 0 }) {
  const pinRef = useRef(null)
  useFrame(({ clock }) => {
    if (!pinRef.current) return
    const wave = Math.sin(clock.elapsedTime * 1.65 + delay) * 0.09
    pinRef.current.position.y = position[1] + wave
    pinRef.current.rotation.y = clock.elapsedTime * 0.24 + delay
  })

  return (
    <group ref={pinRef} position={position}>
      <mesh castShadow>
        <sphereGeometry args={[0.2, 20, 20]} />
        <meshStandardMaterial color={color} roughness={0.32} />
      </mesh>
      <mesh position={[0, -0.28, 0]} rotation={[0, 0, Math.PI]} castShadow>
        <coneGeometry args={[0.12, 0.38, 18]} />
        <meshStandardMaterial color={color} roughness={0.38} />
      </mesh>
      <mesh position={[0, 0, 0.17]}>
        <circleGeometry args={[0.075, 18]} />
        <meshBasicMaterial color="#10150f" />
      </mesh>
    </group>
  )
}

function NeighborhoodScene() {
  const sceneRef = useRef(null)
  const accentRef = useRef(null)

  useFrame(({ clock, pointer }) => {
    if (!sceneRef.current || !accentRef.current) return
    const time = clock.elapsedTime
    sceneRef.current.rotation.y = THREE.MathUtils.lerp(sceneRef.current.rotation.y, pointer.x * 0.09, 0.035)
    sceneRef.current.rotation.x = THREE.MathUtils.lerp(sceneRef.current.rotation.x, -0.46 + pointer.y * 0.035, 0.035)
    accentRef.current.rotation.z = time * 0.12
    accentRef.current.position.y = 0.42 + Math.sin(time * 1.1) * 0.045
  })

  return (
    <group ref={sceneRef} rotation={[-0.46, -0.08, -0.04]} position={[0, -0.34, 0]}>
      <mesh receiveShadow position={[0, -0.18, 0]}>
        <boxGeometry args={[5.8, 0.18, 4.1]} />
        <meshStandardMaterial color="#172112" roughness={0.8} />
      </mesh>

      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.02, 0]} rotation={[0, 0.16, 0]} receiveShadow>
          <boxGeometry args={[6.2, 0.05, 0.22]} />
          <meshStandardMaterial color={STREET_COLOR} roughness={0.9} />
        </mesh>
        <mesh position={[0.3, 0.025, 0.05]} rotation={[0, -0.78, 0]} receiveShadow>
          <boxGeometry args={[5.2, 0.05, 0.19]} />
          <meshStandardMaterial color={STREET_COLOR} roughness={0.9} />
        </mesh>
        <mesh position={[-0.35, 0.03, 0.15]} rotation={[0, 1.12, 0]} receiveShadow>
          <boxGeometry args={[4.5, 0.05, 0.16]} />
          <meshStandardMaterial color={STREET_COLOR} roughness={0.9} />
        </mesh>
      </group>

      {[
        [-1.86, 0.04, -1.12], [-0.76, 0.04, -1.42], [0.8, 0.04, -1.28], [1.86, 0.04, -0.72],
        [-2.04, 0.04, 0.58], [-0.88, 0.04, 1.22], [0.82, 0.04, 1.18], [1.92, 0.04, 0.56],
      ].map((position, index) => (
        <RoundedBlock
          key={position.join('-')}
          position={position}
          color={BLOCK_COLORS[index % BLOCK_COLORS.length]}
          scale={[0.78 + (index % 3) * 0.12, 0.2 + (index % 2) * 0.08, 0.58 + (index % 2) * 0.13]}
        />
      ))}

      <group ref={accentRef} position={[0, 0.42, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.72, 0.035, 12, 64]} />
          <meshBasicMaterial color="#a7e92a" transparent opacity={0.82} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.06, 0.018, 10, 64]} />
          <meshBasicMaterial color="#70dfd2" transparent opacity={0.58} />
        </mesh>
      </group>

      <MapPin position={[-1.3, 0.75, -0.35]} color="#ff6a3d" delay={0.2} />
      <MapPin position={[0.1, 0.88, 0.2]} color="#a7e92a" delay={1.1} />
      <MapPin position={[1.42, 0.7, -0.08]} color="#70dfd2" delay={2.2} />
    </group>
  )
}

export default function WelcomeHeroScene3D({ active, onReady }) {
  return (
    <div className="welcome-3d-stage" aria-hidden="true">
      <Canvas
        dpr={[1, 1.35]}
        frameloop={active ? 'always' : 'never'}
        camera={{ position: [0, 3.35, 5.6], fov: 42 }}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        shadows={false}
        onCreated={() => onReady?.(true)}
      >
        <ambientLight intensity={1.7} />
        <directionalLight position={[3, 6, 4]} intensity={2.6} color="#fff9dd" />
        <pointLight position={[-3, 2, 2]} intensity={8} distance={7} color="#70dfd2" />
        <pointLight position={[3, 1.4, -1]} intensity={7} distance={6} color="#ff6a3d" />
        <NeighborhoodScene />
      </Canvas>
    </div>
  )
}
