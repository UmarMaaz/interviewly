
import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Suspense } from 'react';

interface AvatarProps {
  isSpeaking: boolean;
  mood: 'neutral' | 'positive' | 'negative';
}

// A placeholder 3D model that uses primitives
const AvatarModel = ({ isSpeaking, mood }: { isSpeaking: boolean; mood: string }) => {
  // Color based on mood
  const moodColorMap = {
    neutral: '#4299e1', // Blue
    positive: '#48bb78', // Green
    negative: '#f56565', // Red
  };
  
  // A placeholder color based on mood
  const avatarColor = moodColorMap[mood as keyof typeof moodColorMap] || moodColorMap.neutral;
  
  // Simple animation for speaking effect
  const speaking = isSpeaking ? Math.sin(Date.now() / 200) * 0.1 + 0.9 : 1;
  
  return (
    <group>
      {/* Head */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color={avatarColor} />
      </mesh>
      
      {/* Eyes */}
      <mesh position={[-0.3, 0.2, 0.8]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[0.3, 0.2, 0.8]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="white" />
      </mesh>
      
      {/* Pupils */}
      <mesh position={[-0.3, 0.2, 0.9]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="black" />
      </mesh>
      <mesh position={[0.3, 0.2, 0.9]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="black" />
      </mesh>
      
      {/* Mouth (animated when speaking) */}
      <mesh position={[0, -0.3, 0.8]} scale={[0.5, speaking * 0.2, 0.1]}>
        <boxGeometry />
        <meshStandardMaterial color="#421C52" />
      </mesh>
    </group>
  );
};

const Avatar: React.FC<AvatarProps> = ({ isSpeaking, mood }) => {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 3.5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Suspense fallback={null}>
          <AvatarModel isSpeaking={isSpeaking} mood={mood} />
        </Suspense>
        <OrbitControls 
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 2 - 0.5}
          maxPolarAngle={Math.PI / 2 + 0.5}
        />
      </Canvas>
      
      {isSpeaking && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-interview-accent rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-interview-accent rounded-full animate-pulse delay-75"></div>
            <div className="w-2 h-2 bg-interview-accent rounded-full animate-pulse delay-150"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Avatar;
