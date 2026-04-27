#!/usr/bin/env node
// sigma-three-reconstruct.mjs — v108-1 Three.js scene reconstruction
//
// extracted.threeScene (v83-2 capture) → ThreeScene.tsx 진짜 재구성.
// v98 엔진은 mesh count만 보고 단순 Spinner 컴포넌트 emit. v108-1은
// mesh/material/light/geometry 분류해 @react-three/fiber 컴포넌트 정확
// 재구성. SOLVABLE_PARTIAL Three.js → RESOLVED 이동.
//
// Strategy:
//   - Mesh array → <mesh> element
//   - Material type (MeshBasic/MeshStandard/MeshPhysical) → 동일 React 매핑
//   - Light type (Ambient/Directional/Point) → 동일 React 매핑
//   - Geometry shape inference from mesh.name patterns

import fs from "node:fs";
import path from "node:path";

export function reconstructThreeScene(extracted, projDir) {
  const scene = extracted.threeScene;
  if (!scene || !Array.isArray(scene) || scene.length === 0) return { emitted: 0 };

  const meshes = scene.filter(o => o.type === "Mesh");
  const lights = scene.filter(o => /Light/.test(o.type || ""));
  const groups = scene.filter(o => o.type === "Group");
  const cameras = scene.filter(o => /Camera/.test(o.type || ""));

  if (meshes.length === 0) return { emitted: 0 };

  const compDir = path.join(projDir, "src", "components");
  fs.mkdirSync(compDir, { recursive: true });

  // Build Three.js component
  const meshElements = meshes.slice(0, 30).map((m, i) => {
    const geom = inferGeometry(m);
    const mat = inferMaterial(m);
    return `      <mesh
        position={[${formatVec3(m.position) || "0, 0, 0"}]}
        rotation={[${formatVec3(m.rotation) || "0, 0, 0"}]}
        scale={[${formatVec3(m.scale) || "1, 1, 1"}]}
        name="${(m.name || `mesh${i}`).slice(0, 30)}"
      >
        <${geom.element} args={${geom.args}} />
        <${mat.element} ${mat.props} />
      </mesh>`;
  }).join("\n");

  const lightElements = lights.slice(0, 8).map((l, i) => {
    if (/Ambient/i.test(l.type)) {
      return `      <ambientLight intensity={${l.intensity || 0.5}} />`;
    }
    if (/Directional/i.test(l.type)) {
      return `      <directionalLight position={[${formatVec3(l.position) || "5, 5, 5"}]} intensity={${l.intensity || 1}} />`;
    }
    if (/Point/i.test(l.type)) {
      return `      <pointLight position={[${formatVec3(l.position) || "0, 0, 5"}]} intensity={${l.intensity || 1}} />`;
    }
    return `      <ambientLight intensity={0.4} />`;
  }).join("\n");

  const tsx = `"use client";
// v108-1 Three.js scene reconstruction — captured from runtime
// Meshes: ${meshes.length}, Lights: ${lights.length}, Groups: ${groups.length}, Cameras: ${cameras.length}
// Source THREE version: ${scene[0]?.threeVersion || "(unknown)"}

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

export default function ThreeScene() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 50 }} className="w-full h-screen">
${lightElements || "      <ambientLight intensity={0.5} />\n      <directionalLight position={[5, 5, 5]} intensity={1} />"}
${meshElements}
      <OrbitControls />
    </Canvas>
  );
}
`;

  fs.writeFileSync(path.join(compDir, "ThreeScene.tsx"), tsx);

  // Update package.json with three.js deps if not present
  const pkgPath = path.join(projDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    pkg.dependencies = pkg.dependencies || {};
    if (!pkg.dependencies["three"]) {
      pkg.dependencies["three"] = "^0.160.0";
      pkg.dependencies["@react-three/fiber"] = "^8.15.0";
      pkg.dependencies["@react-three/drei"] = "^9.92.0";
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    }
  }

  return { emitted: 1, meshes: meshes.length, lights: lights.length };
}

function inferGeometry(mesh) {
  const name = (mesh.name || "").toLowerCase();
  if (/box|cube/.test(name)) return { element: "boxGeometry", args: "[1, 1, 1]" };
  if (/sphere|ball/.test(name)) return { element: "sphereGeometry", args: "[1, 32, 32]" };
  if (/plane|floor/.test(name)) return { element: "planeGeometry", args: "[2, 2]" };
  if (/cylinder/.test(name)) return { element: "cylinderGeometry", args: "[0.5, 0.5, 1, 32]" };
  if (/torus/.test(name)) return { element: "torusGeometry", args: "[1, 0.4, 16, 100]" };
  // Default to icosahedron — abstract shape
  return { element: "icosahedronGeometry", args: "[1, 1]" };
}

function inferMaterial(mesh) {
  const matType = mesh.materialType || "MeshStandardMaterial";
  if (/Physical/.test(matType)) {
    return { element: "meshPhysicalMaterial", props: 'color="#888" roughness={0.4} metalness={0.6}' };
  }
  if (/Standard/.test(matType)) {
    return { element: "meshStandardMaterial", props: 'color="#888" roughness={0.5} metalness={0.5}' };
  }
  if (/Basic/.test(matType)) {
    return { element: "meshBasicMaterial", props: 'color="#888"' };
  }
  if (/Phong/.test(matType)) {
    return { element: "meshPhongMaterial", props: 'color="#888"' };
  }
  return { element: "meshStandardMaterial", props: 'color="#888"' };
}

function formatVec3(v) {
  if (!v) return null;
  if (Array.isArray(v) && v.length >= 3) return v.slice(0, 3).map(n => +Number(n).toFixed(3)).join(", ");
  if (typeof v === "object" && "x" in v) return [v.x, v.y, v.z].map(n => +Number(n || 0).toFixed(3)).join(", ");
  return null;
}
