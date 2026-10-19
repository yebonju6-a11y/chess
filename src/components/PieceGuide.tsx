import React, { useState } from 'react';
import { ChessPiece } from './ChessPiece';
import type { PieceSymbol } from 'chess.js';
import { BookOpen, Shield, Zap, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

interface PieceInfo {
  type: PieceSymbol;
  nameKr: string;
  nameEn: string;
  points: string;
  role: string;
  moveDesc: string;
  captureDesc: string;
  tips: string[];
  gridPattern: number[][]; // 5x5 grid with center at [2][2] (1=move, 2=capture, 3=piece)
}

const PIECES_DATA: PieceInfo[] = [
  {
    type: 'p',
    nameKr: '폰',
    nameEn: 'Pawn',
    points: '1점',
    role: '전선의 보병이자 체스의 영혼',
    moveDesc: '앞으로 1칸 전진 (처음 움직일 때만 2칸 전진 가능). 뒤나 옆으로는 갈 수 없습니다.',
    captureDesc: '대각선 앞 1칸에 있는 적 기물만 잡을 수 있습니다.',
    tips: [
      '중앙 폰(e4, d4)을 밀어 보드 중심을 차지하는 것이 오프닝의 핵심입니다.',
      '상대 진영 끝(8열)에 도달하면 가장 강력한 퀸으로 승급(Promotion)할 수 있습니다.',
    ],
    gridPattern: [
      [0, 0, 0, 0, 0],
      [0, 2, 1, 2, 0],
      [0, 0, 3, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ],
  },
  {
    type: 'n',
    nameKr: '나이트',
    nameEn: 'Knight',
    points: '3점',
    role: '유일하게 기물을 뛰어넘는 기동대',
    moveDesc: '직선으로 2칸 + 직각으로 1칸의 \'L\'자 모양으로 이동합니다.',
    captureDesc: '이동하는 최종 도착 칸에 있는 적 기물을 잡습니다.',
    tips: [
      '나이트는 다른 기물을 뛰어넘을 수 있어 복잡한 진형에서도 활약합니다.',
      '보드 모서리보다는 중앙에 배치할 때 8개 칸을 공격하여 가장 강합니다.',
    ],
    gridPattern: [
      [0, 1, 0, 1, 0],
      [1, 0, 0, 0, 1],
      [0, 0, 3, 0, 0],
      [1, 0, 0, 0, 1],
      [0, 1, 0, 1, 0],
    ],
  },
  {
    type: 'b',
    nameKr: '비숍',
    nameEn: 'Bishop',
    points: '3점',
    role: '장거리 대각선 저격수',
    moveDesc: '자신이 서 있는 칸 색상과 동일한 대각선 방향으로 장애물이 없는 한 무제한 이동합니다.',
    captureDesc: '대각선 경로의 끝에 있는 적 기물을 잡고 그 자리에 멈춥니다.',
    tips: [
      '밝은색 칸 비숍과 어두운색 칸 비숍 각 1개씩 주어집니다.',
      '보드의 긴 대각선에 배치하면 멀리서 상대 진영을 날카롭게 압박할 수 있습니다.',
    ],
    gridPattern: [
      [1, 0, 0, 0, 1],
      [0, 1, 0, 1, 0],
      [0, 0, 3, 0, 0],
      [0, 1, 0, 1, 0],
      [1, 0, 0, 0, 1],
    ],
  },
  {
    type: 'r',
    nameKr: '룩',
    nameEn: 'Rook',
    points: '5점',
    role: '강력한 직선 중화기',
    moveDesc: '가로(행) 또는 세로(열) 방향으로 장애물이 없는 한 원하는 만큼 직선 이동합니다.',
    captureDesc: '직선 경로 끝의 적 기물을 잡고 그 자리에 멈춥니다.',
    tips: [
      '오프닝에서는 캐슬링을 통해 킹을 안전하게 보호하고 룩을 중앙 열로 배치하세요.',
      '기물이 많이 사라진 엔드게임에서 룩은 폰 승급을 돕거나 백랭크 메이트를 만듭니다.',
    ],
    gridPattern: [
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [1, 1, 3, 1, 1],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
    ],
  },
  {
    type: 'q',
    nameKr: '퀸',
    nameEn: 'Queen',
    points: '9점',
    role: '체스판에서 가장 강력한 최강 기물',
    moveDesc: '룩(가로/세로)과 비숍(대각선)의 능력을 모두 가집니다. 장애물 전까지 무제한 이동합니다.',
    captureDesc: '가로, 세로, 대각선 경로 끝의 적 기물을 잡습니다.',
    tips: [
      '가장 가치 있는 9점짜리 기물이므로 너무 일찍 나와 상대 마이너 기물의 표적이 되지 않게 주의하세요.',
      '다른 기물들의 지원을 받으며 공격을 주도할 때 파괴력이 극대화됩니다.',
    ],
    gridPattern: [
      [1, 0, 1, 0, 1],
      [0, 1, 1, 1, 0],
      [1, 1, 3, 1, 1],
      [0, 1, 1, 1, 0],
      [1, 0, 1, 0, 1],
    ],
  },
  {
    type: 'k',
    nameKr: '킹',
    nameEn: 'King',
    points: '가장 소중함',
    role: '체스의 심장이자 보호해야 할 군주',
    moveDesc: '모든 방향(가로, 세로, 대각선)으로 딱 1칸씩만 이동할 수 있습니다.',
    captureDesc: '주변 1칸 이내의 적 기물을 잡을 수 있습니다 (단, 잡았을 때 자신이 체크에 걸리지 않는 경우에만 가능).',
    tips: [
      '킹이 공격받는 상태를 "체크(Check)"라고 하며, 탈출할 수 없으면 "체크메이트"로 패배합니다.',
      '적의 공격선상으로 스스로 들어가는 수는 규칙상 둘 수 없습니다.',
    ],
    gridPattern: [
      [0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 1, 3, 1, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0],
    ],
  },
];

const SPECIAL_RULES = [
  {
    title: '캐슬링 (Castling)',
    tag: '킹 안전 기술',
    desc: '체스에서 유일하게 한 턴에 두 기물(킹과 룩)을 동시에 움직이는 특별한 수입니다. 킹은 룩 방향으로 2칸 이동하고, 룩은 킹을 훌쩍 넘어 바로 옆 칸으로 옵니다.',
    conditions: [
      '킹과 해당 룩이 게임 시작 후 한 번도 움직인 적이 없어야 합니다.',
      '킹과 룩 사이에 다른 기물이 하나도 없어야 합니다.',
      '킹이 현재 체크 상태이거나, 킹이 통과하는 칸 및 도착하는 칸이 적의 공격을 받지 않아야 합니다.',
    ],
  },
  {
    title: '폰 프로모션 (Promotion)',
    tag: '승급 규칙',
    desc: '가장 약한 폰이 천천히 전진하여 상대편 마지막 랭크(백은 8열, 흑은 1열)에 도달하면 즉시 퀸, 룩, 비숍, 나이트 중 하나로 변신할 수 있습니다.',
    conditions: [
      '대부분 가장 강력한 퀸(Queen)으로 승급합니다.',
      '원래 있던 퀸이 아직 살아있더라도 새로운 퀸을 추가로 가질 수 있습니다!',
    ],
  },
  {
    title: '앙파상 (En Passant)',
    tag: '특수 잡기',
    desc: '상대 폰이 시작 위치에서 2칸 전진하여 내 폰 바로 옆에 나란히 설 때, 내 폰이 상대 폰 뒤 대각선으로 지나가며 상대 폰을 잡는 프랑스어 표현(\'지나가면서\')입니다.',
    conditions: [
      '상대가 폰을 2칸 전진시킨 바로 그 다음 턴에만 즉시 발동할 수 있습니다. 턴을 넘기면 기회가 사라집니다.',
    ],
  },
  {
    title: '체크메이트 vs 스테일메이트',
    tag: '승패 판정',
    desc: '체크메이트(Checkmate)는 킹이 공격을 받고 있고(체크), 피하거나 막거나 잡을 수 없어 승패가 나는 상황입니다. 반면 스테일메이트(Stalemate)는 킹이 체크를 받지 않는데 둘 수 있는 합법적인 수가 전혀 없을 때 무승부(Draw)가 되는 중요한 규칙입니다.',
    conditions: [
      '유리한 상황에서 상대 킹의 퇴로를 너무 옥죄면 스테일메이트로 비길 수 있으니 주의하세요!',
    ],
  },
];

export const PieceGuide: React.FC = () => {
  const [selectedPiece, setSelectedPiece] = useState<PieceInfo>(PIECES_DATA[0]);
  const [activeTab, setActiveTab] = useState<'pieces' | 'rules'>('pieces');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top clean navigation switcher */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">체스 입문 가이드</h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span>6대 기물 움직임</span>
            <span aria-hidden="true">·</span>
            <span>특수 규칙</span>
            <span aria-hidden="true">·</span>
            <span>초보자 실전 팁</span>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setActiveTab('pieces')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'pieces' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            기물 도감
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'rules' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            체스 특수 규칙
          </button>
        </div>
      </div>

      {activeTab === 'pieces' ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Piece selection list */}
          <div className="md:col-span-4 space-y-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-2">기물 선택</span>
            {PIECES_DATA.map((piece) => {
              const isSelected = selectedPiece.type === piece.type;
              return (
                <button
                  key={piece.type}
                  onClick={() => setSelectedPiece(piece)}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 ${
                    isSelected
                      ? 'border-amber-600 bg-amber-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white'
                  }`}
                >
                  <div className="w-10 h-10 p-1 bg-slate-100 rounded-md shrink-0 flex items-center justify-center">
                    <ChessPiece type={piece.type} color="w" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 text-sm">
                        {piece.nameKr} <span className="text-xs font-normal text-slate-500">({piece.nameEn})</span>
                      </span>
                      <span className="text-xs text-amber-800 font-medium">{piece.points}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{piece.role}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Piece detail card */}
          <div className="md:col-span-8 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 p-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center">
                  <ChessPiece type={selectedPiece.type} color="w" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold text-slate-900">{selectedPiece.nameKr}</h3>
                    <span className="text-sm text-slate-500">{selectedPiece.nameEn}</span>
                  </div>
                  <p className="text-sm text-amber-900 font-medium mt-0.5">{selectedPiece.role}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block">기물 가치 점수</span>
                <span className="text-lg font-bold text-slate-900">{selectedPiece.points}</span>
              </div>
            </div>

            {/* Grid pattern diagram */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-1">이동 경로 다이어그램</span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  중앙에 위치했을 때 이동 및 공격할 수 있는 칸입니다.
                </p>
                <div className="flex items-center gap-3 mt-3 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>이동 가능 칸</span>
                  </div>
                  {selectedPiece.type === 'p' && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-rose-500" />
                      <span>공격 가능 칸</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 5x5 Mini board grid */}
              <div className="flex justify-center">
                <div className="grid grid-cols-5 gap-0.5 p-1 bg-amber-950/20 rounded-md border border-amber-900/30">
                  {selectedPiece.gridPattern.map((row, rIdx) =>
                    row.map((cell, cIdx) => {
                      const isDark = (rIdx + cIdx) % 2 === 1;
                      const isCenter = cell === 3;
                      const isMove = cell === 1;
                      const isCapture = cell === 2;

                      return (
                        <div
                          key={`${rIdx}-${cIdx}`}
                          className={`w-9 h-9 flex items-center justify-center relative ${
                            isDark ? 'bg-amber-800/60' : 'bg-amber-100'
                          }`}
                        >
                          {isCenter && (
                            <div className="w-7 h-7">
                              <ChessPiece type={selectedPiece.type} color="w" />
                            </div>
                          )}
                          {isMove && (
                            <div className="w-3 h-3 rounded-full bg-emerald-500/80 shadow-xs ring-2 ring-emerald-300" />
                          )}
                          {isCapture && (
                            <div className="w-3.5 h-3.5 rounded-full bg-rose-500/80 shadow-xs ring-2 ring-rose-300" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Description details */}
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-600" /> 이동 및 공격 방법
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed">{selectedPiece.moveDesc}</p>
                {selectedPiece.captureDesc && (
                  <p className="text-sm text-slate-700 leading-relaxed mt-1">{selectedPiece.captureDesc}</p>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> 초보자를 위한 핵심 실전 팁
                </h4>
                <ul className="space-y-1.5">
                  {selectedPiece.tips.map((tip, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Special Rules tab */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SPECIAL_RULES.map((rule, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base">{rule.title}</h3>
                <span className="text-xs text-amber-700 font-medium">{rule.tag}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{rule.desc}</p>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-slate-500" /> 적용 조건 및 주의점
                </span>
                <ul className="space-y-1">
                  {rule.conditions.map((cond, cIdx) => (
                    <li key={cIdx} className="text-xs text-slate-500 flex items-start gap-1.5">
                      <span className="text-amber-600 font-bold">·</span>
                      <span>{cond}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
