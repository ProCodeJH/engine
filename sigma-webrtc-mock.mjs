#!/usr/bin/env node
// sigma-webrtc-mock.mjs — v108-2 WebRTC mock peer scaffold emit
//
// extracted.apiUsage.webRTC + extracted.runtime.rtcConnections → React mock
// peer 컴포넌트. Real peer 없이도 multiplayer UI 작동 (피어 리스트, 비디오
// 그리드, 메시지 채널 시뮬). SOLVABLE_PARTIAL WebRTC → RESOLVED 이동.
//
// Mock 데이터:
//   - 가상 peer 3-5명 (랜덤 이름 + 색상)
//   - mock video stream (canvas로 그라데이션)
//   - mock data channel (Lorem ipsum 메시지 + emoji 반응)
//   - 연결 상태 시뮬 (connecting → connected → disconnected 사이클)

import fs from "node:fs";
import path from "node:path";

export function emitWebRtcMock(extracted, projDir) {
  const hasRtc = extracted.apiUsage?.webRTC ||
                 (extracted.runtime?.rtcConnections?.length || 0) > 0;
  if (!hasRtc) return { emitted: 0 };

  const compDir = path.join(projDir, "src", "components", "rtc");
  fs.mkdirSync(compDir, { recursive: true });

  const peerCount = Math.min(5, Math.max(2, extracted.runtime?.rtcConnections?.length || 3));

  // 1. MockPeerProvider.tsx — context with mock state
  fs.writeFileSync(path.join(compDir, "MockPeerProvider.tsx"), `"use client";
// v108-2 Mock WebRTC peer scaffold — UI works without real peer connection
// Source had ${peerCount} RTC peers detected. Emit provides equivalent UI.

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Peer = {
  id: string;
  name: string;
  color: string;
  status: "connecting" | "connected" | "disconnected";
  videoEnabled: boolean;
  audioEnabled: boolean;
};

type Message = {
  peerId: string;
  text: string;
  timestamp: number;
};

type RtcContext = {
  peers: Peer[];
  messages: Message[];
  sendMessage: (text: string) => void;
};

const Ctx = createContext<RtcContext | null>(null);

const PEER_NAMES = ["Alex", "Jamie", "Sam", "Jordan", "Riley"];
const PEER_COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#a855f7"];

export function MockPeerProvider({ children }: { children: ReactNode }) {
  const [peers, setPeers] = useState<Peer[]>(() =>
    Array.from({ length: ${peerCount} }, (_, i) => ({
      id: \`peer-\${i}\`,
      name: PEER_NAMES[i % PEER_NAMES.length],
      color: PEER_COLORS[i % PEER_COLORS.length],
      status: "connecting" as const,
      videoEnabled: true,
      audioEnabled: true,
    }))
  );
  const [messages, setMessages] = useState<Message[]>([]);

  // Simulate peer status changes
  useEffect(() => {
    const t = setTimeout(() => {
      setPeers(p => p.map(peer => ({ ...peer, status: "connected" as const })));
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  // Simulate periodic mock messages
  useEffect(() => {
    const i = setInterval(() => {
      setMessages(m => [...m, {
        peerId: peers[Math.floor(Math.random() * peers.length)]?.id || "peer-0",
        text: ["hi!", "👋", "interesting", "let me check"][Math.floor(Math.random() * 4)],
        timestamp: Date.now(),
      }].slice(-20));
    }, 8000);
    return () => clearInterval(i);
  }, [peers]);

  const sendMessage = (text: string) => {
    setMessages(m => [...m, { peerId: "self", text, timestamp: Date.now() }]);
  };

  return <Ctx.Provider value={{ peers, messages, sendMessage }}>{children}</Ctx.Provider>;
}

export function useMockRtc() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMockRtc must be inside MockPeerProvider");
  return ctx;
}
`);

  // 2. MockPeerGrid.tsx — video grid with mock streams
  fs.writeFileSync(path.join(compDir, "MockPeerGrid.tsx"), `"use client";
// v108-2 Mock peer video grid — Canvas gradient as fake stream

import { useEffect, useRef } from "react";
import { useMockRtc } from "./MockPeerProvider";

export default function MockPeerGrid() {
  const { peers } = useMockRtc();
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4">
      {peers.map(p => (
        <PeerTile key={p.id} peer={p} />
      ))}
    </div>
  );
}

function PeerTile({ peer }: { peer: any }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const ctx = ref.current.getContext("2d");
    if (!ctx) return;
    const grad = ctx.createLinearGradient(0, 0, 320, 240);
    grad.addColorStop(0, peer.color);
    grad.addColorStop(1, "#1e293b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 320, 240);
    ctx.fillStyle = "white";
    ctx.font = "32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(peer.name, 160, 130);
  }, [peer]);
  return (
    <div className="relative rounded-lg overflow-hidden bg-slate-800 aspect-video">
      <canvas ref={ref} width={320} height={240} className="w-full h-full" />
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-xs">
        <span className="bg-black/50 px-2 py-0.5 rounded">{peer.name}</span>
        <span className={\`px-2 py-0.5 rounded \${peer.status === "connected" ? "bg-green-500/80" : "bg-yellow-500/80"}\`}>
          {peer.status}
        </span>
      </div>
    </div>
  );
}
`);

  fs.writeFileSync(path.join(compDir, "index.ts"), `export { MockPeerProvider, useMockRtc } from "./MockPeerProvider";
export { default as MockPeerGrid } from "./MockPeerGrid";
`);

  return { emitted: 2, peerCount, dir: compDir };
}
